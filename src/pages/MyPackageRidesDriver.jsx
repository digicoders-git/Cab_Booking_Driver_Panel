import React, { useState, useEffect } from 'react';
import api from '../api/index';
import { toast } from 'sonner';
import { FaCar, FaClock, FaUserAlt, FaCheckCircle, FaPhoneAlt, FaMoneyBillWave, FaArrowRight, FaRedo, FaKey } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { getSocket } from '../socket/socket';

const MyPackageRidesDriver = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Accepted');
  const [otpInput, setOtpInput] = useState({});

  useEffect(() => {
    fetchMyAcceptedBookings();
    const socket = getSocket();
    if (socket) {
      socket.on('fixedBookingPaymentSuccess', fetchMyAcceptedBookings);
    }
    return () => {
      if (socket) socket.off('fixedBookingPaymentSuccess', fetchMyAcceptedBookings);
    }
  }, []);

  const fetchMyAcceptedBookings = async () => {
    try {
      const res = await api.get('/api/fixed-routes/bookings/my-accepted/driver');
      setBookings(res.data.bookings || []);
    } catch (error) {
      toast.error('Failed to load your package rides');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async (bookingId) => {
    const result = await Swal.fire({
      title: 'Complete Package Ride?',
      text: 'Have you reached the destination and dropped the customer?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Complete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/api/fixed-routes/bookings/${bookingId}/complete-driver`, {});
        Swal.fire({
          title: 'Ride Completed!',
          text: 'The package ride has been marked as complete.',
          icon: 'success',
          confirmButtonColor: '#10b981'
        });
        fetchMyAcceptedBookings();
      } catch (error) {
        Swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to complete ride',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const handleStartRide = async (bookingId) => {
    const otp = otpInput[bookingId];
    if (!otp || otp.length !== 4) {
      return Swal.fire({
        title: 'Enter OTP',
        text: 'Please enter the 4-digit OTP provided by the customer to start the ride.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
    }
    try {
      await api.post(`/api/fixed-routes/bookings/${bookingId}/start-driver`, { otp });
      Swal.fire({
        title: 'Ride Started!',
        text: 'The package ride has started. Timer begins now.',
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
      setOtpInput(prev => ({ ...prev, [bookingId]: '' }));
      fetchMyAcceptedBookings();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to start ride. Check OTP.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Started') return b.status === 'Started';
    if (activeTab === 'Pending Payment') {
      return (b.paymentStatus === 'Pending' || b.paymentStatus === 'pending') && b.paymentMethod === 'Online';
    }
    if (activeTab === 'Cash Collected') {
      return b.paymentMethod === 'Cash' && b.status === 'Completed';
    }
    return b.status === activeTab;
  });

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            {activeTab === 'All' ? 'All Package Rides' : 
             activeTab === 'Accepted' ? 'Accepted Rides' : 
             activeTab === 'Completed' ? 'Completed Rides' : 
             activeTab === 'Pending Payment' ? 'Pending Payments' : 
             activeTab === 'Cancelled' ? 'Cancelled Rides' : 
             activeTab === 'Cash Collected' ? 'Cash Collected Rides' : 'My Package Rides'}
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            {activeTab === 'All' ? 'All your fixed package rides' : 
             activeTab === 'Accepted' ? 'Your currently accepted ongoing rides' : 
             activeTab === 'Completed' ? 'Rides that you have successfully completed' : 
             activeTab === 'Pending Payment' ? 'Rides waiting for online payment' : 
             activeTab === 'Cancelled' ? 'Rides that were cancelled' : 
             activeTab === 'Cash Collected' ? 'Completed rides where you collected cash' : 'Your accepted and completed fixed packages'}
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex flex-wrap bg-white p-1 rounded-xl border border-gray-200 shadow-sm gap-1">
          {['All', 'Accepted', 'Started', 'Completed', 'Pending Payment', 'Cancelled', 'Cash Collected'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${activeTab === tab ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
        {filteredBookings.map(booking => (
          <div key={booking._id} className="bg-white rounded-2xl p-0 shadow-sm border border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 group flex flex-col overflow-hidden relative">
            
            <div className={`absolute top-0 left-0 w-full h-1.5 ${booking.status === 'Completed' ? 'bg-emerald-500' : booking.status === 'Cancelled' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>

            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white mt-1">
              <div className="flex items-center space-x-2 text-gray-700 font-semibold">
                <FaCar className="text-indigo-500 text-lg" />
                <span className="truncate">{booking.carCategory?.name || 'Any Car'}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Trip Type */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border flex items-center gap-1 ${
                  booking.tripType === 'Round-Trip' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {booking.tripType === 'Round-Trip' ? <><FaRedo size={9}/> Round</> : <><FaArrowRight size={9}/> One-Way</>}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${booking.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : booking.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200' : booking.status === 'Started' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                  {booking.status}
                </span>
              </div>
            </div>

            <div className="p-6 flex-grow bg-white">
              <div className="relative pl-6 space-y-6 mb-8">
                <div className="absolute left-[0.4rem] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full"></div>
                
                <div className="relative">
                  <div className="absolute -left-[1.65rem] top-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-white z-10 shadow-sm"></div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Pickup Location</p>
                  <p className="text-gray-800 text-sm font-semibold line-clamp-2 leading-relaxed" title={booking.pickupLocation}>
                    {booking.pickupLocation}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[1.65rem] top-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-[3px] border-white z-10 shadow-sm"></div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Drop Location</p>
                  <p className="text-gray-800 text-sm font-semibold line-clamp-2 leading-relaxed" title={booking.dropLocation}>
                    {booking.dropLocation}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
                    <FaUserAlt className="mr-1.5 text-indigo-400" /> Customer
                  </div>
                  <div className="flex flex-col">
                    <p className="text-gray-800 font-bold text-sm truncate">
                        {booking.user?.name || 'Guest User'}
                    </p>
                    <p className="text-gray-500 text-xs flex items-center mt-1">
                        <FaPhoneAlt className="mr-1 text-[9px]"/> {booking.user?.phone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-br from-indigo-50/50 to-white rounded-xl p-4 border border-indigo-50">
                {/* Time limit info */}
                {booking.maxTimeHours > 0 && (
                  <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3">
                    <span className="text-orange-600 text-xs font-bold flex items-center gap-1.5">
                      <FaClock size={10}/> Limit: {booking.maxTimeHours} hrs
                    </span>
                    <span className="text-orange-500 text-xs font-semibold">+₹{booking.extraTimeChargePerHour}/hr extra</span>
                  </div>
                )}
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-indigo-900/60 font-bold uppercase tracking-wider">Your Earning</span>
                    <span className="text-2xl font-black text-emerald-600">
                      ₹{booking.price + (booking.extraTimeCharges || 0) + (booking.extraDistanceCharges || 0) - (booking.adminCommission || 0)}
                    </span>
                    {booking.extraTimeCharges > 0 && (
                      <span className="text-orange-500 text-[10px] font-semibold mt-0.5">
                        Base ₹{booking.price - booking.adminCommission} + Extra ₹{booking.extraTimeCharges}
                      </span>
                    )}
                  </div>
                  {booking.paymentMethod === 'Online' ? (
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border ${booking.paymentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'} flex flex-col items-center justify-center`}>
                      <span className="flex items-center gap-1.5"><FaMoneyBillWave /> {booking.paymentStatus === 'Completed' ? 'Paid Online' : 'Payment Pending (Online)'}</span>
                    </div>
                  ) : (
                    <div className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border bg-orange-50 text-orange-600 border-orange-200 flex flex-col items-center justify-center">
                      <span className="flex items-center gap-1.5"><FaMoneyBillWave /> Cash to Collect: ₹{booking.finalPrice > 0 ? booking.finalPrice : booking.price}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Start Ride Button - only for Accepted */}
            {booking.status === 'Accepted' && (
              <div className="p-5 bg-blue-50 border-t border-blue-100 mt-auto">
                <p className="text-xs text-blue-600 font-bold mb-2 flex items-center gap-1.5"><FaKey /> Enter Customer OTP to Start Ride</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4-digit OTP"
                    value={otpInput[booking._id] || ''}
                    onChange={(e) => setOtpInput(prev => ({ ...prev, [booking._id]: e.target.value }))}
                    className="flex-1 border border-blue-200 rounded-xl px-3 py-2.5 text-center text-lg font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <button
                    onClick={() => handleStartRide(booking._id)}
                    className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-600/20"
                  >
                    <FaArrowRight /> Start Ride
                  </button>
                </div>
              </div>
            )}

            {/* Complete Ride Button - only for Started */}
            {booking.status === 'Started' && (
              <div className="p-5 bg-gray-50 border-t border-gray-100 mt-auto">
                <button
                  onClick={() => handleCompleteRide(booking._id)}
                  className="w-full flex justify-center items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg shadow-emerald-500/20 group/btn"
                >
                  <FaCheckCircle className="group-hover/btn:scale-110 transition-transform" />
                  <span>Complete Ride</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <FaCar className="text-indigo-300 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No {activeTab} Packages</h3>
            <p className="text-gray-500 max-w-sm">
              {activeTab === 'Accepted' 
                ? "You haven't accepted any fixed package rides yet. Go to the marketplace to find new rides!"
                : "You haven't completed any package rides yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPackageRidesDriver;
