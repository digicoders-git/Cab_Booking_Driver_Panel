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

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDriverOnline, setIsDriverOnline] = useState(false); // Online/Offline state
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
    const MIN_DISTANCE_METERS = 0; // Extreme Live (no threshold)
    const LOCATION_INTERVAL = 0;   // Extreme Real-time (no throttle)
    let lastUpdateTime = 0;

    // GPS loaction ko Wathch  kar rha ahi 


    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
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

        // Socket se bhej Diya (Instant without HTTP)
        emitLocation(driverId, latitude, longitude);

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
      toast.success(
        `🚗 New Ride! Pickup: ${data.pickup || ''} | Fare: ₹${data.fare || ''}`,
        { duration: 10000 }
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
  }, [admin?._id]);

  const handleLogout = useCallback(async () => {
    const driverId = admin?._id || admin?.id;
    
    isOnlineRef.current = false;     // ✅ Internal ref update
    
    // ✅ Backend sambhal lega auto-offline, bas socket disconnect karo
    disconnectSocket(driverId);
    
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
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: themeColors.background }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;