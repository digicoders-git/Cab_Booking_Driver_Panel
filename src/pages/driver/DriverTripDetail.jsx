import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  FaUser, FaPhone, FaMapMarkerAlt, FaRoute, FaClock,
  FaCheckCircle, FaRupeeSign, FaArrowLeft, FaSync,
  FaPlay, FaStop, FaKey, FaCar
} from 'react-icons/fa';
import { Navigation, MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Load Google Maps Script
const loadGoogleMaps = () => {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};

export default function DriverTripDetail() {
  const { id: shortId } = useParams(); // Short ID from URL
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [actionLoading, setActionLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [bookingId, setBookingId] = useState(null); // Full booking ID

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const watchIdRef = useRef(null);

  // Fetch trip detail
  const fetchTrip = useCallback(async () => {
    try {
      const res = await driverService.getMyTrips();
      const trips = res?.trips || res || [];
      // Short ID se match karo (last 8 characters)
      const found = trips.find(t => t._id.endsWith(shortId));
      if (found) {
        setTrip(found);
        setBookingId(found._id); // Full ID save karo
      } else {
        toast.error('Trip not found');
      }
    } catch (err) {
      toast.error('Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [shortId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // Load Google Maps + Draw Route
  useEffect(() => {
    if (!trip) return;

    loadGoogleMaps().then(() => {
      setMapLoaded(true);
      initMap();
    });

    // GPS tracking shuru
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDriverLocation(loc);
          updateDriverMarker(loc);
        },
        (err) => console.error('GPS Error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [trip]);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    const pickup = {
      lat: trip?.pickup?.latitude || trip?.pickup?.lat || 26.8467,
      lng: trip?.pickup?.longitude || trip?.pickup?.lng || 80.9462
    };
    const drop = {
      lat: trip?.drop?.latitude || trip?.drop?.lat || 26.7606,
      lng: trip?.drop?.longitude || trip?.drop?.lng || 80.8893
    };

    // Map initialize
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: pickup,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstanceRef.current = map;

    // Directions Renderer
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#3B82F6', strokeWeight: 5 }
    });
    directionsRenderer.setMap(map);
    directionsRendererRef.current = directionsRenderer;

    // Route draw karo
    const directionsService = new window.google.maps.DirectionsService();

    // Trip started hai toh driver → drop, warna driver → pickup
    const isStarted = trip?.bookingStatus === 'Ongoing' || trip?.tripData?.startedAt;
    const origin = driverLocation || pickup;
    const destination = isStarted ? drop : pickup;

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          setDistance(leg.distance.text);
          setDuration(leg.duration.text);
        }
      }
    );

    // Pickup marker (green)
    new window.google.maps.Marker({
      position: pickup,
      map,
      icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      title: 'Pickup: ' + (trip?.pickup?.address || '')
    });

    // Drop marker (red)
    new window.google.maps.Marker({
      position: drop,
      map,
      icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
      title: 'Drop: ' + (trip?.drop?.address || '')
    });
  };

  // Driver marker update karo live
  const updateDriverMarker = (loc) => {
    if (!mapInstanceRef.current || !window.google) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(loc);
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: loc,
        map: mapInstanceRef.current,
        icon: {
          url: 'https://maps.google.com/mapfiles/kml/shapes/cabs.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Your Location'
      });
    }
  };

  // OTP se Trip Start
  const handleStartTrip = async () => {
    const { value: otp } = await Swal.fire({
      title: '🔑 Enter OTP',
      text: 'Passenger se 4-digit OTP lo',
      input: 'text',
      inputPlaceholder: '4592',
      inputAttributes: { maxlength: 6 },
      showCancelButton: true,
      confirmButtonText: 'Start Trip 🚗',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#94A3B8',
    });

    if (!otp) return;

    setActionLoading(true);
    try {
      const res = await driverService.startTrip(bookingId, otp);
      if (res.success) {
        toast.success('🚗 Trip Started! Navigate to drop location.');
        fetchTrip();
        // Map redraw — ab drop location dikhao
        setTimeout(() => initMap(), 500);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid OTP!');
    } finally {
      setActionLoading(false);
    }
  };

  // Trip End
  const handleEndTrip = async () => {
    const result = await Swal.fire({
      title: '🏁 End Trip?',
      html: `
        <p class="text-gray-600 mb-4">Final Fare: <strong>₹${trip?.fareEstimate || 0}</strong></p>
        <div class="flex gap-3 justify-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="payment" value="Cash" checked /> Cash
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="payment" value="Online" /> Online
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'End Trip ✅',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#94A3B8',
      preConfirm: () => {
        const selected = document.querySelector('input[name="payment"]:checked');
        return selected?.value || 'Cash';
      }
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      const res = await driverService.endTrip(bookingId, result.value);
      if (res.success) {
        await Swal.fire({
          icon: 'success',
          title: '✅ Trip Completed!',
          html: `<p>Final Fare: <strong>₹${res.finalFare || trip?.fareEstimate || 0}</strong></p>
                 <p>Payment: <strong>${result.value}</strong></p>`,
          confirmButtonColor: '#10B981'
        });
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to end trip');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!trip) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-500">Trip not found</p>
      <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
        Back to Dashboard
      </button>
    </div>
  );

  const isAccepted = trip?.bookingStatus === 'Accepted';
  const isOngoing = trip?.bookingStatus === 'Ongoing' || trip?.tripData?.startedAt;
  const isCompleted = trip?.bookingStatus === 'Completed';
  const passenger = trip?.passengerDetails || {};

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <FaArrowLeft className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900">Trip #{shortId}</h1>
        <button onClick={fetchTrip} className="p-2 hover:bg-gray-100 rounded-lg">
          <FaSync className="text-gray-600" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="px-4 pt-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
          isCompleted ? 'bg-green-100 text-green-700' :
          isOngoing ? 'bg-blue-100 text-blue-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isCompleted ? 'bg-green-500' : isOngoing ? 'bg-blue-500' : 'bg-yellow-500'
          }`} />
          {isCompleted ? '✅ Completed' : isOngoing ? '🚗 Trip Ongoing' : '⏳ Accepted — Go to Pickup'}
        </div>
      </div>

      {/* Google Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
        <div ref={mapRef} style={{ height: '320px', width: '100%' }} />
        {!mapLoaded && (
          <div className="h-80 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading Map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Distance & Duration */}
      {(distance || duration) && (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2">
            <FaRoute className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Distance</p>
              <p className="font-bold text-gray-900">{distance || '—'}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-2">
            <FaClock className="text-orange-500" />
            <div>
              <p className="text-xs text-gray-500">ETA</p>
              <p className="font-bold text-gray-900">{duration || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Info */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaUser className="text-blue-600" /> Passenger Details
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
              {passenger.name?.charAt(0) || 'P'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{passenger.name || 'Passenger'}</p>
              <p className="text-sm text-gray-500">{passenger.phone || '—'}</p>
            </div>
          </div>
          {passenger.phone && (
            <a href={`tel:${passenger.phone}`}
              className="p-3 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-all">
              <FaPhone size={16} />
            </a>
          )}
        </div>
      </div>

      {/* Route Info */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaRoute className="text-blue-600" /> Route
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Navigation size={14} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium text-gray-900">{trip?.pickup?.address || '—'}</p>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-dashed border-gray-300 h-4" />
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={14} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Drop</p>
              <p className="text-sm font-medium text-gray-900">{trip?.drop?.address || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fare Info */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaRupeeSign className="text-green-600" />
            <span className="text-sm font-semibold text-gray-700">Fare Estimate</span>
          </div>
          <span className="text-2xl font-bold text-green-600">₹{trip?.fareEstimate || 0}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">Ride Type</span>
          <span className="text-xs font-medium text-gray-700">{trip?.rideType || 'Standard'}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">Distance</span>
          <span className="text-xs font-medium text-gray-700">{trip?.estimatedDistanceKm || '—'} km</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mx-4 mt-4 mb-8 space-y-3">
        {/* Start Trip Button — OTP se */}
        {isAccepted && !isOngoing && !isCompleted && (
          <button
            onClick={handleStartTrip}
            disabled={actionLoading}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50"
          >
            {actionLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <><FaKey size={18} /> Enter OTP & Start Trip</>
            )}
          </button>
        )}

        {/* End Trip Button */}
        {isOngoing && !isCompleted && (
          <button
            onClick={handleEndTrip}
            disabled={actionLoading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:from-red-700 hover:to-red-800 transition-all shadow-lg disabled:opacity-50"
          >
            {actionLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <><FaStop size={18} /> End Trip & Collect Payment</>
            )}
          </button>
        )}

        {/* Completed */}
        {isCompleted && (
          <div className="w-full py-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-3">
            <FaCheckCircle size={18} /> Trip Completed!
          </div>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 border border-gray-300 text-gray-700 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
        >
          <FaArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
