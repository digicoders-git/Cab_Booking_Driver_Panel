import React, { useState, useEffect } from "react";
import { getMarketplaceLeads, initiateAcceptAgentLeadPayment } from "../../api/agentLeadApi";
import { driverService } from "../../api/driverApi";
import Swal from "sweetalert2";
import { FaSyncAlt, FaMapMarkerAlt, FaUnlockAlt, FaWallet, FaRupeeSign, FaCalendarAlt, FaUserTie } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Marketplace() {
  const [leads, setLeads] = useState([]);
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
      const [leadsRes, walletRes] = await Promise.all([
        getMarketplaceLeads(),
        driverService.getWalletBalance()
      ]);

      if (leadsRes.success) {
        setLeads(leadsRes.leads || []);
      }
      if (walletRes.success) {
        setWalletBalance(walletRes.balance || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleAcceptLead = async (lead) => {
    const commission = lead.agentCommission;

    const result = await Swal.fire({
      title: 'Unlock this Lead?',
      html: `
        <div class="text-left mt-4 text-sm">
          <p class="mb-2"><strong>Total Fare:</strong> ₹${lead.totalPrice}</p>
          <p class="mb-2 text-red-600"><strong>Commission to Pay:</strong> ₹${commission}</p>
          <p class="mb-4 text-green-600"><strong>Your Earnings:</strong> ₹${lead.driverEarning}</p>
          <hr class="mb-4"/>
          <p class="text-xs text-gray-500 italic">You will be redirected to HDFC payment gateway to pay ₹${commission} online.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Pay Online & Unlock!'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'Initiating Payment...', text: 'Redirecting to secure gateway...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await initiateAcceptAgentLeadPayment(lead._id);
        
        if (res.success && res.paymentLinks && res.paymentLinks.web) {
          window.location.href = res.paymentLinks.web;
        } else {
          Swal.fire('Error!', res.message || 'Failed to initiate payment', 'error');
        }
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Server error or payment failed', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaUnlockAlt className="text-blue-600" /> Lead Marketplace
          </h1>
          <p className="text-sm text-gray-500">Find and unlock high-paying leads posted by Agents.</p>
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
        <div className="flex justify-center py-20"><FaSyncAlt className="animate-spin text-blue-500 text-3xl" /></div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <FaUnlockAlt className="mx-auto text-gray-300 text-4xl mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Leads Available</h3>
          <p className="text-gray-500 text-sm">There are no leads in the marketplace right now. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-blue-800">
                  <FaUserTie size={14} />
                  <span className="text-sm font-semibold truncate max-w-[150px]">
                    {lead.createdByAgent?.companyName || lead.createdByAgent?.name || 'Agent'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {lead.carCategory && (
                    <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2 py-1 rounded-md shadow-sm border border-gray-300">
                      {lead.carCategory.name}
                    </span>
                  )}
                  {lead.pickupDateTime && (
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded-full shadow-sm">
                      <FaCalendarAlt />
                      {new Date(lead.pickupDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Route */}
                <div className="space-y-3 relative">
                  <div className="absolute left-[9px] top-4 bottom-4 w-0.5 bg-gray-200"></div>
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-white shadow-sm">
                      <FaMapMarkerAlt className="text-green-600 text-[10px]" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{lead.pickup?.address}</p>
                  </div>
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-white shadow-sm">
                      <FaMapMarkerAlt className="text-red-600 text-[10px]" />
                    </div>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{lead.drop?.address}</p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Economics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Customer Pays</p>
                    <p className="text-lg font-bold text-gray-900">₹{lead.totalPrice}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <p className="text-xs text-green-700 mb-1">You Earn</p>
                    <p className="text-lg font-bold text-green-700">₹{lead.driverEarning}</p>
                  </div>
                </div>
              </div>

              {/* Footer / Action */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Unlock Fee</p>
                  <p className="text-sm font-bold text-red-600">-₹{lead.agentCommission}</p>
                </div>
                <button
                  onClick={() => handleAcceptLead(lead)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  Unlock Lead
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
