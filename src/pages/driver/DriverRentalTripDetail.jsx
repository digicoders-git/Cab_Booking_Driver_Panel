import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import { 
  FaCar, FaMapMarkerAlt, FaCheckCircle, 
  FaChevronLeft, FaClock, FaRupeeSign, FaPlay
} from 'react-icons/fa';
import { Flag, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { loadGoogleMaps, createLocationMarker } from '../../utils/mapUtils';
import { getSocket } from '../../socket/socket';

export default function DriverRentalTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [trip, setTrip] = useState(location.state?.trip || null);
  const [loading, setLoading] = useState(!trip);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [endLoading, setEndLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeRendererRef = useRef(null);
  const watchIdRef = useRef(null);
  
  // Tracking references
  const lastLocationRef = useRef(null);
  const trackedDistanceRef = useRef(0);

  // Socket listener for cancellation
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleCancel = (data) => {
        if (data.bookingId === id) {
          Swal.fire({
            title: 'Ride Cancelled',
            text: 'The customer has cancelled the rental ride.',
            icon: 'info',
            confirmButtonText: 'OK'
          }).then(() => {
            navigate('/driver/dashboard');
          });
        }
      };
      socket.on('rental_cancelled_by_user', handleCancel);
      return () => {
        socket.off('rental_cancelled_by_user', handleCancel);
      };
    }
  }, [id, navigate]);

  // Haversine distance calculator
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  useEffect(() => {
    fetchTripDetail();
  }, [id]);

  const fetchTripDetail = async () => {
    try {
      setLoading(true);
      const res = await driverService.getDriverRentalBookings();
      const bookings = res?.bookings || [];
      const foundTrip = bookings.find(t => t._id === id);
      if (foundTrip) {
        setTrip(foundTrip);
      } else {
        toast.error("Trip not found");
        navigate('/driver/rentals');
      }
    } catch (error) {
      toast.error("Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!trip || loading) return;
    
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      try {
        await loadGoogleMaps();
        if (!mapRef.current) return;
        
        const pickup = {
          lat: Number(trip.pickupLocation?.lat || 26.8467),
          lng: Number(trip.pickupLocation?.lng || 80.9462)
        };

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 15,
          center: pickup,
          disableDefaultUI: true
        });
        
        mapInstanceRef.current = map;

        pickupMarkerRef.current = new window.google.maps.Marker({
          position: pickup,
          map,
          icon: createLocationMarker ? createLocationMarker('pickup') : undefined
        });

        setMapLoaded(true);
      } catch (e) {
        console.error("Map load error", e);
      }
    };
    initMap();

    return () => {
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, [trip, loading]);

  useEffect(() => {
    if (!mapLoaded || !window.google) return;
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        
        if (!driverMarkerRef.current) {
          // Use a blue dot for driver
          driverMarkerRef.current = new window.google.maps.Marker({
            position: loc,
            map: mapInstanceRef.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            zIndex: 1000
          });
        } else {
          driverMarkerRef.current.setPosition(loc);
        }
        
        // If ride is ongoing, keep driver in center and track distance
        if (trip?.status === 'Started' || status === 'started') {
          mapInstanceRef.current?.panTo(loc);
          
          // Distance Tracking Logic
          if (lastLocationRef.current) {
            const dist = calculateDistance(
              lastLocationRef.current.lat, 
              lastLocationRef.current.lng, 
              loc.lat, 
              loc.lng
            );
            
            // Only add distance if it's more than 10 meters to avoid GPS jitter
            if (dist > 0.01) {
              trackedDistanceRef.current += dist;
            }
          }
          lastLocationRef.current = loc;
        }
        // Draw line between driver and pickup if ride is accepted
        if (trip?.status?.toLowerCase() === 'accepted' || trip?.bookingStatus?.toLowerCase() === 'accepted') {
          if (!routeRendererRef.current) {
            routeRendererRef.current = new window.google.maps.DirectionsRenderer({
              map: mapInstanceRef.current,
              suppressMarkers: true,
              polylineOptions: { strokeColor: '#2563EB', strokeOpacity: 0.8, strokeWeight: 5 }
            });
          }
          
          const pickup = {
            lat: Number(trip.pickupLocation?.lat || 26.8467),
            lng: Number(trip.pickupLocation?.lng || 80.9462)
          };

          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route({
            origin: loc,
            destination: pickup,
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (result, status) => {
            if (status === 'OK') {
              routeRendererRef.current.setDirections(result);
            }
          });
        }
      },
      (err) => console.log(err),
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [mapLoaded, trip?.status, trip?.bookingStatus]);

  const handleStartRide = async () => {
    if (!otpInput || otpInput.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP");
      return;
    }
    
    setOtpLoading(true);
    try {
      const res = await driverService.startRentalRide(id, otpInput);
      if (res.success) {
        toast.success("Ride Started Successfully!");
        setTrip(res.booking);
      } else {
        toast.error(res.message || "Invalid OTP");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start ride");
      fetchTripDetail(); // Fetch fresh status from backend to sync UI
    } finally {
      setOtpLoading(false);
    }
  };

  const handleEndRide = async () => {
    const finalDistance = Math.max(0, Number(trackedDistanceRef.current.toFixed(1)));

    // Calculate Estimated Live Fare
    const pkg = trip?.rentalPackage || {};
    const basePrice = pkg.basePrice || 0;
    
    let extraKmFare = 0;
    const baseDist = Number(pkg.baseDistance) || 0;
    const extraKmPrice = Number(pkg.extraKmPrice) || 0;
    if (finalDistance > baseDist) {
        extraKmFare = (finalDistance - baseDist) * extraKmPrice;
    }

    let extraTimeFare = 0;
    if (trip?.startTime) {
        const durationMs = new Date() - new Date(trip.startTime);
        const totalMinutes = Math.ceil(durationMs / (1000 * 60));
        const baseMins = (Number(pkg.hours) || 0) * 60;
        const extraMinPrice = Number(pkg.extraMinutePrice) || 0;
        if (totalMinutes > baseMins) {
            extraTimeFare = (totalMinutes - baseMins) * extraMinPrice;
        }
    }
    const estimatedTotal = Math.round(basePrice + extraKmFare + extraTimeFare);

    const result = await Swal.fire({
      title: 'End Rental Ride',
      html: `
        <div class="text-left mt-2">
          <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-5 flex justify-between items-center">
            <div>
              <p class="text-xs font-bold text-blue-600 uppercase tracking-wide">Distance</p>
              <p class="text-lg font-black text-gray-900">${finalDistance} KMs</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-green-600 uppercase tracking-wide">Est. Fare</p>
              <p class="text-2xl font-black text-green-600">₹${estimatedTotal}</p>
            </div>
          </div>
          <label class="block text-sm font-bold text-gray-800 mb-3">Select Payment Method:</label>
          <div class="flex flex-col gap-3">
            <label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
              <input type="radio" name="paymentMethod" value="Cash" checked class="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300">
              <span class="font-semibold text-gray-800 flex-1">💵 Cash Collection</span>
            </label>
            <label class="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
              <input type="radio" name="paymentMethod" value="Online" class="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300">
              <span class="font-semibold text-gray-800 flex-1">📱 Online / Razorpay</span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, End Ride',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#6B7280',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl px-6 py-3 font-bold',
        cancelButton: 'rounded-xl px-6 py-3 font-bold'
      },
      preConfirm: () => {
        const selected = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selected) {
          Swal.showValidationMessage('Please select a payment method');
          return false;
        }
        return selected.value;
      }
    });

    if (result.isConfirmed) {
      const paymentMethod = result.value; // 'Cash' or 'Online'
      setEndLoading(true);
      try {
        const res = await driverService.endRentalTrip(id, finalDistance, paymentMethod);
        if (res.success) {
          if (res.requirePayment && res.paymentUrl) {
            toast.info("Opening Razorpay for Customer Payment...");
            window.location.href = res.paymentUrl;
            return;
          }

          toast.success("Ride Ended Successfully!");
          setTrip(res.booking);
          // Show bill summary
          Swal.fire({
            title: 'Ride Completed!',
            html: `
              <div class="text-left">
                <p><strong>Total Distance:</strong> ${finalDistance} KMs</p>
                <p><strong>Total Fare:</strong> ₹${res.booking.fareDetails.totalFare}</p>
                <p><strong>Payment Mode:</strong> <span class="font-bold text-blue-600">${res.booking.paymentMethod}</span></p>
                <hr class="my-2 border-gray-300" />
                <p class="text-sm text-red-500 font-semibold">Admin Commission: -₹${res.booking.fareDetails.adminCommission || 0}</p>
                <p class="text-sm text-green-600 font-bold mt-1">Your Earning: ₹${(res.booking.fareDetails.totalFare - (res.booking.fareDetails.adminCommission || 0)).toFixed(2)}</p>
                <hr class="my-2 border-gray-300" />
                <p class="text-xs text-gray-500 mt-2">Extra KM Fare: ₹${res.booking.fareDetails.extraKmFare}</p>
                <p class="text-xs text-gray-500">Extra Time Fare: ₹${res.booking.fareDetails.extraTimeFare}</p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'OK'
          });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to end ride");
      } finally {
        setEndLoading(false);
      }
    }
  };

  // Handle Razorpay Verification
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentId = queryParams.get('razorpay_payment_id');
    const signature = queryParams.get('razorpay_signature');
    const bId = queryParams.get('bookingId');

    if (paymentId && signature && bId === id) {
      setEndLoading(true);
      driverService.verifyRentalPayment({
        bookingId: id,
        razorpay_payment_id: paymentId,
        razorpay_payment_link_id: queryParams.get('razorpay_payment_link_id'),
        razorpay_payment_link_reference_id: queryParams.get('razorpay_payment_link_reference_id'),
        razorpay_payment_link_status: queryParams.get('razorpay_payment_link_status'),
        razorpay_signature: signature
      }).then(res => {
        if (res.success) {
          toast.success("Payment Verified & Ride Completed!");
          setTrip(res.booking);
          Swal.fire({
            title: 'Payment Successful!',
            html: `
              <div class="text-left">
                <p><strong>Total Fare:</strong> ₹${res.booking.fareDetails?.totalFare || 0}</p>
                <p><strong>Payment Mode:</strong> <span class="font-bold text-blue-600">Online</span></p>
                <hr class="my-2 border-gray-300" />
                <p class="text-sm text-green-700 bg-green-50 p-2 rounded">Earnings Added to Wallet</p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'Go to Dashboard',
            confirmButtonColor: '#10B981',
            allowOutsideClick: false
          }).then(() => navigate('/driver/dashboard'));
        }
      }).catch(err => {
        toast.error(err.response?.data?.message || "Payment verification failed");
      }).finally(() => {
        setEndLoading(false);
        navigate(`/driver/rental/${id}`, { replace: true });
      });
    }
  }, [location.search, id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trip) return null;

  const status = trip.status?.toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-8">

      <div className="w-full px-2 sm:px-4 py-4 space-y-6">
        
        {/* Map Container */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 relative overflow-hidden">
          <div ref={mapRef} className="h-[350px] w-full rounded-xl bg-gray-100" />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 rounded-xl z-10">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          )}
          {status === 'started' && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-blue-600 flex items-center gap-2 z-10 border border-blue-100">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Live Tracking
            </div>
          )}
        </div>

        {/* Passenger Info & Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Passenger Info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaCar className="text-blue-500" /> Package & Passenger Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Passenger Name</p>
                  <p className="font-semibold text-gray-900">{trip.user?.name || 'Guest User'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                  <p className="font-semibold text-gray-900">{trip.user?.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Selected Package</p>
              <p className="font-bold text-blue-700 text-lg bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 inline-block">
                {trip.rentalPackage?.name}
              </p>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <div className="pl-2">
              <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FaMapMarkerAlt className="text-blue-500" /> Pickup Location
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                <p className="text-base text-gray-800 leading-relaxed font-semibold">
                  {trip.pickupLocation?.address}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${trip.pickupLocation?.lat},${trip.pickupLocation?.lng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Flag size={18} /> Open in Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaRupeeSign className="text-green-500" /> Fare Estimates & Limits
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
              <p className="text-xs text-gray-500 mb-1 font-medium">Base Fare</p>
              <p className="font-black text-gray-900 text-xl">₹{trip.rentalPackage?.basePrice}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
              <p className="text-xs text-gray-500 mb-1 font-medium">Included Distance</p>
              <p className="font-black text-gray-900 text-xl">{trip.rentalPackage?.baseDistance} KMs</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
              <p className="text-xs text-gray-500 mb-1 font-medium">Extra KM Rate</p>
              <p className="font-black text-gray-900 text-xl">₹{trip.rentalPackage?.extraKmPrice}<span className="text-sm text-gray-500 font-medium">/KM</span></p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
              <p className="text-xs text-gray-500 mb-1 font-medium">Extra Time Rate</p>
              <p className="font-black text-gray-900 text-xl">₹{trip.rentalPackage?.extraMinutePrice}<span className="text-sm text-gray-500 font-medium">/Min</span></p>
            </div>
          </div>

          {status === 'completed' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Final Bill Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Fare</span>
                  <span className="font-semibold">₹{trip.fareDetails?.baseFare}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Distance Travelled</span>
                  <span className="font-semibold">{trip.totalDistanceTravelled} KMs</span>
                </div>
                {trip.fareDetails?.extraKmFare > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Extra Distance Fare</span>
                    <span className="font-semibold">+₹{trip.fareDetails.extraKmFare}</span>
                  </div>
                )}
                {trip.fareDetails?.extraTimeFare > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Extra Time Fare</span>
                    <span className="font-semibold">+₹{trip.fareDetails.extraTimeFare}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-gray-300">
                  <span className="font-bold text-gray-900">Total Paid Fare</span>
                  <span className="font-bold text-green-600 text-lg">₹{trip.fareDetails?.totalFare}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        {status === 'accepted' && (
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 md:p-8 border border-blue-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 translate-x-10 -translate-y-10"></div>
            
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Customer & Start Ride</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ask the customer for their <span className="font-bold text-gray-800">4-digit OTP</span> to start the rental period.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    maxLength="4"
                    placeholder="Enter 4-digit OTP"
                    className="w-full px-5 py-4 bg-white border border-gray-300 hover:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-2xl font-bold tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-base placeholder:text-gray-400 text-gray-800 shadow-sm transition-all"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button
                  onClick={handleStartRide}
                  disabled={otpLoading || otpInput.length !== 4}
                  className="sm:w-64 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:shadow-md text-lg active:scale-[0.98]"
                >
                  {otpLoading ? <Loader2 className="animate-spin" size={20} /> : <FaPlay size={16} />} 
                  {otpLoading ? 'Verifying...' : 'Start Ride'}
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'started' && (
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-300 shadow-md animate-fade-in-up">
            <h2 className="text-lg font-bold text-yellow-900 mb-2 flex items-center gap-2">
              <FaClock className="text-yellow-600" /> Ride is Active
            </h2>
            <p className="text-sm text-yellow-800 mb-6">
              Total distance is strictly tracked automatically via GPS. Once the customer has reached their final destination, press End Rental Trip to calculate the final bill.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleEndRide}
                disabled={endLoading}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 text-lg"
              >
                {endLoading ? <Loader2 className="animate-spin" size={20} /> : <Flag size={20} />}
                {endLoading ? 'Calculating...' : 'End Rental Trip'}
              </button>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FaCheckCircle className="text-green-500 text-3xl" />
            </div>
            <h2 className="text-lg font-bold text-green-900">Rental Trip Completed!</h2>
            <p className="text-sm text-green-700 mt-1">Great job! The payment and fare have been recorded.</p>
          </div>
        )}

      </div>
    </div>
  );
}
