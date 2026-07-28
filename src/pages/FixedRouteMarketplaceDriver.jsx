import React, { useState, useEffect } from 'react';
import api from '../api/index';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { FaCar, FaClock, FaCheckCircle, FaUserAlt, FaArrowRight, FaRedo } from 'react-icons/fa';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/config';

const FixedRouteMarketplaceDriver = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketplaceBookings();
    
    // Listen for new fixed bookings in marketplace
    const socket = io(API_BASE_URL);
    socket.on('newFixedBookingMarketplace', (data) => {
      if (data && data.booking) {
        fetchMarketplaceBookings();
        toast.info("A new package ride is available!");
      }
    });

    socket.on('removeFixedBookingMarketplace', (data) => {
      if (data && data.bookingId) {
        setBookings(prev => prev.filter(b => b._id !== data.bookingId));
      }
    });

    socket.on('fixedBookingCancelled', (data) => {
      // If the driver is on this page and the ride gets cancelled
      toast.error("A package ride you accepted was cancelled by the user.", {
        duration: 5000,
        position: 'top-center'
      });
    });

    return () => socket.disconnect();
  }, []);

  const fetchMarketplaceBookings = async () => {
    try {
      const res = await api.get('/api/fixed-routes/bookings/marketplace/driver');
      setBookings(res.data.bookings || []);
    } catch (error) {
      toast.error('Failed to load packages from marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    const result = await Swal.fire({
      title: 'Accept Package?',
      text: 'Are you sure you want to accept this package ride? If cash, commission will be deducted from your wallet.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Accept it!'
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/api/fixed-routes/bookings/${bookingId}/accept-driver`, {});
        Swal.fire({
          title: 'Accepted!',
          text: 'Booking has been assigned to you successfully.',
          icon: 'success',
          confirmButtonColor: '#10b981'
        });
        fetchMarketplaceBookings();
      } catch (error) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to accept booking',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Available Packages</h1>
          <p className="text-gray-500 mt-1 font-medium">Accept premium fixed route rides from the marketplace</p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
          <span className="text-indigo-700 font-bold text-sm tracking-wide">Live Updates</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
        {bookings.map(booking => (
          <div key={booking._id} className="bg-white rounded-2xl p-0 shadow-sm border border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 group flex flex-col overflow-hidden">
            
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center space-x-2 text-gray-700 font-semibold">
                <FaCar className="text-indigo-500 text-lg" />
                <span className="truncate">{booking.carCategory?.name || 'Any Car'}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Trip Type Badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border flex items-center gap-1 ${
                  booking.tripType === 'Round-Trip'
                    ? 'bg-purple-50 text-purple-600 border-purple-200'
                    : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {booking.tripType === 'Round-Trip' ? <><FaRedo size={9}/> Round</> : <><FaArrowRight size={9}/> One-Way</>}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${booking.paymentMethod === 'Cash' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                  {booking.paymentMethod}
                </span>
              </div>
            </div>

            {/* Card Body - Route Details */}
            <div className="p-6 flex-grow bg-white">
              <div className="relative pl-6 space-y-6 mb-8">
                {/* Vertical Line indicator */}
                <div className="absolute left-[0.4rem] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full"></div>
                
                {/* Pickup */}
                <div className="relative">
                  <div className="absolute -left-[1.65rem] top-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-white z-10 shadow-sm"></div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Pickup Location</p>
                  <p className="text-gray-800 text-sm font-semibold line-clamp-2 leading-relaxed" title={booking.pickupLocation}>
                    {booking.pickupLocation}
                  </p>
                </div>

                {/* Drop */}
                <div className="relative">
                  <div className="absolute -left-[1.65rem] top-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-[3px] border-white z-10 shadow-sm"></div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Drop Location</p>
                  <p className="text-gray-800 text-sm font-semibold line-clamp-2 leading-relaxed" title={booking.dropLocation}>
                    {booking.dropLocation}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date & Time */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
                    <FaClock className="mr-1.5 text-indigo-400" /> Date & Time
                  </div>
                  <p className="text-gray-800 font-bold text-sm">
                    {new Date(booking.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="mx-1 text-gray-300">|</span>
                    <span className="text-indigo-600">{booking.pickupTime}</span>
                  </p>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
                    <FaUserAlt className="mr-1.5 text-indigo-400" /> Customer
                  </div>
                  <p className="text-gray-800 font-bold text-sm truncate">
                    {booking.user?.name || 'Guest User'}
                  </p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="mt-6 bg-gradient-to-br from-indigo-50/50 to-white rounded-xl p-4 border border-indigo-50">
                <div className="flex justify-between items-end border-b border-indigo-100/50 pb-3 mb-3">
                  <div>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Fare</p>
                    <p className="text-gray-800 font-black text-xl">₹{booking.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Commission</p>
                    <p className="text-rose-500 font-bold text-sm">- ₹{booking.adminCommission}</p>
                  </div>
                </div>
                {/* Time Limit Info */}
                {booking.maxTimeHours > 0 && (
                  <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3">
                    <span className="text-orange-600 text-xs font-bold flex items-center gap-1.5">
                      <FaClock size={10}/> Includes {booking.maxTimeHours} hrs
                    </span>
                    <span className="text-orange-500 text-xs font-semibold">+₹{booking.extraTimeChargePerHour}/hr extra</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-indigo-900/60 font-bold uppercase tracking-wider">Your Final Earning</span>
                  <span className="text-2xl font-black text-emerald-600">
                    ₹{booking.price - booking.adminCommission}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer - Action */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 mt-auto">
              <button 
                onClick={() => handleAcceptBooking(booking._id)} 
                className="w-full flex justify-center items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg shadow-indigo-600/20 group/btn"
              >
                <FaCheckCircle className="group-hover/btn:scale-110 transition-transform" />
                <span>Accept Package Ride</span>
              </button>
            </div>
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <FaCar className="text-indigo-300 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Packages Available</h3>
            <p className="text-gray-500 max-w-sm">
              There are currently no fixed package rides matching your car category. Check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixedRouteMarketplaceDriver;
