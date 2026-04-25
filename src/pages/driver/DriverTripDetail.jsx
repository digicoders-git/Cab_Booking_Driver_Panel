import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import OptimizedTripMap from '../../components/OptimizedTripMap';
import {
  FaUser, FaPhone, FaMapMarkerAlt, FaRoute, FaClock,
  FaCheckCircle, FaRupeeSign, FaArrowLeft, FaSync,
  FaPlay, FaStop, FaKey, FaCar, FaTaxi, FaTimesCircle, FaExclamationTriangle
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

    // 🎯 Real-time Booking Update Listener (Cancellation, Stops etc.)
    const socket = getSocket();
    if (socket) {
      console.log('📡 DriverTripDetail: socket listeners attached');
      
      const handleUpdate = (data) => {
        console.log('🔔 Trip Event Received:', data);
        const incomingId = data.bookingId || data.id;
        
        // Match using full ID or just the shortId from URL
        const isTarget = (trip && trip._id === incomingId) || 
                         (incomingId && (incomingId === bookingId || incomingId.endsWith(shortId)));

        if (isTarget) {
          if (data.status === 'Cancelled' || data.status === 'Expired') {
            setTrip(prev => prev ? { ...prev, bookingStatus: data.status } : null);
            Swal.fire({
              icon: 'error',
              title: data.status === 'Cancelled' ? 'Trip Cancelled! ❌' : 'Trip Expired! ⏳',
              text: data.message || `Customer has ${data.status.toLowerCase()} this ride.`,
              confirmButtonText: 'Back to Dashboard',
              confirmButtonColor: '#EF4444',
              allowOutsideClick: false,
              backdrop: `rgba(239, 68, 68, 0.15) blur(4px)`
            }).then(() => { navigate('/dashboard'); });
          } else {
            console.log("🔄 Auto-refreshing trip data...");
            fetchTrip();
          }
        }
      };

      socket.on('booking_update', handleUpdate);
      socket.on('stop_update', handleUpdate);

      return () => {
        socket.off('booking_update', handleUpdate);
        socket.off('stop_update', handleUpdate);
        console.log('⚰️ DriverTripDetail: socket listeners removed');
      };
    }
  }, [fetchTrip, shortId, navigate]);

  // ⏱️ Waiting Timer Logic (Synced for Multi-Stop)
  useEffect(() => {
    let interval;
    const pickupArrived = trip?.tripData?.arrivedAt && trip?.bookingStatus === 'Accepted';
    const activeStop = (trip?.stops || []).find(s => s.status === 'Arrived');
    
    const arrivedAt = pickupArrived ? trip.tripData.arrivedAt : (activeStop ? activeStop.arrivedAt : null);

    if (arrivedAt) {
      const start = new Date(arrivedAt).getTime();
      interval = setInterval(() => {
        const now = Date.now();
        const diffInSecs = Math.floor((now - start) / 1000);
        setWaitingSeconds(diffInSecs > 0 ? diffInSecs : 0);
      }, 1000);
    } else {
      setWaitingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [trip?.tripData?.arrivedAt, trip?.bookingStatus, trip?.stops]);

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
    // 💰 Calculate TOTAL waiting charges (Pickup + All Intermediate Stops)
    const pickupWait = trip?.tripData?.waitingCharges || 0;
    const stopsWait = (trip?.stops || []).reduce((sum, stop) => sum + (stop.waitingCharges || 0), 0);
    const totalWaitingCharges = pickupWait + stopsWait;

    const currentFare = trip?.actualFare || trip?.fareEstimate || 0;
    const baseFare = currentFare - totalWaitingCharges;
    const totalWaitingTime = (trip?.tripData?.waitingTimeMin || 0) + 
                             (trip?.stops || []).reduce((sum, stop) => sum + (stop.waitingTimeMin || 0), 0);

    const result = await Swal.fire({
      title: '🏁 End Trip?',
      html: `
        <div class="text-left bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 shadow-inner">
          <div class="flex justify-between mb-2">
            <span class="text-gray-500 font-medium italic">Standard Fare:</span>
            <span class="font-bold text-gray-800">₹${baseFare}</span>
          </div>
          ${totalWaitingCharges > 0 ? `
            <div class="flex justify-between mb-2 text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
              <span class="flex items-center gap-1"><FaClock size={10}/> Total Waiting (${totalWaitingTime} min):</span>
              <span class="font-black">+ ₹${totalWaitingCharges}</span>
            </div>
          ` : ''}
          <div class="border-t border-gray-300 my-2 pt-3 flex justify-between items-center">
            <span class="font-black text-gray-900 uppercase">Final Earnings:</span>
            <span class="font-black text-green-600 text-3xl">₹${currentFare}</span>
          </div>
        </div>
        <p class="text-xs text-gray-400 mb-4">* Collect payment from passenger</p>
        <div class="flex gap-4 justify-center">
          <label class="flex-1 flex items-center gap-2 cursor-pointer p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-all font-bold">
            <input type="radio" name="payment" value="Cash" checked className="w-5 h-5" /> Cash
          </label>
          <label class="flex-1 flex items-center gap-2 cursor-pointer p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-all font-bold">
            <input type="radio" name="payment" value="Online" className="w-5 h-5" /> Online
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirm & End Trip ✅',
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#94A3B8',
      preConfirm: () => {
        const selected = document.querySelector('input[name="payment"]:checked');
        return selected?.value || 'Cash';
      }
    });

    if (!result.isConfirmed) return;

    const selectedMethod = result.value;

    if (selectedMethod === 'Online') {
      setActionLoading(true);
      try {
        const orderRes = await driverService.initiateTripPayment(bookingId);
        if (orderRes.success) {
          const options = {
            key: orderRes.key,
            amount: orderRes.amount * 100,
            currency: "INR",
            name: "Cab Booking Payment",
            description: `Trip #${shortId.toUpperCase()}`,
            order_id: orderRes.orderId,
            handler: async (response) => {
              console.log("💳 Razorpay Success Response:", response);
              try {
                const verifyRes = await driverService.verifyTripPayment({
                  bookingId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                });

                console.log("✅ Payment Verification Result:", verifyRes);

                if (verifyRes.success) {
                  await Swal.fire({
                    icon: 'success',
                    title: '✅ Payment Success!',
                    text: `Payment verified. Trip Completed.`,
                    confirmButtonColor: '#10B981',
                  });
                  navigate('/dashboard');
                } else {
                  console.error("❌ Verification Failed:", verifyRes.message);
                  toast.error(verifyRes.message || "Verification failed");
                }
              } catch (err) {
                console.error("🚨 Verification Error:", err);
                toast.error("Error verifying payment");
              }
            },
            prefill: {
              name: trip.passengerDetails?.name || "",
              contact: trip.passengerDetails?.phone || ""
            },
            theme: { color: "#2563eb" },
            modal: { ondismiss: () => setActionLoading(false) }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          toast.error(orderRes.message || "Failed to initiate payment");
          setActionLoading(false);
        }
      } catch (err) {
        toast.error("Payment initiation error");
        setActionLoading(false);
      }
    } else {
      setActionLoading(true);
      try {
        const res = await driverService.endTrip(bookingId, 'Cash');
        if (res.success) {
          await Swal.fire({
            icon: 'success',
            title: '✅ Trip Completed!',
            html: `<div class="p-4 bg-green-50 rounded-2xl border border-green-100 mb-2">
                     <p class="text-gray-600">Final Fare Collected (Cash)</p>
                     <p class="text-4xl font-black text-green-600 mt-1">₹${res.finalFare || currentFare}</p>
                   </div>`,
            confirmButtonColor: '#10B981',
            confirmButtonText: 'Back to Dashboard'
          });
          navigate('/dashboard');
        }
      } catch (err) {
        toast.error("Failed to end trip");
      } finally {
        setActionLoading(false);
      }
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

  // NEW: Handle arriving at an intermediate stop
  const handleStopArrived = async (index) => {
    setActionLoading(true);
    try {
      const res = await driverService.markStopArrived(bookingId, index);
      if (res.success) {
        toast.success(`📍 Arrived at stop ${index + 1}. Waiting charge started!`);
        fetchTrip();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to mark stop arrival');
    } finally {
      setActionLoading(false);
    }
  };

  // NEW: Handle completing an intermediate stop
  const handleStopComplete = async (index) => {
    setActionLoading(true);
    try {
      const res = await driverService.completeStop(bookingId, index);
      if (res.success) {
        toast.success(`✅ Stop ${index + 1} completed! Fare updated to ₹${res.totalFare}`);
        fetchTrip();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to complete stop');
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

          {/* Intermediate Stops */}
          {trip?.stops && trip.stops.map((stop, idx) => (
            <div key={idx}>
              <div className="ml-4 border-l-2 border-dashed border-gray-300 h-4" />
              <div className="flex items-start gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
                   <div className="absolute inset-0 bg-orange-100 rounded-full scale-75" />
                   <div className={`w-2 h-2 rounded-full z-10 ${stop.status === 'Completed' ? 'bg-green-500' : 'bg-orange-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Stop {idx + 1}</p>
                    {stop.status === 'Completed' && <FaCheckCircle className="text-green-500 text-[10px]" />}
                  </div>
                  <p className="text-xs font-medium text-gray-800">{stop.address}</p>
                </div>
              </div>
            </div>
          ))}

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

        {/* 📍 Stop Management Dashboard (Only when Trip is Ongoing) */}
        {isOngoing && !isCompleted && trip?.stops && trip.stops.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-3">
              <FaMapMarkerAlt className="text-orange-500" /> STOPS MANAGEMENT ({trip.stops.length})
            </h3>
            <div className="space-y-4">
              {trip.stops.map((stop, idx) => {
                const isArrived = stop.status === 'Arrived';
                const isCompletedStop = stop.status === 'Completed';
                const isPending = !stop.status || stop.status === 'Pending';
                
                return (
                  <div key={idx} className={`p-4 rounded-xl border ${
                    isCompletedStop ? 'bg-green-50 border-green-100' : 
                    isArrived ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-400' : 
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            isCompletedStop ? 'bg-green-500' : isArrived ? 'bg-orange-500' : 'bg-gray-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Stop Point</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{stop.address}</p>
                        
                        {isCompletedStop && (
                          <div className="mt-2 flex items-center gap-4 text-xs font-medium">
                            <span className="text-green-600 flex items-center gap-1">
                              <FaCheckCircle /> Done
                            </span>
                            <span className="text-gray-500">Wait: {stop.waitingTimeMin || 0}m</span>
                            <span className="text-blue-600 font-bold">₹{stop.waitingCharges || 0} added</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {isPending && (
                          <button
                            onClick={() => handleStopArrived(idx)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            REACHED
                          </button>
                        )}
                        {isArrived && (
                          <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-2">
                               <div className="bg-white px-3 py-1 rounded-full border border-orange-300 text-orange-600 text-[10px] font-black animate-pulse">
                                  PASSENGER AWAY
                               </div>
                               <div className="text-orange-700 font-mono text-sm font-bold bg-orange-100 px-2 py-0.5 rounded-lg border border-orange-200">
                                  {formatTime(waitingSeconds)}
                               </div>
                             </div>
                             <p className="text-[9px] text-orange-500 font-medium">
                               {waitingSeconds > (trip?.carCategory?.freeWaitingMin || 5) * 60 
                                ? "💸 Chargeable time active" 
                                : `Complimentary: ${trip?.carCategory?.freeWaitingMin || 5} min`}
                             </p>
                             <button
                               onClick={() => handleStopComplete(idx)}
                               disabled={actionLoading}
                               className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-bold shadow-md hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all w-full"
                             >
                               CONTINUE TRIP
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 italic text-center">
              Stops help you earn extra waiting charges! 💰
            </p>
          </div>
        )}


        {/* End Trip Button */}
        {isOngoing && !isCompleted && (() => {
          const allStopsCompleted = !trip?.stops || trip.stops.length === 0 || trip.stops.every(s => s.status === 'Completed');
          
          return (
            <div className="space-y-3">
               {!allStopsCompleted && (
                 <div className="flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100 text-red-600">
                    <FaExclamationTriangle className="shrink-0" size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-tight">
                      Pehle saare intermediate stops complete karo!
                    </p>
                 </div>
               )}
               <button
                onClick={handleEndTrip}
                disabled={actionLoading || !allStopsCompleted}
                className={`w-full py-4 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                  !allStopsCompleted 
                  ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                }`}
              >
                {actionLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><FaStop size={18} /> End Trip & Collect Payment</>
                )}
              </button>
            </div>
          );
        })()}

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
