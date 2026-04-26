import React, { useState, useEffect } from 'react';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import { 
    FaLayerGroup, FaCalendarAlt, FaMapMarkerAlt, FaCar, 
    FaClock, FaChevronRight, FaInfoCircle 
} from 'react-icons/fa';
import { MapPin, Navigation, Calendar, Clock, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ScheduledJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const res = await driverService.getAssignedBulkBookings();
            if (res.success) {
                setJobs(res.assignments || []);
            }
        } catch (err) {
            toast.error("Failed to load scheduled jobs");
        } finally {
            setLoading(false);
        }
    };

    const handleStartTrip = async (bookingId) => {
        const { value: otp } = await Swal.fire({
            title: 'Enter OTP',
            input: 'text',
            inputLabel: 'Rider se 4-digit OTP maangein',
            inputPlaceholder: '1234',
            showCancelButton: true,
            confirmButtonText: 'Start Trip',
            confirmButtonColor: '#2563eb'
        });

        if (!otp) return;

        try {
            setLoading(true);
            const res = await driverService.startBulkAssignment(bookingId, otp);
            if (res.success) {
                toast.success("Trip started successfully!");
                fetchJobs();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleEndTrip = async (bookingId) => {
        const result = await Swal.fire({
            title: 'End Trip?',
            text: "Kya aapne trip poori kar li hai?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, End Trip',
            confirmButtonColor: '#10b981'
        });

        if (!result.isConfirmed) return;

        try {
            setLoading(true);
            let res = await driverService.endBulkAssignment(bookingId);
            
            // If it's the last driver, handle payment mode selection
            if (!res.success && res.isLastDriver) {
                const { value: mode } = await Swal.fire({
                    title: 'Last Car Payment',
                    html: `
                        <div class="text-left space-y-4">
                            <p class="text-gray-600">Aap aakhri driver hain. Deal poori karne ke liye baki ka payment confirm karein.</p>
                            <div class="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                <span class="text-sm text-blue-600 block">Remaining Balance</span>
                                <span class="text-2xl font-black text-blue-800">₹${res.remainingBalance}</span>
                            </div>
                            <p class="text-xs font-bold text-gray-400 uppercase">Select Payment Mode:</p>
                        </div>
                    `,
                    input: 'radio',
                    inputOptions: {
                        'Cash': 'Cash Received (Hath mein paisa liya)',
                        'Online': 'Online Paid (Razorpay/Link)'
                    },
                    inputValidator: (value) => {
                        if (!value) return 'Please select a payment mode!'
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Finalize & End Deal',
                    confirmButtonColor: '#2563eb'
                });

                if (mode) {
                    res = await driverService.endBulkAssignment(bookingId, mode);
                    if (res.success) {
                        toast.success("Bulk Deal successfully completed and settled!");
                    }
                }
            } else if (res.success) {
                toast.success("Your trip completed!");
            }
            
            fetchJobs();
        } catch (err) {
            const errorData = err.response?.data;
            
            // If backend says this is the last driver and needs payment mode
            if (errorData?.isLastDriver) {
                const { value: mode } = await Swal.fire({
                    title: '<span class="text-2xl font-black text-gray-800">Final Settlement</span>',
                    html: `
                        <div class="text-left space-y-5 mt-4">
                            <p class="text-gray-500 text-sm leading-relaxed">Aap aakhri driver hain. Is deal ko poora karne ke liye baki bacha hua payment confirm karein.</p>
                            
                            <div class="p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-center shadow-lg shadow-blue-200">
                                <span class="text-[10px] font-bold text-blue-100 uppercase tracking-[0.2em] block mb-1">Remaining Balance</span>
                                <span class="text-4xl font-black text-white">₹${errorData.remainingBalance}</span>
                            </div>

                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Payment Mode:</p>
                                
                                <div id="swal-custom-options" class="grid grid-cols-1 gap-3">
                                    <label class="relative flex items-center p-4 bg-gray-50 border-2 border-transparent rounded-2xl cursor-pointer hover:bg-gray-100 transition-all group has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                                        <input type="radio" name="paymentMode" value="Cash" class="hidden" checked>
                                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-has-[:checked]:bg-blue-600 group-has-[:checked]:text-white transition-colors">
                                            <i class="fas fa-money-bill-wave"></i>
                                        </div>
                                        <div class="ml-4">
                                            <p class="text-sm font-bold text-gray-800">Cash Received</p>
                                            <p class="text-[10px] text-gray-500">Paisa hath mein le liya hai</p>
                                        </div>
                                        <div class="ml-auto w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center group-has-[:checked]:border-blue-600 group-has-[:checked]:bg-blue-600">
                                            <div class="w-2 h-2 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100"></div>
                                        </div>
                                    </label>

                                    <label class="relative flex items-center p-4 bg-gray-50 border-2 border-transparent rounded-2xl cursor-pointer hover:bg-gray-100 transition-all group has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                                        <input type="radio" name="paymentMode" value="Online" class="hidden">
                                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-has-[:checked]:bg-blue-600 group-has-[:checked]:text-white transition-colors">
                                            <i class="fas fa-globe"></i>
                                        </div>
                                        <div class="ml-4">
                                            <p class="text-sm font-bold text-gray-800">Online Paid</p>
                                            <p class="text-[10px] text-gray-500">Razorpay / QR Code / Link</p>
                                        </div>
                                        <div class="ml-auto w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center group-has-[:checked]:border-blue-600 group-has-[:checked]:bg-blue-600">
                                            <div class="w-2 h-2 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    `,
                    preConfirm: () => {
                        const selected = document.querySelector('input[name="paymentMode"]:checked');
                        if (!selected) {
                            Swal.showValidationMessage('Ek mode select karna zaroori hai!');
                        }
                        return selected.value;
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Confirm & Complete Deal',
                    confirmButtonColor: '#2563eb',
                    cancelButtonText: 'Dismiss',
                    customClass: {
                        popup: 'rounded-[2rem] p-8',
                        confirmButton: 'rounded-2xl px-8 py-4 font-bold text-sm shadow-xl shadow-blue-200 w-full mt-2',
                        cancelButton: 'rounded-2xl px-8 py-4 font-bold text-sm w-full'
                    },
                    buttonsStyling: true
                });

                if (mode) {
                    try {
                        setLoading(true);
                        const finalRes = await driverService.endBulkAssignment(bookingId, mode);
                        
                        // IF ONLINE: Handle Razorpay Checkout
                        if (finalRes.success && finalRes.isOnlinePayment) {
                            const loadRazorpay = () => {
                                return new Promise((resolve) => {
                                    const script = document.createElement('script');
                                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                                    script.onload = () => resolve(true);
                                    script.onerror = () => resolve(false);
                                    document.body.appendChild(script);
                                });
                            };

                            const resScript = await loadRazorpay();
                            if (!resScript) {
                                toast.error("Razorpay SDK failed to load. Check internet.");
                                return;
                            }

                            const options = {
                                key: finalRes.key_id,
                                amount: finalRes.amount * 100,
                                currency: "INR",
                                name: "KwikCabs Bulk",
                                description: `Final Payment for Booking #${finalRes.bookingId.slice(-6)}`,
                                order_id: finalRes.razorpayOrderId,
                                handler: async (response) => {
                                    console.log("✅ Driver Final Payment Razorpay Success:", response);
                                    try {
                                        // Verify final payment
                                        const verifyRes = await driverService.verifyBulkPayment({
                                            bookingId: finalRes.bookingId,
                                            paymentId: response.razorpay_payment_id,
                                            type: 'final'
                                        });
                                        console.log("📡 Backend Final Verification Result:", verifyRes);
                                        if (verifyRes.success) {
                                            Swal.fire('Success', 'Payment Verified! Bulk Deal Completed.', 'success');
                                            fetchJobs();
                                        }
                                    } catch (err) {
                                        console.error("❌ Final Payment Verification Error:", err);
                                        toast.error("Payment verification failed.");
                                    }
                                },
                                theme: { color: "#2563eb" },
                                modal: {
                                    onDismiss: function() {
                                        console.log("⚠️ RAZORPAY STATUS: CANCELLED (Modal Dismissed)");
                                        toast.info("Payment cancelled");
                                    }
                                }
                            };

                            const rzp1 = new window.Razorpay(options);

                            rzp1.on('payment.failed', function (response) {
                                console.log("❌ RAZORPAY STATUS: FAILED");
                                console.error("Reason:", response.error.description);
                                console.error("Error Code:", response.error.code);
                            });

                            console.log("🚀 RAZORPAY STATUS: MODAL OPENING...");
                            rzp1.open();
                        } else if (finalRes.success) {
                            toast.success("Bulk Deal successfully completed and settled!");
                            fetchJobs();
                        }
                    } catch (finalErr) {
                        toast.error(finalErr.response?.data?.message || "Final step failed");
                    }
                }
            } else {
                toast.error(errorData?.message || "Failed to end trip");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <FaLayerGroup size={20} />
                        </div>
                        Scheduled Bulk Jobs
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">View and manage your upcoming fleet assignments</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-sm font-bold text-blue-600">{jobs.length} Active Assignments</span>
                </div>
            </div>

            {/* Content */}
            {jobs.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="text-gray-300" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Scheduled Jobs</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Aapke paas abhi koi aane wali bulk booking nahi hai. Jab Fleet Owner aapko assign karega, wo yahan dikhegi.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {jobs.map((job) => (
                        <div key={job._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group">
                            <div className="flex flex-col lg:flex-row">
                                {/* Date Section */}
                                <div className={`lg:w-48 p-6 flex flex-col items-center justify-center text-white shrink-0 ${
                                    job.myStatus === 'Ongoing' ? 'bg-green-600' : 
                                    job.myStatus === 'Completed' ? 'bg-gray-400' : 'bg-blue-600'
                                }`}>
                                    <span className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">
                                        {new Date(job.pickupDateTime).toLocaleString('default', { month: 'short' })}
                                    </span>
                                    <span className="text-5xl font-black">{new Date(job.pickupDateTime).getDate()}</span>
                                    <span className="text-sm font-medium mt-1">
                                        {job.myStatus}
                                    </span>
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 p-6 space-y-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                Bulk Trip
                                            </span>
                                            <span className="text-xs font-bold text-gray-400">ID: #{job._id.slice(-8)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-green-600 font-bold">
                                            <DollarSign size={16} />
                                            <span className="text-lg">₹{job.offeredPrice?.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Route */}
                                    <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-dashed before:bg-gray-200 before:border-l-2 before:border-dashed">
                                        <div className="relative">
                                            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-blue-50 border-2 border-blue-600 flex items-center justify-center z-10">
                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pickup Point</p>
                                            <p className="text-sm font-bold text-gray-900 leading-tight">{job.pickup?.address}</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center z-10">
                                                <MapPin size={12} className="text-red-500" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p>
                                            <p className="text-sm font-bold text-gray-900 leading-tight">{job.drop?.address}</p>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="pt-6 border-t border-gray-50 flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Clock size={14} /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Start Time</p>
                                                <p className="text-xs font-bold text-gray-900">{new Date(job.pickupDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><FaCar size={14} /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Assigned Car</p>
                                                <p className="text-xs font-bold text-gray-900">{job.myCar?.carNumber} ({job.myCar?.carModel})</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Section */}
                                <div className="lg:w-48 p-6 flex flex-col justify-center gap-3 bg-gray-50 border-l border-gray-100">
                                    {job.myStatus === 'Pending' && (
                                        <button 
                                            className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all"
                                            onClick={() => handleStartTrip(job._id)}
                                        >
                                            Start Trip
                                        </button>
                                    )}
                                    {job.myStatus === 'Ongoing' && (
                                        <button 
                                            className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-95 transition-all"
                                            onClick={() => handleEndTrip(job._id)}
                                        >
                                            End Trip
                                        </button>
                                    )}
                                    {job.myStatus === 'Completed' && (
                                        <div className="text-center py-2 bg-gray-100 rounded-xl text-gray-500 text-xs font-bold">
                                            Finished
                                        </div>
                                    )}
                                    <button 
                                        className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                        onClick={() => toast.info("Full route details will be available on the day of trip.")}
                                    >
                                        <FaInfoCircle /> Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
