// src/components/DashboardLayout.jsx
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import routes from ".././route/SidebarRaoute";
import Sidebar from "../pages/Sidebar";
import Header from "./Header";
import { connectSocket, disconnectSocket, forceOnline, forceOffline, emitLocation } from "../socket/socket";
import { driverService } from "../api/driverApi";
import { toast } from "sonner";
import RideRequestModal from "./RideRequestModal";
import { requestForToken, onMessageListener } from "../firebase";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDriverOnline, setIsDriverOnline] = useState(false); // Online/Offline state
  const [rideRequest, setRideRequest] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const { admin, logout } = useAuth();
  const { themeColors, toggleTheme, palette, changePalette } = useTheme();
  const { currentFont, corporateFonts, changeFont } = useFont();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnlineRef = useRef(false);
  const lastAddressUpdateRef = useRef(0);
  const hasInitialized = useRef(false); // Sirf ek baar initialize hoga
  const ADDRESS_UPDATE_INTERVAL = 5 * 60 * 1000;

  const currentPageTitle = useMemo(() => {
    const allRoutes = routes.flatMap(r => r.children || r);
    return allRoutes.find((route) => route.path === location.pathname)?.name || "Dashboard";
  }, [location.pathname]);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);



  // Google Maps Geocoding
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await res.json();
      return data?.results?.[0]?.formatted_address || `${lat},${lng}`;
    } catch { return `${lat},${lng}`; }
  };

  // IP fallback (Desktop ke liye)
  const getLocationFromIP = async () => {
    try {
      const res = await fetch('https://ip-api.com/json/?fields=lat,lon,city,regionName');
      const data = await res.json();
      if (data.lat && data.lon) return { latitude: data.lat, longitude: data.lon, address: `${data.city}, ${data.regionName}` };
    } catch (e) { }
    return null;
  };

  // Online karo with GPS/IP location - STRICT GPS REQUIREMENT
  const goOnlineWithLocation = useCallback(async () => {
    // 1. Check Notification Permission first
    if (Notification.permission === 'denied') {
      toast.error('🔔 Notification access is BLOCKED. Please enable it to see ride requests!');
    }

    const driverId = admin?._id || admin?.id;

    try {
      // 2. Geolocation support check
      if (!navigator.geolocation) {
        toast.error('❌ Your device does not support GPS.');
        return;
      }

      // 3. Pehle location lene ki koshish karo, ONLINE karne se pehle
      toast.loading('📍 Verifying location...', { id: 'loc-check' });
      
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 // Increased timeout and allowed cache
        })
      ).catch((err) => {
        throw err; // Fail explicitly
      });

      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;

      if (latitude && longitude) {
        // Success: Ab online karo
        isOnlineRef.current = true;
        setIsDriverOnline(true);
        forceOnline(driverId);

        const address = await getAddressFromCoords(latitude, longitude);
        await driverService.updateLocation(latitude, longitude, address);
        lastAddressUpdateRef.current = Date.now();
        
        toast.dismiss('loc-check');
        toast.success(`🟢 Online! 📍 ${address.split(',')[0]}`);
      }
    } catch (err) {
      toast.dismiss('loc-check');
      isOnlineRef.current = false;
      setIsDriverOnline(false); // UI revert karo
      forceOffline(driverId); // Safety ke liye offline rakho

      if (err.code === 1) { // PERMISSION_DENIED
        toast.error('🚫 GPS Denied! You MUST allow location access to go online.', {
          duration: 6000,
          style: { border: '2px solid #EF4444' }
        });
      } else {
        toast.error('📡 Could not get your location. Please check your GPS signal!');
      }
    }
  }, [admin?._id]);

  // Toggle Online/Offline
  const handleToggleOnline = useCallback(async () => {
    const driverId = admin?._id || admin?.id;

    if (isOnlineRef.current) {
      // Offline karo
      isOnlineRef.current = false;
      setIsDriverOnline(false);
      forceOffline(driverId);
      toast.info('🔴 You are now Offline');
    } else {
      // Online karo
      goOnlineWithLocation();
    }
  }, [admin?._id, goOnlineWithLocation]);

  // GPS tracking — Socket se location bhejo, HTTP nahi!
  useEffect(() => {
    const driverId = admin?._id || admin?.id;
    if (!navigator.geolocation) return;

    let lastLat = null;
    let lastLng = null;
    const MIN_DISTANCE_METERS = 1; // Only update if driver moves at least 1 meter
    const LOCATION_INTERVAL = 1000; // Update every 1 second (1000ms)
    let lastUpdateTime = 0;

    // GPS loaction ko Wathch  kar rha ahi 


    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading } = position.coords;
        const now = Date.now();

        // Har 1 Second se pehle update mat karo
        if (now - lastUpdateTime < LOCATION_INTERVAL) return;

        // 1 Meter se kam move kiya toh update mat karo (Extreme Live)
        if (lastLat && lastLng) {
          const dist = Math.sqrt(
            Math.pow((latitude - lastLat) * 111000, 2) +
            Math.pow((longitude - lastLng) * 111000, 2)
          );
          if (dist < MIN_DISTANCE_METERS) return;
        }

        if (!isOnlineRef.current) return;

        lastLat = latitude;
        lastLng = longitude;
        lastUpdateTime = now;

        // Socket se bhej Diya (Instant without HTTP) - WITH HEADING
        emitLocation(driverId, latitude, longitude, '', heading); // Async call, no await needed

        // Har 5 min mein address bhi update karo (HTTP se for persistence)
        if (now - lastAddressUpdateRef.current >= ADDRESS_UPDATE_INTERVAL) {
          try {
            const address = await getAddressFromCoords(latitude, longitude);
            await driverService.updateLocation(latitude, longitude, address);
            lastAddressUpdateRef.current = now;
          } catch (e) { }
        }
      },
      (err) => console.error('GPS:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [admin?._id]);

  // Socket + Online/Offline + Sync Status — SIRF EK BAAR chalega
  useEffect(() => {
    const driverId = admin?._id || admin?.id;
    if (!driverId) return;

    // 🔄 SYNC STATUS ON REFRESH: Fetch actual status from DB
    const syncStatus = async () => {
      try {
        const res = await driverService.getProfile();
        if (res?.driver?.isOnline) {
          console.log('🔄 Sync: Driver is already ONLINE in DB');
          setIsDriverOnline(true);
          isOnlineRef.current = true;
          // Re-connect location etc if needed
        }
      } catch (err) {
        console.error('Failed to sync status:', err);
      }
    };
    syncStatus();

    console.log('🔌 Connecting/Getting socket for driverId:', driverId);
    const socket = connectSocket(driverId);

    const onNewRequest = (data) => {
      console.log('🚗 [GLOBAL] new_ride_request received:', data);
      setRideRequest(data);
      setShowRideModal(true);
      toast.success(`🚗 New Ride Request!`, { duration: 5000 });
    };

    const onRideTimeout = (data) => {
      console.log('⏰ [GLOBAL] ride_request_timeout received:', data);
      setShowRideModal(false);
      setRideRequest(null);
    };

    socket.on('new_ride_request', onNewRequest);
    socket.on('ride_request_timeout', onRideTimeout);

    return () => {
      // ✅ Specific removal, NOT global socket.off()
      socket.off('new_ride_request', onNewRequest);
      socket.off('ride_request_timeout', onRideTimeout);
      console.log('🔌 Cleaned up Layout listeners specifically');
    };
  }, [admin?._id]);

  // --- FCM TOKEN REGISTRATION ---
  useEffect(() => {
    const driverId = admin?._id || admin?.id;
    if (!driverId) return;

    const setupFCM = async () => {
      try {
        const token = await requestForToken();
        if (token) {
          await driverService.updateFcmToken(token);
          console.log("🚀 FCM Token synchronized with backend");
        }
      } catch (error) {
        console.error("FCM Registration failed:", error);
      }
    };

    setupFCM();

    // Foreground notification listener
    const unsubscribe = onMessageListener((payload) => {
        console.log("🔔 Push Notification received in foreground:", payload);
        // If it's a new ride request, we can handle it or let socket do it
        // toast.info(payload.notification?.title || "New Message Received");
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [admin?._id]);

  const handleLogout = useCallback(async () => {
    const driverId = admin?._id || admin?.id;
    isOnlineRef.current = false;
    forceOffline(driverId); // Logout pe seedha offline
    disconnectSocket(driverId, true); // isLogout = true → driver_offline emit hoga
    hasInitialized.current = false;
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate, admin]);



  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        backgroundColor: themeColors.background,
        fontFamily: currentFont.family || 'var(--app-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        routes={routes}
        currentPath={location.pathname}
        user={admin}
        logout={handleLogout}
        themeColors={themeColors}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          toggleSidebar={toggleSidebar}
          currentPageTitle={currentPageTitle}
          themeColors={themeColors}
          currentFont={currentFont}
          corporateFonts={corporateFonts}
          changeFont={changeFont}
          palette={palette}
          changePalette={changePalette}
          toggleTheme={toggleTheme}
          isOnline={isDriverOnline}
          onToggleOnline={handleToggleOnline}
        />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6" style={{ backgroundColor: themeColors.background }}>
          <Outlet context={{ isOnline: isDriverOnline, toggleOnline: handleToggleOnline }} />
        </main>

        {/* Ride Request Modal */}
        <RideRequestModal
          isOpen={showRideModal}
          onClose={() => {
            setShowRideModal(false);
            setRideRequest(null);
          }}
          rideData={rideRequest}
          onAccept={async () => {
            const requestId = rideRequest?.requestId || rideRequest?._id;
            try {
              const res = await driverService.respondToRequest(requestId, 'accept');
              if (res.success) {
                toast.success('🚗 Ride accepted! Navigate to pickup location.');
                setShowRideModal(false);
                const shortId = res.booking?._id?.slice(-8);
                if (shortId) navigate(`/driver/trip/${shortId}`);
                else navigate('/driver/trips');
              }
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Failed to accept ride');
            }
          }}
          onReject={async () => {
            const requestId = rideRequest?.requestId || rideRequest?._id;
            try {
              await driverService.respondToRequest(requestId, 'reject');
              toast.info('❌ Ride Rejected');
              setShowRideModal(false);
            } catch (err) {
              toast.error('Failed to reject ride');
            }
          }}
          themeColors={themeColors}
        />


      </div>
    </div>
  );
};

export default DashboardLayout;
