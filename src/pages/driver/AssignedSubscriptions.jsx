import React, { useState, useEffect } from 'react';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import { Car, MapPin, Calendar, Clock, Navigation, CheckCircle, XCircle, CheckCircle2, Check, X, AlertCircle } from 'lucide-react';

const AssignedSubscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyModalData, setHistoryModalData] = useState(null); // { subscription: object }
    const [historyFilter, setHistoryFilter] = useState('all');

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
            toast.error(error?.message || "Error fetching subscriptions");
        }
        setLoading(false);
    };

    const handleMarkAttendance = async (subscriptionId, tripType, status) => {
        if (status === 'Completed') {
            const confirmed = window.confirm("Kya aap ride ko End & Complete karna chahte hain?");
            if (!confirmed) return;
        }
        if (status === 'Missed') {
            const confirmed = window.confirm("Kya aap sach me is ride ko Missed mark karna chahte hain?");
            if (!confirmed) return;
        }

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
            toast.error(error.response?.data?.message || "Error marking attendance", { id: loadingToast });
        }
    };

    // Generate full calendar register from startDate to endDate
    const getRegisterDays = (sub) => {
        if (!sub || !sub.startDate || !sub.endDate) return [];
        const days = [];
        
        const cleanStart = typeof sub.startDate === 'string' ? sub.startDate.split('T')[0] : new Date(sub.startDate).toISOString().split('T')[0];
        const cleanEnd = typeof sub.endDate === 'string' ? sub.endDate.split('T')[0] : new Date(sub.endDate).toISOString().split('T')[0];
        
        const [sy, sm, sd] = cleanStart.split('-').map(Number);
        const [ey, em, ed] = cleanEnd.split('-').map(Number);
        
        let cur = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        
        const todayStr = new Date().toISOString().split('T')[0];
        let dayCounter = 1;

        while (cur <= end) {
            const year = cur.getFullYear();
            const month = String(cur.getMonth() + 1).padStart(2, '0');
            const day = String(cur.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const log = sub.dailyLogs?.find(l => l.date === dateStr);

            const formatTrip = (trip, scheduledTime) => {
                if (trip?.status === 'Completed') {
                    return {
                        status: 'Completed',
                        label: 'Present',
                        time: trip.completedAt ? new Date(trip.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : scheduledTime
                    };
                }
                if (trip?.status === 'Started') {
                    return {
                        status: 'Started',
                        label: 'In Progress',
                        time: trip.startedAt ? new Date(trip.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : scheduledTime
                    };
                }
                if (trip?.status === 'Missed') {
                    return {
                        status: 'Missed',
                        label: 'Absent (Missed)',
                        time: scheduledTime
                    };
                }
                if (dateStr < todayStr) {
                    return {
                        status: 'Absent',
                        label: 'Absent (No Show)',
                        time: scheduledTime
                    };
                }
                if (dateStr === todayStr) {
                    return {
                        status: 'Pending',
                        label: 'Scheduled Today',
                        time: scheduledTime
                    };
                }
                return {
                    status: 'Upcoming',
                    label: 'Upcoming',
                    time: scheduledTime
                };
            };

            const goTripInfo = formatTrip(log?.goTrip, sub.pickupTime);
            const returnTripInfo = sub.returnTime ? formatTrip(log?.returnTrip, sub.returnTime) : null;

            // Day Status Calculation
            let dayStatus = 'Upcoming';
            let filterType = 'upcoming';

            if (dateStr > todayStr) {
                dayStatus = 'Upcoming';
                filterType = 'upcoming';
            } else if (dateStr === todayStr) {
                const isGoComplete = goTripInfo.status === 'Completed';
                const isReturnComplete = returnTripInfo ? returnTripInfo.status === 'Completed' : true;
                if (isGoComplete && isReturnComplete) {
                    dayStatus = 'Present';
                    filterType = 'present';
                } else if (goTripInfo.status === 'Started' || returnTripInfo?.status === 'Started') {
                    dayStatus = 'In Progress';
                    filterType = 'present';
                } else {
                    dayStatus = 'Today Scheduled';
                    filterType = 'upcoming';
                }
            } else {
                // Past day
                const isGoPresent = goTripInfo.status === 'Completed';
                const isReturnPresent = returnTripInfo ? returnTripInfo.status === 'Completed' : true;
                if (isGoPresent && isReturnPresent) {
                    dayStatus = 'Present';
                    filterType = 'present';
                } else if (isGoPresent || (returnTripInfo && isReturnPresent)) {
                    dayStatus = 'Half Day';
                    filterType = 'present';
                } else {
                    dayStatus = 'Absent';
                    filterType = 'absent';
                }
            }

            const formattedDate = cur.toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            days.push({
                dayNumber: dayCounter++,
                date: dateStr,
                formattedDate,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr,
                isFuture: dateStr > todayStr,
                goTrip: goTripInfo,
                returnTrip: returnTripInfo,
                dayStatus,
                filterType
            });

            cur.setDate(cur.getDate() + 1);
        }

        return days;
    };

    const registerDays = historyModalData ? getRegisterDays(historyModalData) : [];
    const totalDays = registerDays.length;
    const presentDays = registerDays.filter(d => d.dayStatus === 'Present' || d.dayStatus === 'Half Day').length;
    const absentDays = registerDays.filter(d => d.dayStatus === 'Absent').length;
    const upcomingDays = registerDays.filter(d => d.filterType === 'upcoming').length;
    const pastDaysCount = presentDays + absentDays;
    const attendanceRate = pastDaysCount > 0 ? Math.round((presentDays / pastDaysCount) * 100) : 100;

    const filteredRegister = registerDays.filter(d => {
        if (historyFilter === 'present') return d.filterType === 'present';
        if (historyFilter === 'absent') return d.filterType === 'absent';
        if (historyFilter === 'upcoming') return d.filterType === 'upcoming';
        return true;
    });

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
                                            onClick={() => { setHistoryModalData(sub); setHistoryFilter('all'); }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-300 font-bold text-xs rounded-lg shadow-xs transition-all"
                                        >
                                            <Calendar size={12} /> View Report
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
                                                ) : todayLog.goTrip.status === 'Started' ? (
                                                    <div className="flex flex-col gap-2">
                                                        <span className="inline-flex items-center justify-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded animate-pulse">
                                                            🚕 In Progress
                                                        </span>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'goTrip', 'Completed')}
                                                            className="w-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 rounded transition-colors shadow-sm"
                                                        >
                                                            End & Complete
                                                        </button>
                                                    </div>
                                                ) : todayLog.goTrip.status === 'Missed' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                        ❌ Missed
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'goTrip', 'Started')}
                                                            className="w-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 rounded transition-colors shadow-sm"
                                                        >
                                                            Start Ride
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'goTrip', 'Missed')}
                                                            className="w-full text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 py-1 rounded transition-colors"
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
                                                ) : todayLog.returnTrip.status === 'Started' ? (
                                                    <div className="flex flex-col gap-2">
                                                        <span className="inline-flex items-center justify-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded animate-pulse">
                                                            🚕 In Progress
                                                        </span>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'returnTrip', 'Completed')}
                                                            className="w-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 rounded transition-colors shadow-sm"
                                                        >
                                                            End & Complete
                                                        </button>
                                                    </div>
                                                ) : todayLog.returnTrip.status === 'Missed' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                        ❌ Missed
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'returnTrip', 'Started')}
                                                            className="w-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 rounded transition-colors shadow-sm"
                                                        >
                                                            Start Ride
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkAttendance(sub._id, 'returnTrip', 'Missed')}
                                                            className="w-full text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 py-1 rounded transition-colors"
                                                        >
                                                            Missed
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar: View Attendance Report Button */}
                                    <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                            <CheckCircle size={13} className="text-emerald-500" />
                                            {sub.dailyLogs?.filter(l => l.goTrip?.status === 'Completed' || l.returnTrip?.status === 'Completed').length || 0} Days Completed
                                        </span>
                                        <button 
                                            onClick={() => { setHistoryModalData(sub); setHistoryFilter('all'); }}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                                        >
                                            <Calendar size={13} /> View Attendance Report
                                        </button>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Attendance Register Modal */}
            {historyModalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-blue-500/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-400/30">
                                        Commute Pass Register
                                    </span>
                                    <span className="text-xs text-gray-300 font-medium">
                                        {historyModalData.plan?.name}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    {historyModalData.user?.name}
                                    <span className="text-sm font-normal text-gray-300">({historyModalData.user?.phone})</span>
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-300">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={13} className="text-blue-400" />
                                        {new Date(historyModalData.startDate).toLocaleDateString()} - {new Date(historyModalData.endDate).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={13} className="text-amber-400" />
                                        Pick: {historyModalData.pickupTime} {historyModalData.returnTime ? `| Return: ${historyModalData.returnTime}` : ''}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setHistoryModalData(null); setHistoryFilter('all'); }} 
                                className="text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Top KPI Summary Stats */}
                        <div className="p-4 bg-gray-50 border-b border-gray-200 shrink-0">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Pass Days</p>
                                    <p className="text-xl font-extrabold text-gray-900 mt-0.5">{totalDays}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm text-center">
                                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Present Days</p>
                                    <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{presentDays}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm text-center">
                                    <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Absent / Missed</p>
                                    <p className="text-xl font-extrabold text-red-600 mt-0.5">{absentDays}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
                                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Upcoming</p>
                                    <p className="text-xl font-extrabold text-blue-600 mt-0.5">{upcomingDays}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm text-center col-span-2 sm:col-span-1">
                                    <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Attendance %</p>
                                    <p className="text-xl font-extrabold text-indigo-600 mt-0.5">{attendanceRate}%</p>
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                                <span className="text-xs font-bold text-gray-500">Filter:</span>
                                <button 
                                    onClick={() => setHistoryFilter('all')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        historyFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    All Days ({totalDays})
                                </button>
                                <button 
                                    onClick={() => setHistoryFilter('present')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        historyFilter === 'present' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 border border-gray-200 hover:bg-emerald-50'
                                    }`}
                                >
                                    Present ({presentDays})
                                </button>
                                <button 
                                    onClick={() => setHistoryFilter('absent')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        historyFilter === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-red-700 border border-gray-200 hover:bg-red-50'
                                    }`}
                                >
                                    Absent ({absentDays})
                                </button>
                                <button 
                                    onClick={() => setHistoryFilter('upcoming')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        historyFilter === 'upcoming' ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    Upcoming ({upcomingDays})
                                </button>
                            </div>
                        </div>

                        {/* Register Table Body */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {filteredRegister.length === 0 ? (
                                <p className="text-center text-gray-400 py-12">No records matching selected filter.</p>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100/75 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                                <th className="p-3">Day & Date</th>
                                                <th className="p-3">Morning Pickup ({historyModalData.pickupTime})</th>
                                                <th className="p-3">Evening Return ({historyModalData.returnTime || 'N/A'})</th>
                                                <th className="p-3 text-right">Day Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-xs">
                                            {filteredRegister.map((day) => (
                                                <tr 
                                                    key={day.date} 
                                                    className={`hover:bg-gray-50/80 transition-colors ${day.isToday ? 'bg-blue-50/50 font-medium' : ''}`}
                                                >
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                                                                #{day.dayNumber}
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{day.formattedDate}</p>
                                                                {day.isToday && (
                                                                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-100 px-1.5 py-0.5 rounded">
                                                                        Today
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="p-3">
                                                        {day.goTrip.status === 'Completed' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 size={13} /> Present ({day.goTrip.time})
                                                            </span>
                                                        ) : day.goTrip.status === 'Started' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                                                <Car size={13} /> In Progress
                                                            </span>
                                                        ) : day.goTrip.status === 'Missed' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-700 border border-red-200">
                                                                <XCircle size={13} /> Absent (Missed)
                                                            </span>
                                                        ) : day.isPast ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-600 border border-red-100">
                                                                <XCircle size={13} /> Absent (No Show)
                                                            </span>
                                                        ) : day.isToday ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                <Clock size={13} /> Scheduled Today
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-gray-50 text-gray-400 border border-gray-200">
                                                                <Clock size={13} /> Scheduled
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="p-3">
                                                        {!day.returnTrip ? (
                                                            <span className="text-gray-400 text-[11px] italic">One-way Pass</span>
                                                        ) : day.returnTrip.status === 'Completed' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 size={13} /> Present ({day.returnTrip.time})
                                                            </span>
                                                        ) : day.returnTrip.status === 'Started' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                                                <Car size={13} /> In Progress
                                                            </span>
                                                        ) : day.returnTrip.status === 'Missed' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-700 border border-red-200">
                                                                <XCircle size={13} /> Absent (Missed)
                                                            </span>
                                                        ) : day.isPast ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-600 border border-red-100">
                                                                <XCircle size={13} /> Absent (No Show)
                                                            </span>
                                                        ) : day.isToday ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                <Clock size={13} /> Scheduled Today
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-gray-50 text-gray-400 border border-gray-200">
                                                                <Clock size={13} /> Scheduled
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="p-3 text-right">
                                                        {day.dayStatus === 'Present' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs bg-emerald-100 text-emerald-800">
                                                                <Check size={12} /> Present
                                                            </span>
                                                        ) : day.dayStatus === 'Half Day' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs bg-amber-100 text-amber-800">
                                                                <AlertCircle size={12} /> Half Day
                                                            </span>
                                                        ) : day.dayStatus === 'In Progress' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs bg-amber-100 text-amber-800 animate-pulse">
                                                                <Car size={12} /> In Progress
                                                            </span>
                                                        ) : day.dayStatus === 'Absent' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs bg-red-100 text-red-800">
                                                                <X size={12} /> Absent
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-xs bg-gray-100 text-gray-500">
                                                                Upcoming
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
