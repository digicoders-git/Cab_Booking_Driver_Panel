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
import NoCarAssignedModal from "./NoCarAssignedModal";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDriverOnline, setIsDriverOnline] = useState(false); // Online/Offline state
  const [rideRequest, setRideRequest] = useState(null);
  const [showRideModal, setShowRideModal] = useState(false);
  const [showNoCarModal, setShowNoCarModal] = useState(false); // ✅ NEW
  const [driverProfile, setDriverProfile] = useState(null); // ✅ NEW
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

  // ✅ NEW: Fetch driver profile to check car assignment
  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        const res = await driverService.getProfile();
        setDriverProfile(res?.driver || res);
        
        // Check if car is assigned - Sirf GADI ke fields check karo (Driver ID nahi!)
        const driver = res?.driver || res;
        const car = driver?.carDetails || driver?.vehicleDetails || null;
        
        const hasCarAssigned = 
          driver?.carId || 
          driver?.assignedCar || 
          driver?.carNumber || 
          driver?.carModel ||
          car?.carNumber ||
          car?.carModel ||
          car?._id || // Car ki apni ID (Nested)
          car?.vehicleNumber ||
          car?.model ||
          car?.vehicleModel;
        
        console.log('🚗 DashboardLayout - Final Car Check:', { hasCarAssigned, driver });

        if (hasCarAssigned) {
          setShowNoCarModal(false);
        } else {
          setShowNoCarModal(true);
        }
      } catch (err) {
        console.error('Failed to fetch driver profile:', err);
      }
    };

    if (admin?._id) {
      fetchDriverProfile();
    }
  }, [admin?._id]);

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

  // Online karo with GPS/IP location
  const goOnlineWithLocation = useCallback(async () => {
    if (isOnlineRef.current) return; // Already online hai — dobara mat karo
    isOnlineRef.current = true; // Pehle set karo — race condition rokne ke liye
    setIsDriverOnline(true); // UI update

    const driverId = admin?._id || admin?.id;

    // Socket se online karo (database update backend karega)
    forceOnline(driverId);

    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation?.getCurrentPosition(res, rej, {
          enableHighAccuracy: true, timeout: 8000, maximumAge: 0
        })
      ).catch(async () => {
        const ipLoc = await getLocationFromIP();
        return ipLoc ? { coords: { latitude: ipLoc.latitude, longitude: ipLoc.longitude }, ipAddress: ipLoc.address } : null;
      });

      const latitude = pos?.coords?.latitude || null;
      const longitude = pos?.coords?.longitude || null;

      if (latitude && longitude) {
        const address = pos?.ipAddress || await getAddressFromCoords(latitude, longitude);
        await driverService.updateLocation(latitude, longitude, address);
        lastAddressUpdateRef.current = Date.now();
        toast.success(`🟢 Online! 📍 ${address.split(',')[0]}`);
      } else {
        toast.success('🟢 You are now Online!');
      }
    } catch (e) {
      toast.success('🟢 You are now Online!');
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
    const MIN_DISTANCE_METERS = 2; // Only update if driver moves at least 2 meters
    const LOCATION_INTERVAL = 3000; // Update every 3 seconds (3000ms)
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

  // Socket + Online/Offline — SIRF EK BAAR chalega
  useEffect(() => {
    const driverId = admin?._id || admin?.id;
    if (!driverId) return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('🔌 Connecting socket for driverId:', driverId);
    const socket = connectSocket(driverId);
    console.log('🔌 Socket state after connect:', socket.connected ? 'CONNECTED' : 'CONNECTING...');

    const handleOnline = () => {
      console.log('🔌 Socket connected, waiting for manual toggle...');
      // forceOnline(driverId);        // ✅ Backend sambhal lega - Manual toggle ke liye wait karo
      // goOnlineWithLocation();       // ✅ Driver khud button dabake online hoga
    };

    if (socket.connected) {
      console.log('🔌 Socket already connected, NOT calling auto-online');
      handleOnline();
    } else {
      console.log('🔌 Socket not connected yet, waiting for connect event...');
      socket.once('connect', handleOnline);
    }

    socket.on('new_ride_request', (data) => {
      console.log('🚗 new_ride_request received:', data);
      
      // ✅ NEW: Check if driver has car assigned
      const hasCar = driverProfile?.carId || driverProfile?.carDetails?._id || driverProfile?.carNumber || driverProfile?.assignedCar;
      if (!hasCar) {
        setShowNoCarModal(true);
        toast.error('🚗 Aapke paas gadi assign nahi hai');
        return;
      }
      
      // Show modal instead of just toast
      setRideRequest(data);
      setShowRideModal(true);
      
      // Also show toast as backup
      toast.success(
        `🚗 New Ride Request! Tap to view details`,
        { 
          duration: 5000,
          action: {
            label: 'View',
            onClick: () => {
              setShowRideModal(true);
            }
          }
        }
      );
    });

    socket.on('admin_message', (data) => {
      toast.info(`📢 Admin: ${data.message}`);
    });

    // Debug: Saare events log karo
    socket.onAny((eventName, ...args) => {
      console.log('📡 ANY Socket event:', eventName, args);
    });

    const handleBeforeUnload = () => {
      if (!isOnlineRef.current) return;
      isOnlineRef.current = false;
      forceOffline(driverId);
      disconnectSocket(driverId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [admin?._id, driverProfile?.assignedCar]);

  const handleLogout = useCallback(async () => {
    const driverId = admin?._id || admin?.id;
    
    isOnlineRef.current = false;     // ✅ Internal ref update
    
    // ✅ Backend sambhal lega auto-offline, bas socket disconnect karo
    disconnectSocket(driverId);
    
    hasInitialized.current = false;
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate, admin]);

  // ✅ NEW: Handle contact admin
  const handleContactAdmin = () => {
    toast.info('📞 Admin contact details: +91-XXXXXXXXXX');
    setShowNoCarModal(false);
  };

  // ✅ NEW: Handle help
  const handleHelp = () => {
    navigate('/driver/support');
    setShowNoCarModal(false);
  };

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
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: themeColors.background }}>
          <Outlet />
        </main>
        
        {/* Ride Request Modal */}
        <RideRequestModal
          isOpen={showRideModal}
          onClose={() => {
            setShowRideModal(false);
            setRideRequest(null);
          }}
          rideData={rideRequest}
          onAccept={(data) => {
            console.log('Ride accepted:', data);
            toast.success('🚗 Ride accepted! Navigate to pickup location.');
            navigate('/driver/trips');
          }}
          onReject={(data) => {
            console.log('Ride rejected:', data);
          }}
          themeColors={themeColors}
        />

        {/* ✅ NEW: No Car Assigned Modal */}
        <NoCarAssignedModal
          isOpen={showNoCarModal}
          themeColors={themeColors}
          onContactAdmin={handleContactAdmin}
          onHelp={handleHelp}
        />
      </div>
    </div>
  );
};

export default DashboardLayout;
