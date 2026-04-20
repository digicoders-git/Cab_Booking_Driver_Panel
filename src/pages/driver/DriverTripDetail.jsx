import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import OptimizedTripMap from '../../components/OptimizedTripMap';
import {
  FaUser, FaPhone, FaMapMarkerAlt, FaRoute, FaClock,
  FaCheckCircle, FaRupeeSign, FaArrowLeft, FaSync,
  FaPlay, FaStop, FaKey, FaCar, FaTaxi, FaTimesCircle
} from 'react-icons/fa';
import { Navigation, MapPin } from 'lucide-react';
import { getSocket } from '../../socket/socket';

export default function DriverTripDetail() {
  const { id: shortId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [actionLoading, setActionLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [liveLocation, setLiveLocation] = useState(null);

  // Handle location updates from OptimizedTripMap
  const handleLocationUpdate = useCallback((locationData) => {
    setLiveLocation(locationData);
    console.log('📍 Live location update:', locationData);
  }, []);

  // Fetch trip detail
  const fetchTrip = useCallback(async () => {
    try {
      const res = await driverService.getMyTrips();
      const trips = res?.trips || res || [];
      const found = trips.find(t => t._id.endsWith(shortId));
      if (found) {
        setTrip(found);
        setBookingId(found._id);
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

    // 🎯 Real-time Booking Update Listener (Cancellation etc.)
    const socket = getSocket();
    if (socket) {
      console.log('📡 DriverTripDetail: socket listener attached');
      socket.on('booking_update', (data) => {
        console.log('🔔 Booking Details Updated:', data);
        
        // Match using full ID or just the shortId from URL for instant response
        const isTargetBooking = (trip && trip._id === data.bookingId) || 
                               (data.bookingId && data.bookingId.endsWith(shortId));

        if (isTargetBooking) {
          if (data.status === 'Cancelled' || data.status === 'Expired') {
            // Update local state instantly so UI shows "Cancelled" in background
            setTrip(prev => prev ? { ...prev, bookingStatus: data.status } : null);

            Swal.fire({
              icon: 'error',
              title: data.status === 'Cancelled' ? 'Trip Cancelled! ❌' : 'Trip Expired! ⏳',
              text: data.message || `The customer has ${data.status.toLowerCase()} this ride.`,
              confirmButtonText: 'Back to Dashboard',
              confirmButtonColor: '#EF4444',
              allowOutsideClick: false,
              backdrop: `rgba(239, 68, 68, 0.15) blur(4px)`
            }).then(() => {
              navigate('/dashboard');
            });
          } else {
            fetchTrip();
          }
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('booking_update');
        console.log('⚰️ DriverTripDetail: socket listener removed');
      }
    };
  }, [fetchTrip, trip, shortId, navigate]);

  // ⏱️ Waiting Timer Logic
  useEffect(() => {
    let interval;
    if (trip?.tripData?.arrivedAt && trip?.bookingStatus === 'Accepted') {
      const start = new Date(trip.tripData.arrivedAt).getTime();
      
      interval = setInterval(() => {
        const now = Date.now();
        const diffInSecs = Math.floor((now - start) / 1000);
        setWaitingSeconds(diffInSecs > 0 ? diffInSecs : 0);
      }, 1000);
    } else {
      setWaitingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [trip?.tripData?.arrivedAt, trip?.bookingStatus]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mark Arrived
  const handleArrived = async () => {
    setActionLoading(true);
    try {
      const res = await driverService.markArrived(bookingId);
      if (res.success) {
        toast.success('📍 Check-in successful! Waiting timer started.');
        fetchTrip();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to check-in');
    } finally {
      setActionLoading(false);
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
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid OTP!');
    } finally {
      setActionLoading(false);
    }
  };

  // Trip End
  const handleEndTrip = async () => {
    const baseFare = (trip?.fareEstimate || 0) - (trip?.tripData?.waitingCharges || 0);
    const waitingCharges = trip?.tripData?.waitingCharges || 0;
    const waitingTime = trip?.tripData?.waitingTimeMin || 0;

    const result = await Swal.fire({
      title: '🏁 End Trip?',
      html: `
        <div class="text-left bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
          <div class="flex justify-between mb-2">
            <span class="text-gray-500">Ride Fare:</span>
            <span class="font-semibold text-gray-800">₹${baseFare}</span>
          </div>
          ${waitingCharges > 0 ? `
            <div class="flex justify-between mb-2 text-orange-600">
              <span>Waiting Fee (${waitingTime} min):</span>
              <span class="font-bold">+ ₹${waitingCharges}</span>
            </div>
          ` : ''}
          <div class="border-t border-gray-300 my-2 pt-2 flex justify-between">
            <span class="font-bold text-gray-900">Final Total:</span>
            <span class="font-bold text-green-600 text-xl">₹${trip?.fareEstimate || 0}</span>
          </div>
        </div>
        <div class="flex gap-4 justify-center mt-4">
          <label class="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg w-full justify-center">
            <input type="radio" name="payment" value="Cash" checked /> Cash
          </label>
          <label class="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg w-full justify-center">
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
    } finally {
      setActionLoading(false);
    }
  };

  // Driver Cancel Trip
  const handleCancelTrip = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: '🚨 Cancel this Ride?',
      text: 'Are you sure you want to cancel? This might affect your rating.',
      input: 'textarea',
      inputPlaceholder: 'Reason for cancellation (e.g. Traffic, Vehicle issue...)',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel Ride',
      confirmButtonColor: '#EF4444',
      cancelButtonText: 'No, Keep it',
      cancelButtonColor: '#94A3B8',
    });

    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      const res = await driverService.cancelTrip(bookingId, reason || 'Driver cancelled');
      if (res.success) {
        toast.success('🚨 Trip cancelled successfully.');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel trip');
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

      {/* Optimized Google Map */}
      <div className="mx-4 mt-4">
        <OptimizedTripMap 
          trip={trip}
          onLocationUpdate={handleLocationUpdate}
          className="h-[480px] w-full rounded-2xl shadow-lg border border-gray-200"
        />
      </div>

      {/* Live Location Status */}
      {liveLocation && (
        <div className="mx-4 mt-3">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 border border-green-200 flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                📍 Live Navigation Active
              </p>
              <p className="text-xs text-gray-600">
                {liveLocation.destination === 'drop' ? 'Heading to drop location' : 'Going to pickup location'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{liveLocation.distance}</p>
              <p className="text-xs font-medium text-green-600">{liveLocation.duration}</p>
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
        {/* Arrival & Start Controls */}
        {isAccepted && !isOngoing && !isCompleted && (
          <div className="space-y-3">
            {!trip?.tripData?.arrivedAt ? (
              <button
                onClick={handleArrived}
                disabled={actionLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><Navigation size={18} /> I have Arrived at Pickup</>
                )}
              </button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-orange-700 font-semibold">
                  <FaClock className="animate-pulse" /> 
                  Waiting for Passenger: <span className="text-xl font-mono">{formatTime(waitingSeconds)}</span>
                </div>
                <p className="text-xs text-orange-600 text-center">
                  {waitingSeconds > (trip?.carCategory?.freeWaitingMin || 3) * 60 
                    ? "⚠️ Chargeable waiting time active" 
                    : `Free time: ${trip?.carCategory?.freeWaitingMin || 3} min`}
                </p>
              </div>
            )}

            <button
              onClick={handleStartTrip}
              disabled={actionLoading || !trip?.tripData?.arrivedAt}
              className={`w-full py-4 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-50 ${
                !trip?.tripData?.arrivedAt 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              }`}
            >
              {actionLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <><FaKey size={18} /> Enter OTP & Start Trip</>
              )}
            </button>

            {/* Cancel Button - Only visible if not started */}
            <button
              onClick={handleCancelTrip}
              disabled={actionLoading}
              className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
            >
              {actionLoading ? (
                 <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
              ) : (
                <><FaTimesCircle /> Cancel Ride</>
              )}
            </button>

            {!trip?.tripData?.arrivedAt && (
              <p className="text-center text-[10px] text-gray-400 italic">
                * Mark "Arrived" first to enable Start Trip
              </p>
            )}
          </div>
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
