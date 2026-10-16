import React, { useState, useEffect } from 'react';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import { Car, MapPin, Calendar, Clock, Navigation, CheckCircle, XCircle } from 'lucide-react';

const AssignedSubscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyModalData, setHistoryModalData] = useState(null); // { subscription: object }

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const res = await driverService.getAssignedSubscriptions();
            if (res.success) {
                setSubscriptions(res.subscriptions);
            } else {
                toast.error(res.message || "Failed to fetch subscriptions");
            }
        } catch (error) {
            toast.error("Error fetching subscriptions");
        }
        setLoading(false);
    };

    const handleMarkAttendance = async (subscriptionId, tripType, status) => {
        const today = new Date().toISOString().split('T')[0];
        const loadingToast = toast.loading("Marking attendance...");
        try {
            const res = await driverService.markSubscriptionAttendance({
                subscriptionId,
                date: today,
                tripType,
                status
            });
            if (res.success) {
                toast.success(res.message, { id: loadingToast });
                fetchSubscriptions();
            } else {
                toast.error(res.message || "Failed to mark attendance", { id: loadingToast });
            }
        } catch (error) {
            toast.error("Error marking attendance", { id: loadingToast });
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Car className="text-blue-600" /> My Commute Passes
                </h1>
                <p className="text-gray-500 mt-1">Manage your daily assigned fixed-route passes.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : subscriptions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <Car className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No Subscriptions Assigned</h3>
                    <p className="text-gray-500 mt-1">You have not been assigned any monthly commute passes yet.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                    {subscriptions.map(sub => {
                        const today = new Date().toISOString().split('T')[0];
                        const todayLog = sub.dailyLogs?.find(log => log.date === today) || {
                            goTrip: { status: 'Pending' },
                            returnTrip: { status: 'Pending' }
                        };

                        return (
                            <div key={sub._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{sub.user?.name}</h3>
                                        <p className="text-sm text-gray-500">{sub.user?.phone}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                            {sub.plan?.name}
                                        </span>
                                        <button 
                                            onClick={() => setHistoryModalData(sub)}
                                            className="text-xs font-bold text-blue-600 hover:underline"
                                        >
                                            View History
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-5 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> Pick Time</p>
                                            <p className="font-semibold text-gray-900">{sub.pickupTime}</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> Drop Time</p>
                                            <p className="font-semibold text-gray-900">{sub.returnTime || '-'}</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> End Date</p>
                                            <p className="font-semibold text-gray-900">{new Date(sub.endDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]"></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Pickup Location</p>
                                                <p className="text-sm font-medium text-gray-800">{sub.pickup?.address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <MapPin size={12} className="mt-1 text-red-500 shrink-0 drop-shadow-sm" />
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Drop Location</p>
                                                <p className="text-sm font-medium text-gray-800">{sub.drop?.address}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Daily Attendance Section */}
                                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                                        <p className="text-sm font-bold text-gray-900 mb-3 text-center">Today's Duty ({today})</p>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Go Trip */}
                                            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                                                <p className="text-xs font-bold text-gray-600 mb-2">Morning / Go Trip</p>
                                                {todayLog.goTrip.status === 'Completed' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                        <CheckCircle size={14} /> Completed
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'goTrip', 'Completed')}
                                                            className="w-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-1.5 rounded transition-colors"
                                                        >
                                                            Mark Done
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'goTrip', 'Missed')}
                                                            className="w-full text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 py-1.5 rounded transition-colors"
                                                        >
                                                            Missed
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Return Trip */}
                                            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                                                <p className="text-xs font-bold text-gray-600 mb-2">Evening / Return Trip</p>
                                                {todayLog.returnTrip.status === 'Completed' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                        <CheckCircle size={14} /> Completed
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'returnTrip', 'Completed')}
                                                            className="w-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-1.5 rounded transition-colors"
                                                        >
                                                            Mark Done
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'returnTrip', 'Missed')}
                                                            className="w-full text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 py-1.5 rounded transition-colors"
                                                        >
                                                            Missed
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* History Modal */}
            {historyModalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="font-bold text-gray-900">Attendance History</h3>
                                <p className="text-xs text-gray-500">{historyModalData.user?.name}</p>
                            </div>
                            <button onClick={() => setHistoryModalData(null)} className="text-gray-400 hover:text-gray-700">&times;</button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {(!historyModalData.dailyLogs || historyModalData.dailyLogs.length === 0) ? (
                                <p className="text-center text-gray-500 py-8">No attendance history found.</p>
                            ) : (
                                <div className="space-y-3">
                                    {[...historyModalData.dailyLogs].reverse().map((log, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                            <p className="font-bold text-gray-800 mb-2">{log.date}</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Morning Trip</p>
                                                    {log.goTrip.status === 'Completed' ? (
                                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Completed</span>
                                                    ) : log.goTrip.status === 'Missed' ? (
                                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Missed</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Pending</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Evening Trip</p>
                                                    {log.returnTrip.status === 'Completed' ? (
                                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Completed</span>
                                                    ) : log.returnTrip.status === 'Missed' ? (
                                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Missed</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignedSubscriptions;
