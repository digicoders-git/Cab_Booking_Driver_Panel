// src/components/OptimizedTripMap.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { loadGoogleMaps, optimizedMapStyles, throttle, calculateDistance, calculateBearing, createCarMarker, createLocationMarker } from '../utils/mapUtils';
import { toast } from 'sonner';

// 🚗 ADJUST CAR DIRECTION HERE
const HEADING_OFFSET = 0; // If car is 90 deg off, use 90 or -90. If 180, use 180.

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
  const stopMarkersRef = useRef([]);
  const routeRendererRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRouteUpdateRef = useRef(0);
  const lastPosRef = useRef(null);
  const lastHeadingRef = useRef(0); // Store last known heading/bearing
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

  // Get car image URL
  const carImageUrl = useMemo(() => {
    if (trip?.carCategory?.image) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      return `${baseUrl}/uploads/${trip.carCategory.image}`;
    }
    return null;
  }, [trip?.carCategory?.image]);

  const isOngoing = useMemo(() => 
    trip?.bookingStatus === 'Ongoing' || trip?.tripData?.startedAt,
    [trip?.bookingStatus, trip?.tripData?.startedAt]
  );
  
  const destination = useMemo(() => (isOngoing ? drop : pickup), [isOngoing, drop, pickup]);

  // Initialize markers
  const initMapMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    
    if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
    if (dropMarkerRef.current) dropMarkerRef.current.setMap(null);
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    pickupMarkerRef.current = new window.google.maps.Marker({ 
      position: pickup, 
      map: mapInstanceRef.current, 
      icon: createLocationMarker('pickup') 
    });
    dropMarkerRef.current = new window.google.maps.Marker({ 
      position: drop, 
      map: mapInstanceRef.current, 
      icon: createLocationMarker('drop') 
    });

    if (trip?.stops) {
      trip.stops.forEach((stop, idx) => {
        const marker = new window.google.maps.Marker({
          position: { 
            lat: Number(stop.latitude || stop.lat), 
            lng: Number(stop.longitude || stop.lng) 
          },
          map: mapInstanceRef.current,
          icon: createLocationMarker('stop'),
          label: {
            text: (idx + 1).toString(),
            color: 'white',
            fontSize: '10px'
          }
        });
        stopMarkersRef.current.push(marker);
      });
    }
  }, [pickup, drop, trip?.stops]);

  // Stable Throttled route update
  const updateRoute = useCallback(
    throttle(async (driverPos) => {
      if (!mapInstanceRef.current || !window.google?.maps) return;
      const now = Date.now();
      if (now - lastRouteUpdateRef.current < 8000) return;
      lastRouteUpdateRef.current = now;

      try {
        if (routeRendererRef.current) routeRendererRef.current.setMap(null);
        routeRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          suppressMarkers: true,
          preserveViewport: true, // <--- Zoom fix
          polylineOptions: { strokeColor: '#2563EB', strokeOpacity: 0.8, strokeWeight: 6 }
        });

        const directionsService = new window.google.maps.DirectionsService();
        const waypoints = [];
        if (isOngoing && trip?.stops) {
          trip.stops.forEach(stop => {
            if (stop.status !== 'Completed') {
              waypoints.push({
                location: { lat: Number(stop.latitude || stop.lat), lng: Number(stop.longitude || stop.lng) },
                stopover: true
              });
            }
          });
        }

        const result = await new Promise((res, rej) => {
          directionsService.route({
            origin: driverPos,
            destination,
            waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (r, s) => s === 'OK' ? res(r) : rej(s));
        });

        routeRendererRef.current.setDirections(result);
        const totalDist = result.routes[0].legs.reduce((acc, leg) => acc + leg.distance.value, 0);
        const totalDur = result.routes[0].legs.reduce((acc, leg) => acc + leg.duration.value, 0);
        
        setDistance(`${(totalDist / 1000).toFixed(1)} km`);
        setDuration(`${Math.round(totalDur / 60)} min`);
        
        onLocationUpdateRef.current?.({
          latitude: driverPos.lat,
          longitude: driverPos.lng,
          distance: `${(totalDist / 1000).toFixed(1)} km`,
          duration: `${Math.round(totalDur / 60)} min`,
          destination: isOngoing ? 'drop' : 'pickup'
        });
      } catch (e) {
        console.warn('Map Error:', e);
      }
    }, 4000),
    [destination, isOngoing, trip?.stops]
  );

  const updateDriverMarker = useCallback(
    throttle((location, gpsHeading) => {
      if (!mapInstanceRef.current || !window.google?.maps) return;

      let finalHeading = lastHeadingRef.current;

      // 1. Calculate Bearing if moved significantly
      if (lastPosRef.current) {
        const dist = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lng, location.lat, location.lng);
        // Only update bearing if driver moved at least 5 meters to avoid "jitter"
        if (dist > 0.005) { 
          finalHeading = calculateBearing(lastPosRef.current.lat, lastPosRef.current.lng, location.lat, location.lng);
        } else if (gpsHeading !== null && gpsHeading !== undefined && gpsHeading !== 0) {
          // If not moving fast enough, use GPS heading if valid
          finalHeading = gpsHeading;
        }
      } else if (gpsHeading !== null && gpsHeading !== undefined) {
        finalHeading = gpsHeading;
      }

      // Apply Offset (Correction)
      const rotatedHeading = (finalHeading + HEADING_OFFSET) % 360;
      lastHeadingRef.current = finalHeading; // Store raw heading for next calculation

      // Update state for debug box
      setDriverLocation({ ...location, heading: rotatedHeading });
      
      // Update Marker Position
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setPosition(location);
      } else {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: location,
          map: mapInstanceRef.current,
          zIndex: 1000
        });
      }

      // --- CAR ROTATION LOGIC (Canvas) ---
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = carImageUrl || 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.translate(size/2, size/2);
        ctx.rotate(rotatedHeading * Math.PI / 180);
        ctx.drawImage(img, -size/2, -size/2, size, size);
        
        driverMarkerRef.current.setIcon({
          url: canvas.toDataURL(),
          scaledSize: new window.google.maps.Size(44, 44),
          anchor: new window.google.maps.Point(22, 22)
        });
      };
      
      const lastPos = lastPosRef.current;
      if (!lastPos || calculateDistance(lastPos.lat, lastPos.lng, location.lat, location.lng) > 0.02) {
        updateRoute(location);
        lastPosRef.current = location;
      }
    }, 500),
    [updateRoute, carImageUrl]
  );

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    try {
      await loadGoogleMaps();
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 16,
        center: pickup,
        styles: optimizedMapStyles,
        disableDefaultUI: true
      });
      mapInstanceRef.current = map;
      initMapMarkers();
      setMapLoaded(true);
    } catch (e) {
      setMapLoaded(true);
    }
  }, [pickup, initMapMarkers]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (mapLoaded) initMapMarkers();
  }, [mapLoaded, initMapMarkers, trip?.stops]);

  useEffect(() => {
    if (!mapLoaded) return;
    
    const options = { enableHighAccuracy: true, maximumAge: 1000 };
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const head = pos.coords.heading; // Keep as raw for the marker update logic
        updateDriverMarker(loc, head);
      },
      (err) => {
        const now = Date.now();
        if (now - lastErrorToastRef.current > 30000) {
          console.error("GPS Error:", err);
          lastErrorToastRef.current = now;
        }
      },
      options
    );
    return () => navigator.geolocation.clearWatch(watchIdRef.current);
  }, [mapLoaded, updateDriverMarker]);

  // 🔥 IMMEDIATE RE-RENDER ON STATUS/STOPS CHANGE
  useEffect(() => {
    if (mapLoaded && driverLocation) {
      console.log("📍 Status/Stops changed, forcing map refresh...");
      initMapMarkers();
      lastRouteUpdateRef.current = 0; // Bypass throttle
      updateRoute(driverLocation);
    }
  }, [trip?.bookingStatus, trip?.stops, mapLoaded]);

  return (
    <div className="relative">
      <div ref={mapRef} className={className} />
      


      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
};

export default OptimizedTripMap;
