// src/components/OptimizedTripMap.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { loadGoogleMaps, optimizedMapStyles, throttle, calculateDistance, createCarMarker, createLocationMarker } from '../utils/mapUtils';
import { toast } from 'sonner';

const OptimizedTripMap = ({ 
  trip, 
  onLocationUpdate,
  className = "h-80 w-full rounded-2xl"
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);
  const routeRendererRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRouteUpdateRef = useRef(0);
  const lastPosRef = useRef(null);
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const lastErrorToastRef = useRef(0);

  // Sync latest callback to ref to keep functions stable
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  // Trip locations memoized
  const pickup = useMemo(() => ({
    lat: Number(trip?.pickup?.latitude || trip?.pickup?.lat || 26.8467),
    lng: Number(trip?.pickup?.longitude || trip?.pickup?.lng || 80.9462)
  }), [trip?.pickup?.latitude, trip?.pickup?.longitude, trip?.pickup?.lat, trip?.pickup?.lng]);
  
  const drop = useMemo(() => ({
    lat: Number(trip?.drop?.latitude || trip?.drop?.lat || 26.7606),
    lng: Number(trip?.drop?.longitude || trip?.drop?.lng || 80.8893)
  }), [trip?.drop?.latitude, trip?.drop?.longitude, trip?.drop?.lat, trip?.drop?.lng]);

  const isOngoing = useMemo(() => 
    trip?.bookingStatus === 'Ongoing' || trip?.tripData?.startedAt,
    [trip?.bookingStatus, trip?.tripData?.startedAt]
  );
  
  const destination = useMemo(() => (isOngoing ? drop : pickup), [isOngoing, drop, pickup]);

  // Stable Throttled route update
  const updateRoute = useCallback(
    throttle(async (driverPos) => {
      if (!mapInstanceRef.current || !window.google) return;
      const now = Date.now();
      if (now - lastRouteUpdateRef.current < 15000) return; // 15s throttle for directions
      lastRouteUpdateRef.current = now;

      if (routeRendererRef.current) routeRendererRef.current.setMap(null);
      routeRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#2563EB', strokeOpacity: 0.8, strokeWeight: 6 }
      });

      const directionsService = new window.google.maps.DirectionsService();
      try {
        const result = await new Promise((res, rej) => {
          directionsService.route({
            origin: driverPos,
            destination,
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (r, s) => s === 'OK' ? res(r) : rej(s));
        });

        routeRendererRef.current.setDirections(result);
        const leg = result.routes[0].legs[0];
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);
        
        onLocationUpdateRef.current?.({
          latitude: driverPos.lat,
          longitude: driverPos.lng,
          distance: leg.distance.text,
          duration: leg.duration.text,
          destination: isOngoing ? 'drop' : 'pickup'
        });
      } catch (e) {
        const dist = calculateDistance(driverPos.lat, driverPos.lng, destination.lat, destination.lng);
        setDistance(`${dist.toFixed(1)} km`);
        setDuration('~' + Math.round(dist * 3) + ' min');
      }
    }, 15000),
    [destination, isOngoing]
  );

  // Stable Throttled driver marker update
  const updateDriverMarker = useCallback(
    throttle((location) => {
      if (!mapInstanceRef.current) return;
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setPosition(location);
      } else {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: location,
          map: mapInstanceRef.current,
          icon: createCarMarker('#2563EB'),
          zIndex: 1000
        });
      }
      mapInstanceRef.current.panTo(location);
      
      const lastPos = lastPosRef.current;
      if (!lastPos || calculateDistance(lastPos.lat, lastPos.lng, location.lat, location.lng) > 0.05) {
        updateRoute(location);
        lastPosRef.current = location;
      }
    }, 4000),
    [updateRoute]
  );

  // Initialize map
  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    try {
      await loadGoogleMaps();
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: pickup,
        styles: optimizedMapStyles,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy'
      });
      mapInstanceRef.current = map;
      pickupMarkerRef.current = new window.google.maps.Marker({ position: pickup, map, icon: createLocationMarker('pickup') });
      dropMarkerRef.current = new window.google.maps.Marker({ position: drop, map, icon: createLocationMarker('drop') });
      setMapLoaded(true);
    } catch (e) {
      console.error('Map init error:', e);
    }
  }, [pickup, drop]);

  // GPS tracking effect - Stable dependency
  useEffect(() => {
    if (!mapLoaded) return;
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          setDriverLocation(location);
          updateDriverMarker(location);
        },
        (error) => {
          const now = Date.now();
          if (now - lastErrorToastRef.current > 30000) { // Only show every 30s
            toast.error('GPS Signal weak. Please check location permissions.');
            lastErrorToastRef.current = now;
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
      );
    }
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [mapLoaded, updateDriverMarker]);

  // Status badalte hi naya rasta dikhao (Accepted -> Ongoing) binna refresh ke
  useEffect(() => {
    if (mapLoaded && driverLocation) {
      console.log('🔄 Trip Status changed! Switching route to:', isOngoing ? 'Drop' : 'Pickup');
      lastRouteUpdateRef.current = 0; // Throttle bypass karo takki turant update ho
      updateRoute(driverLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, isOngoing, mapLoaded, updateRoute]);

  // Component Lifecycle
  useEffect(() => {
    initMap();
    return () => {
      if (routeRendererRef.current) routeRendererRef.current.setMap(null);
      if (driverMarkerRef.current) driverMarkerRef.current.setMap(null);
      if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
      if (dropMarkerRef.current) dropMarkerRef.current.setMap(null);
      mapInstanceRef.current = null;
    };
  }, [initMap]);

  return (
    <div className="relative">
      <div ref={mapRef} className={className} />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading optimized map...</p>
          </div>
        </div>
      )}

      {/* Live tracking indicator */}
      {driverLocation && (
        <div className="absolute top-3 left-3 bg-white rounded-lg px-3 py-2 shadow-lg border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-gray-700">Live Tracking</span>
          </div>
        </div>
      )}


    </div>
  );
};

export default OptimizedTripMap;