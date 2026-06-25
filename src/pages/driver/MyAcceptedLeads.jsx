import React, { useState, useEffect } from "react";
import { getMyAcceptedLeads, completeAgentLead, downloadAgentLeadReceipt, downloadDriverCommissionReceipt } from "../../api/agentLeadApi";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { FaSyncAlt, FaMapMarkerAlt, FaCheckCircle, FaRupeeSign, FaCalendarAlt, FaUserTie, FaPhoneAlt, FaDownload, FaFileInvoiceDollar } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

export default function MyAcceptedLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();

    // Check for HDFC payment return params
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("success") === "true") {
      Swal.fire('Payment Successful!', 'You have successfully paid the commission and unlocked the lead.', 'success');
      // Clean up URL
      navigate('/driver/my-accepted-leads', { replace: true });
    } else if (queryParams.get("error")) {
      Swal.fire('Payment Error!', queryParams.get("error"), 'error');
      // Clean up URL
      navigate('/driver/my-accepted-leads', { replace: true });
    }
  }, [location, navigate]);

  const fetchLeads = async () => {
    try {
      setFetching(true);
      const res = await getMyAcceptedLeads();
      if (res.success) {
        setLeads(res.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleCompleteLead = async (leadId) => {
    const result = await Swal.fire({
      title: 'Complete this Trip?',
      text: "Only mark as complete if you have successfully dropped the customer.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Mark Complete!'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'Completing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await completeAgentLead(leadId);
        
        if (res.success) {
          Swal.fire('Completed!', 'Trip marked as completed successfully. Escrow has been settled.', 'success');
          fetchLeads(); // Refresh list
        } else {
          Swal.fire('Error!', res.message || 'Failed to complete', 'error');
        }
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Server error', 'error');
      }
    }
  };

  const handleDownloadReceipt = async (leadId) => {
    try {
      toast.loading("Generating receipt...");
      const blob = await downloadAgentLeadReceipt(leadId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KwikCabs_Receipt_${leadId.toString().slice(-6).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Customer receipt downloaded successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("Receipt generation failed:", error);
      toast.error("Failed to download customer receipt.");
    }
  };

  const handleDownloadCommissionReceipt = async (leadId) => {
    try {
      toast.loading("Generating commission receipt...");
      const blob = await downloadDriverCommissionReceipt(leadId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KwikCabs_Commission_${leadId.toString().slice(-6).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Commission receipt downloaded successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("Commission Receipt generation failed:", error);
      toast.error("Failed to download commission receipt.");
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Completed') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'Accepted' || status === 'Ongoing') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaCheckCircle className="text-green-500" /> My Accepted Leads
          </h1>
          <p className="text-sm text-gray-500">Manage and complete the marketplace leads you've unlocked.</p>
        </div>
        <button
          onClick={fetchLeads}
          className="p-2.5 bg-white text-gray-600 border border-gray-200 shadow-sm rounded-xl hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <FaSyncAlt size={16} className={fetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <FaSyncAlt className="animate-spin text-blue-500 text-3xl mb-4" />
              <p>Loading your leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FaCheckCircle className="mx-auto text-gray-300 text-4xl mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Accepted Leads</h3>
              <p className="text-sm">You haven't unlocked any leads from the marketplace yet.</p>
            </div>
          ) : (
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Info</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Details</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Financials</th>
                  <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Date & Status */}
                    <td className="py-4 px-6 align-top">
                      {lead.pickupDateTime && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mb-2">
                          <FaCalendarAlt className="text-blue-500" />
                          {new Date(lead.pickupDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>

                    {/* Customer Info (Unmasked now!) */}
                    <td className="py-4 px-6 align-top">
                      <p className="text-sm font-bold text-gray-900 mb-1">{lead.customerName || 'Customer'}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                        <FaPhoneAlt className="text-gray-400" />
                        <a href={`tel:${lead.customerPhone}`} className="hover:text-blue-600 hover:underline">
                          {lead.customerPhone || 'N/A'}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FaUserTie className="text-gray-400" />
                        <span>Agent: {lead.createdByAgent?.companyName || lead.createdByAgent?.name || 'Unknown'}</span>
                      </div>
                    </td>

                    {/* Route Details */}
                    <td className="py-4 px-6 min-w-[250px] align-top">
                      <div className="space-y-3 relative ml-1">
                        <div className="absolute left-[3px] top-3 bottom-3 w-0.5 bg-gray-200"></div>
                        <div className="flex items-start gap-3 relative z-10">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5 ring-4 ring-green-100"></div>
                          <p className="text-xs font-medium text-gray-700 line-clamp-2">{lead.pickup?.address}</p>
                        </div>
                        <div className="flex items-start gap-3 relative z-10">
                          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5 ring-4 ring-red-100"></div>
                          <p className="text-xs font-medium text-gray-700 line-clamp-2">{lead.drop?.address}</p>
                        </div>
                      </div>
                    </td>

                    {/* Financials */}
                    <td className="py-4 px-6 align-top">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Total Cash to Collect:</span>
                          <span className="font-bold text-gray-900">₹{lead.totalPrice}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Paid Commission:</span>
                          <span className="font-semibold text-red-600">-₹{lead.agentCommission}</span>
                        </div>
                        <div className="pt-2 mt-1 border-t border-gray-200 flex justify-between text-xs">
                          <span className="font-medium text-gray-900">Net Earnings:</span>
                          <span className="font-bold text-green-600">₹{lead.driverEarning}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center align-top space-y-2">
                      <button
                        onClick={() => handleDownloadReceipt(lead._id)}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <FaDownload /> Download Receipt
                      </button>

                      {lead.status !== 'Completed' && lead.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleCompleteLead(lead._id)}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 mt-4"
                        >
                          <FaCheckCircle /> Complete Trip
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
