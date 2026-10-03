import React, { useState, useEffect } from 'react';
import api from '../api/index';
import { toast } from 'sonner';
import { FaCar, FaClock, FaUserAlt, FaCheckCircle, FaPhoneAlt, FaMoneyBillWave, FaArrowRight, FaRedo, FaKey, FaUserTie, FaInfoCircle } from 'react-icons/fa';
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
        {filteredBookings.map(booking => {
          const isAgentBooking = booking.bookedByModel === 'Agent' || !!booking.agent;
          const customerName = booking.customerName || booking.user?.name || 'Customer';
          const customerPhone = booking.customerPhone || booking.user?.phone || '';
          const driverEarning = (booking.price || 0) + (booking.extraTimeCharges || 0) + (booking.extraDistanceCharges || 0) - (booking.adminCommission || 0);
          const collectAmount = booking.finalPrice > 0 ? booking.finalPrice : (booking.totalWithTax || booking.price || 0);

          return (
            <div key={booking._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative group">
              
              {/* Top Accent Line */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                booking.status === 'Completed' ? 'bg-emerald-500' :
                booking.status === 'Cancelled' ? 'bg-rose-500' :
                booking.status === 'Started' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600'
              }`}></div>

              {/* Card Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 bg-slate-50/50 mt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <FaCar size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base leading-tight">
                      {booking.carCategory?.name || 'Package Ride'}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-400 font-bold">
                      #{booking._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {isAgentBooking && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 shadow-sm">
                        <FaUserTie size={10} /> Agent Ride
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                      booking.tripType === 'Round-Trip' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {booking.tripType === 'Round-Trip' ? <><FaRedo size={8}/> Round</> : <><FaArrowRight size={8}/> One-Way</>}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                    booking.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    booking.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    booking.status === 'Started' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      booking.status === 'Started' || booking.status === 'Accepted' ? 'bg-blue-600 animate-pulse' :
                      booking.status === 'Completed' ? 'bg-emerald-600' : 'bg-rose-500'
                    }`} />
                    {booking.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                {/* Route Timeline */}
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-[0.45rem] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-gray-200 to-rose-400"></div>

                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Pickup Location</p>
                    <p className="text-gray-900 text-xs font-bold line-clamp-2 leading-snug mt-0.5" title={booking.pickupLocation}>
                      {booking.pickupLocation}
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-100"></div>
                    <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Drop Location</p>
                    <p className="text-gray-900 text-xs font-bold line-clamp-2 leading-snug mt-0.5" title={booking.dropLocation}>
                      {booking.dropLocation}
                    </p>
                  </div>
                </div>

                {/* Schedule & Limits */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <FaClock className="text-blue-500" /> Pickup Schedule
                    </p>
                    <p className="text-xs font-black text-slate-800 mt-1">
                      {new Date(booking.pickupDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • <span className="text-blue-600">{booking.pickupTime}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <FaRedo className="text-purple-500" /> Package Limit
                    </p>
                    <p className="text-xs font-black text-slate-800 mt-1 truncate">
                      {booking.maxTimeHours > 0 ? `${booking.maxTimeHours} Hrs (+₹${booking.extraTimeChargePerHour}/hr)` : 'Standard Route'}
                    </p>
                  </div>
                </div>

                {/* Contact Cards Section */}
                <div className="space-y-2">
                  {/* Passenger Card */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                        <FaUserAlt size={12} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Passenger</p>
                        <p className="text-xs font-black text-gray-900 truncate">
                          {customerName}
                        </p>
                      </div>
                    </div>
                    {customerPhone ? (
                      <a
                        href={`tel:${customerPhone}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                        title="Call Customer"
                      >
                        <FaPhoneAlt size={10} /> {customerPhone}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold">No Phone</span>
                    )}
                  </div>

                  {/* Agent Card (If Booked by Agent) */}
                  {isAgentBooking && (
                    <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                          <FaUserTie size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Booked By Agent</p>
                          <p className="text-xs font-black text-gray-900 truncate">
                            {booking.agent?.name || 'Authorized Agent'}
                          </p>
                        </div>
                      </div>
                      {booking.agent?.phone ? (
                        <a
                          href={`tel:${booking.agent.phone}`}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                          title="Call Agent"
                        >
                          <FaPhoneAlt size={10} /> {booking.agent.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 font-semibold">No Phone</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Earnings & Payment Summary Bar */}
                <div className="rounded-xl p-3 bg-gradient-to-r from-slate-50 via-slate-50 to-indigo-50/30 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Payout</span>
                    <p className="text-2xl font-black text-emerald-600 leading-tight">
                      ₹{driverEarning}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Fare: ₹{booking.price} • Comm: -₹{booking.adminCommission}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {booking.paymentMethod === 'Cash' ? (
                      <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                        <FaMoneyBillWave size={12} /> Cash: ₹{collectAmount}
                      </div>
                    ) : (
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                        booking.paymentStatus === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <FaMoneyBillWave size={12} /> {booking.paymentStatus === 'Completed' ? 'Paid Online' : 'Online (Pending)'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Toll Notice */}
                <div className="mt-3 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-left">
                  <FaInfoCircle className="text-amber-500 text-xs mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 font-medium leading-snug">
                    <span className="font-bold text-amber-900">Note:</span> Toll charges fare mein include nahi hain. Toll passenger se alag se collect karein.
                  </p>
                </div>
              </div>

              {/* Start Ride Button - only for Accepted */}
              {booking.status === 'Accepted' && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-blue-900 font-bold flex items-center gap-1.5">
                      <FaKey className="text-blue-600" /> Enter Start OTP:
                    </p>
                    <span className="text-[11px] text-blue-600 font-semibold">Ask passenger for OTP</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="••••"
                      value={otpInput[booking._id] || ''}
                      onChange={(e) => setOtpInput(prev => ({ ...prev, [booking._id]: e.target.value }))}
                      className="w-32 border border-blue-200 rounded-xl px-2 py-2 text-center text-lg font-mono font-black tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-inner"
                    />
                    <button
                      onClick={() => handleStartRide(booking._id)}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-3 rounded-xl transition-all shadow-md shadow-blue-500/25 active:scale-95 text-xs"
                    >
                      <FaArrowRight /> Start Ride
                    </button>
                  </div>
                </div>
              )}

              {/* Complete Ride Button - only for Started */}
              {booking.status === 'Started' && (
                <div className="p-4 bg-emerald-50 border-t border-emerald-100 mt-auto">
                  <button
                    onClick={() => handleCompleteRide(booking._id)}
                    className="w-full flex justify-center items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-md shadow-emerald-500/20 active:scale-95 text-sm"
                  >
                    <FaCheckCircle className="transition-transform" />
                    <span>Complete Ride</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

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
