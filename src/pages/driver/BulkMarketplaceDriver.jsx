import React, { useState, useEffect } from "react";
import { driverService } from "../../api/driverApi";
import Swal from "sweetalert2";
import { FaSyncAlt, FaMapMarkerAlt, FaUnlockAlt, FaWallet, FaRupeeSign, FaCalendarAlt, FaCar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function BulkMarketplaceDriver() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [bookingsRes, walletRes] = await Promise.all([
        driverService.getBulkMarketplace(),
        driverService.getWalletBalance()
      ]);

      if (bookingsRes.success) {
        setBookings(bookingsRes.bookings || []);
      }
      if (walletRes.success) {
        setWalletBalance(walletRes.walletBalance || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleAcceptDeal = async (booking) => {
    const displayPrice = booking.totalPriceWithTax || booking.offeredPrice;
    const securityAmount = booking.advancePayment?.amount || Math.round(displayPrice * 0.2); // approx logic if missing

    const result = await Swal.fire({
      title: 'Accept Bulk Deal?',
      html: `
        <div class="text-left mt-4 text-sm">
          <p class="mb-2"><strong>Total Deal Price:</strong> &#8377;${displayPrice}</p>
          <p class="mb-4 text-red-600"><strong>Advance Payment to Pay:</strong> &#8377;${securityAmount}</p>
          <hr class="mb-4"/>
          <p class="text-xs text-gray-500 italic">This advance amount is required to secure the deal. You will be redirected to the payment page.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Accept Deal!'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'Processing...', text: 'Securing your deal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await driverService.acceptBulkDeal(booking._id);
        
        if (res.success && res.paymentLinks) {
          window.location.href = res.paymentLinks.web;
        } else if (res.success) {
          Swal.fire('Success!', 'Bulk deal accepted successfully! Find it in Accepted Bulk Deals.', 'success');
          fetchData();
        } else {
          Swal.fire('Error!', res.message || 'Failed to accept deal', 'error');
        }
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Server error or wallet limit reached', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaCar className="text-blue-600" /> Bulk Deals Marketplace
          </h1>
          <p className="text-sm text-gray-500">Find and accept 1-car bulk bookings matching your vehicle.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
            <FaWallet className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">Wallet:</span>
            <span className={`text-sm font-bold ${walletBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>₹{walletBalance.toFixed(2)}</span>
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 bg-white text-gray-600 border border-gray-200 shadow-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FaSyncAlt size={16} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 h-64 animate-pulse shadow-sm border border-gray-100"></div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center">
          <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-state-2130362-1800926.png" alt="Empty" className="w-48 h-48 opacity-50 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No Bulk Deals Available</h3>
          <p className="text-gray-500 mt-2">There are currently no bulk deals matching your car category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map(booking => (
            <div key={booking._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-bl-xl border-b border-l border-blue-100">
                {booking.tripType}
              </div>
              
              <div className="flex justify-between items-start mb-4 mt-2">
                <div>
                  <div className="text-2xl font-black text-gray-900 flex items-center gap-1">
                    <FaRupeeSign className="text-gray-400 text-lg" />
                    {booking.totalPriceWithTax || booking.offeredPrice}
                  </div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Total Deal Value</div>
                </div>
              </div>

              <div className="space-y-3 mb-6 relative">
                <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200 z-0"></div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-white shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Pickup</p>
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{booking.pickup.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-white shadow-sm">
                    <FaMapMarkerAlt className="text-red-500 text-[10px]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Drop</p>
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{booking.drop.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 py-4 border-y border-gray-100 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    <FaCalendarAlt className="text-gray-400 text-xs" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pickup Date</p>
                    <p className="text-xs font-semibold text-gray-700">{new Date(booking.pickupDateTime).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6 p-3 bg-gray-50 rounded-xl">
                 <p className="text-xs text-gray-500 font-medium">Customer Contact: <span className="text-gray-400 italic">Hidden until accepted</span></p>
              </div>

              <button
                onClick={() => handleAcceptDeal(booking)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                Accept Deal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
