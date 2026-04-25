import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HC_more from 'highcharts/highcharts-more';
import HC_solidGauge from 'highcharts/modules/solid-gauge';
import HC_accessibility from 'highcharts/modules/accessibility';

const initHC = (mod) => {
  if (mod) {
    const init = typeof mod === 'function' ? mod : mod.default;
    if (typeof init === 'function') { try { init(Highcharts); } catch (e) { } }
  }
};
initHC(HC_more); initHC(HC_solidGauge); initHC(HC_accessibility);

import {
  FaCar, FaUser, FaWallet, FaStar, FaClock, FaSync, FaPowerOff,
  FaCheckCircle, FaBan, FaRoute, FaHeadset, FaBell, FaHistory, FaPhone,
  FaLayerGroup
} from 'react-icons/fa';
import { DollarSign, Target, Gauge, MapPin, Navigation, PieChart, BarChart3, LineChart } from 'lucide-react';
import Swal from 'sweetalert2';
import { requestForToken, onMessageListener } from '../../firebase';

const CHART_COLORS = {
  primary: '#3B82F6', success: '#10B981', warning: '#F59E0B',
  danger: '#EF4444', purple: '#8B5CF6', orange: '#F97316', lightGray: '#E5E7EB'
};

const ChartCard = ({ title, icon: Icon, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-50 rounded-lg"><Icon className="text-blue-600" size={18} /></div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const StatCard = ({ label, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-lg transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="p-3 rounded-xl" style={{ backgroundColor: color + '15' }}>
        <Icon className="text-xl" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs font-medium text-gray-500">{label}</p>
  </div>
);

import { getSocket } from '../../socket/socket';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { isOnline: contextOnline } = useOutletContext(); // Get real-time status from Layout
  const { admin: driver } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [bulkAssignments, setBulkAssignments] = useState([]); // NEW: Bulk trips
  const [tripHistory, setTripHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedChart, setSelectedChart] = useState('all');
  // 🧹 Removed local modal states (Now handled globally by DashboardLayout)
  const [countdown, setCountdown] = useState(11);

  const prevRequestIdsRef = useRef(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('\n🔄 ========== FETCH DASHBOARD DATA START ==========');
      console.log('⏰ Time:', new Date().toLocaleTimeString());
      setRefreshing(true);

      console.log('📡 Making API calls...');
      const [profileRes, walletRes, pendingRes, tripsRes, notifRes, bulkRes] = await Promise.all([
        driverService.getProfile(),
        driverService.getWalletBalance(),
        driverService.getPendingRequests(),
        driverService.getMyTrips(),
        driverService.getNotifications(),
        driverService.getAssignedBulkBookings() // NEW
      ]);

      console.log('✅ API Responses received:');
      console.log('  👤 Profile:', profileRes);
      console.log('  💰 Wallet:', walletRes);
      console.log('  🚗 Pending Requests:', pendingRes);
      console.log('  📋 Trips:', tripsRes);
      console.log('  🔔 Notifications:', notifRes);

      setProfile(profileRes?.driver || profileRes || {});
      setWallet(walletRes?.wallet || walletRes || {});

      // Pending Requests Processing
      console.log('\n🚦 ========== PENDING REQUESTS PROCESSING ==========');
      const newRequests = pendingRes?.requests || pendingRes || [];
      console.log('📊 Total Pending Requests:', newRequests.length);
      console.log('📝 Request IDs:', newRequests.map(r => r._id));
      console.log('🔍 Previous Request IDs:', prevRequestIdsRef.current ? Array.from(prevRequestIdsRef.current) : 'NULL (First Load)');

      setPendingRequests(newRequests);
      console.log('✅ Polling/Initial Sync: Pending requests updated.');

      if (prevRequestIdsRef.current === null) {
        console.log('\n🆕 FIRST LOAD DETECTED');
        prevRequestIdsRef.current = new Set(newRequests.map(r => r._id));
        console.log('✅ Initialized prevRequestIdsRef with:', Array.from(prevRequestIdsRef.current));
      } else {
        console.log('\n🔄 SUBSEQUENT LOAD - Checking for new requests');
        newRequests.forEach((req) => {
          if (!prevRequestIdsRef.current.has(req._id)) {
            console.log('\n🆕 NEW REQUEST DETECTED!');
            prevRequestIdsRef.current.add(req._id);
          }
        });
      }

      console.log('\n📊 Final prevRequestIdsRef:', Array.from(prevRequestIdsRef.current));

      setTripHistory(tripsRes?.trips || tripsRes || []);
      setNotifications(notifRes?.notifications || notifRes || []);
      setBulkAssignments(bulkRes?.assignments || []); // NEW

      console.log('\n✅ ========== FETCH DASHBOARD DATA COMPLETE ==========\n');
    } catch (err) {
      console.error('\n❌ ========== FETCH DASHBOARD DATA ERROR ==========');
      console.error('Error:', err);
      console.error('Error Message:', err?.message);
      console.error('Error Response:', err?.response?.data);
      console.error('========================================\n');
      toast.error(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log('\n🚀 ========== COMPONENT MOUNTED ==========');
    console.log('⏰ Mount Time:', new Date().toLocaleTimeString());
    console.log('👤 Driver ID:', driver?._id || driver?.id);

    fetchDashboardData();

    // Polling — har 10 sec mein pending requests check karo
    console.log('⏱️ Starting polling interval (10 seconds)');
    const pollInterval = setInterval(() => {
      console.log('\n🔄 ========== POLLING TICK ==========');
      console.log('⏰ Poll Time:', new Date().toLocaleTimeString());
      console.log('📡 Fetching pending requests...');

      driverService.getPendingRequests().then((pendingRes) => {
        console.log('✅ Polling API Response:', pendingRes);
        const newRequests = pendingRes?.requests || pendingRes || [];
        console.log('📊 Pending Requests Count:', newRequests.length);

        if (prevRequestIdsRef.current !== null) {
          let foundNew = false;
          newRequests.forEach((req) => {
            if (!prevRequestIdsRef.current.has(req._id)) {
              console.log('\n🆕 NEW REQUEST FROM POLLING!');
              prevRequestIdsRef.current.add(req._id);
              foundNew = true;
            }
          });

          if (!foundNew) {
            console.log('ℹ️ No new requests in this poll');
          }
        }
        setPendingRequests(newRequests);
        console.log('========================================\n');
      }).catch((err) => {
        console.error('❌ Polling Error:', err);
      });
    }, 10000);

    // Socket se bhi listen karo
    console.log('🔌 Attaching socket listeners...');
    const attachSocketListeners = () => {
      const socket = getSocket();
      if (!socket) {
        console.log('⚠️ Socket not ready, retrying in 1 second...');
        setTimeout(attachSocketListeners, 1000);
        return;
      }

      console.log('✅ Socket connected, attaching event listeners');

      socket.on('new_ride_request', (data) => {
        console.log('🔔 New Ride Received - Refreshing Dashboard data');
        fetchDashboardData();
      });

      socket.on('ride_status_update', (data) => {
        console.log('\n🔔 ========== SOCKET EVENT: ride_status_update ==========');
        console.log('⏰ Event Time:', new Date().toLocaleTimeString());
        console.log('📦 Event Data:', data);
        console.log('🔄 Triggering fetchDashboardData...');
        fetchDashboardData();
        console.log('========================================\n');
      });

      socket.on('ride_request_timeout', (data) => {
        console.log('\n⏰ ========== SOCKET EVENT: ride_request_timeout ==========');
        console.log('📦 Timeout Data:', data);
        
        fetchDashboardData();
        console.log('========================================\n');
      });
    };
    attachSocketListeners();
    
    // 🔥 FCM Integration: Request token and update backend
    const setupFCM = async () => {
      try {
        const token = await requestForToken();
        if (token) {
          console.log('Successfully got FCM token. Updating backend...');
          await driverService.updateFcmToken(token);
        }
      } catch (err) {
        console.error('FCM Setup Error:', err);
      }
    };
    setupFCM();

    // Listen for foreground messages (Uniform approach: Always show system notification with buttons)
    const unsubscribeFCM = onMessageListener(async (payload) => {
      console.log('Foreground Message:', payload);
      
      // 1. Refresh dashboard data (Modal update)
      fetchDashboardData();

      // 2. 🎯 DATA-ONLY: Read from payload.data
      const title = payload.data?.title || 'New Ride Request';
      const body = payload.data?.body || 'Tap to view details';

      // 3. Show System Notification even in foreground (so we get buttons)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body: body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: payload.data?.bookingId || 'new-ride',
          renotify: true,
          vibrate: [200, 100, 200],
          data: payload.data,
          actions: payload.data?.type === "NEW_RIDE_REQUEST" ? [
            {
              action: 'accept',
              title: '🚕 ACCEPT RIDE',
              icon: '/logo.png'
            },
            {
              action: 'reject',
              title: '❌ IGNORE',
              icon: '/logo.png'
            }
          ] : [] 
        });
      }
    });

    return () => {
      console.log('\n🛑 ========== COMPONENT UNMOUNTING ==========');
      console.log('⏰ Unmount Time:', new Date().toLocaleTimeString());
      console.log('🧹 Cleaning up polling interval and socket listeners');

      clearInterval(pollInterval);
      if (unsubscribeFCM) unsubscribeFCM(); // FCM listener cleanup
      // const socket = getSocket();
      // if (socket) {
      //   socket.off('new_ride_request');
      //   socket.off('ride_status_update');
      //   console.log('✅ Socket listeners removed from dashboard component');
      // }
      console.log('✅ Dashboard cleanup complete');
      console.log('========================================\n');
    };
  }, []);

  // 🚦 Modal logic shifted to DashboardLayout for Global persistence 🌍
  // This page now focus on statistics and online status only.

  const handleAcceptRide = async (requestId) => {
    try {
      console.log('\n✅ ========== ACCEPT RIDE ==========');
      console.log('🆔 Request ID:', requestId);
      console.log('⏰ Time:', new Date().toLocaleTimeString());

      setShowRideModal(false);
      console.log('🔒 Modal closed');

      console.log('📡 Calling API: respondToRequest(accept)...');
      const res = await driverService.respondToRequest(requestId, 'accept');
      console.log('✅ API Response:', res);

      if (res.success) {
        const otp = res.booking?.tripData?.startOtp;
        console.log('🎉 Ride Accepted Successfully!');
        console.log('🔑 OTP:', otp);
        console.log('🆔 Booking ID:', res.booking?._id);

        toast.success(`✅ Ride Accepted! ${otp ? `OTP: ${otp}` : ''}`, { duration: 6000 });
        fetchDashboardData();

        if (res.booking?._id) {
          const shortId = res.booking._id.slice(-8);
          console.log('🚀 Navigating to trip detail page...');
          console.log('📝 Short ID:', shortId);
          navigate(`/driver/trip/${shortId}`);
        }
      }
      console.log('========================================\n');
    } catch (err) {
      console.error('\n❌ ========== ACCEPT RIDE ERROR ==========');
      console.error('Error:', err);
      console.error('Error Response:', err?.response?.data);
      console.error('========================================\n');
      toast.error(err?.response?.data?.message || 'Failed to accept ride');
    }
  };

  const handleRejectRide = async (requestId) => {
    try {
      console.log('\n❌ ========== REJECT RIDE ==========');
      console.log('🆔 Request ID:', requestId);
      console.log('⏰ Time:', new Date().toLocaleTimeString());

      setShowRideModal(false);
      console.log('🔒 Modal closed');

      console.log('📡 Calling API: respondToRequest(reject)...');
      const res = await driverService.respondToRequest(requestId, 'reject');
      console.log('✅ API Response:', res);

      if (res.success) {
        console.log('✅ Ride Rejected Successfully!');
        toast.info('❌ Ride Rejected');
        fetchDashboardData();
      }
      console.log('========================================\n');
    } catch (err) {
      console.error('\n❌ ========== REJECT RIDE ERROR ==========');
      console.error('Error:', err);
      console.error('Error Response:', err?.response?.data);
      console.error('========================================\n');
      toast.error(err?.response?.data?.message || 'Failed to reject ride');
    }
  };

  const handleStartTrip = async (bookingId) => {
    const { value: otp } = await Swal.fire({
      title: 'Enter OTP', input: 'text',
      inputLabel: 'Passenger se 4-digit OTP lo',
      inputPlaceholder: '1234', showCancelButton: true,
      confirmButtonText: 'Start Trip', confirmButtonColor: '#3B82F6'
    });
    if (!otp) return;
    try {
      const res = await driverService.startTrip(bookingId, otp);
      if (res.success) {
        toast.success('Trip started!');
        fetchDashboardData();
        const shortId = bookingId.slice(-8);
        navigate(`/driver/trip/${shortId}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid OTP');
    }
  };

  const handleEndTrip = async (bookingId) => {
    const result = await Swal.fire({
      title: 'End Trip?', icon: 'question', showCancelButton: true,
      confirmButtonText: 'Yes, End Trip', confirmButtonColor: '#10B981'
    });
    if (!result.isConfirmed) return;
    try {
      const res = await driverService.endTrip(bookingId);
      if (res.success) { toast.success('Trip completed!'); fetchDashboardData(); }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to end trip');
    }
  };

  const stats = useMemo(() => {
    const totalTrips = tripHistory.length;
    const completedTrips = tripHistory.filter(t => (t.status || t.bookingStatus)?.toLowerCase() === 'completed').length;
    const cancelledTrips = tripHistory.filter(t => (t.status || t.bookingStatus)?.toLowerCase() === 'cancelled').length;
    return {
      totalTrips, completedTrips, cancelledTrips,
      totalEarnings: wallet?.totalEarnings || 0,
      walletBalance: wallet?.walletBalance || 0,
      avgRating: profile?.rating || 0,
      unreadCount: notifications.filter(n => !n.read).length,
      successRate: totalTrips ? (completedTrips / totalTrips) * 100 : 0
    };
  }, [tripHistory, wallet, profile, notifications]);

  const tripStatusData = [
    { name: 'Completed', value: stats.completedTrips, color: CHART_COLORS.success },
    { name: 'Cancelled', value: stats.cancelledTrips, color: CHART_COLORS.danger },
    { name: 'Pending', value: tripHistory.filter(t => (t.status || t.bookingStatus)?.toLowerCase() === 'pending').length, color: CHART_COLORS.warning }
  ].filter(item => item.value > 0);

  const monthlyData = useMemo(() => {
    const months = {};
    tripHistory.forEach(trip => {
      const month = new Date(trip.createdAt).toLocaleString('default', { month: 'short' });
      if (!months[month]) months[month] = 0;
      months[month] += trip.earnings || 0;
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [tripHistory]);

  const dailyTripsData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const tripsByDay = {};
    days.forEach(day => tripsByDay[day] = 0);
    tripHistory.forEach(trip => {
      const day = new Date(trip.createdAt).toLocaleString('default', { weekday: 'short' });
      tripsByDay[day] = (tripsByDay[day] || 0) + 1;
    });
    return days.map(day => ({ day, count: tripsByDay[day] }));
  }, [tripHistory]);

  const pieOptions = (data, title) => ({
    chart: { type: 'pie', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    tooltip: { pointFormat: '{point.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' },
    plotOptions: { pie: { innerRadius: '60%', dataLabels: { enabled: false }, showInLegend: true } },
    series: [{ name: title, colorByPoint: true, data: data.map(d => ({ name: d.name, y: d.value, color: d.color })) }],
    legend: { enabled: true, layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px' } },
    credits: { enabled: false }
  });

  const ratingGaugeOptions = {
    chart: { type: 'solidgauge', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    pane: { center: ['50%', '70%'], size: '100%', startAngle: -90, endAngle: 90, background: { backgroundColor: CHART_COLORS.lightGray, innerRadius: '60%', outerRadius: '100%', shape: 'arc' } },
    tooltip: { enabled: false },
    yAxis: { min: 0, max: 5, stops: [[0.4, CHART_COLORS.warning], [0.8, CHART_COLORS.success]], lineWidth: 0, tickWidth: 0 },
    plotOptions: { solidgauge: { dataLabels: { y: -20, borderWidth: 0, useHTML: true, format: '<div style="text-align:center"><span style="font-size:28px">{point.y:.1f}</span><br/><span style="font-size:10px">★ Rating</span></div>' } } },
    series: [{ name: 'Rating', data: [stats.avgRating] }],
    credits: { enabled: false }
  };

  const lineOptions = {
    chart: { type: 'spline', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: dailyTripsData.map(d => d.day) },
    yAxis: { title: { text: 'Trips' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    plotOptions: { spline: { marker: { radius: 4 }, color: CHART_COLORS.primary, lineWidth: 2 } },
    series: [{ name: 'Trips', data: dailyTripsData.map(d => d.count) }],
    credits: { enabled: false }
  };

  const barOptions = {
    chart: { type: 'column', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: monthlyData.map(d => d.month) },
    yAxis: { title: { text: 'Earnings (₹)' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    plotOptions: { column: { borderRadius: 4, color: CHART_COLORS.success } },
    series: [{ name: 'Earnings', data: monthlyData.map(d => d.amount) }],
    credits: { enabled: false }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
    </div>
  );

  return (
    <>

      <div className="space-y-6 py-6 px-4 sm:px-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {profile?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome, {profile?.name || 'Driver'}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-sm"><FaStar className="text-yellow-400" size={14} /> {profile?.rating || 0} ★</span>
                <div className="w-px h-3 bg-gray-300" />
                <span className="text-sm text-gray-500">{profile?.carModel || profile?.carDetails?.carModel || 'Car not assigned'}</span>
                <div className="w-px h-3 bg-gray-300" />
                {/* Online Status Badge - Real-time from context */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(contextOnline ?? profile?.isOnline) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {(contextOnline ?? profile?.isOnline) ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/driver/notifications')} className="relative p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all">
              <FaBell size={18} className="text-gray-600" />
              {stats.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{stats.unreadCount}</span>
              )}
            </button>
            <button onClick={fetchDashboardData} disabled={refreshing} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all">
              <FaSync className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Total Trips" value={stats.totalTrips} icon={FaRoute} color={CHART_COLORS.primary} trend={12} />
          <StatCard label="Completed" value={stats.completedTrips} icon={FaCheckCircle} color={CHART_COLORS.success} trend={8} />
          <StatCard label="Success Rate" value={`${stats.successRate.toFixed(1)}%`} icon={Target} color={stats.successRate >= 70 ? CHART_COLORS.success : CHART_COLORS.warning} />
          <StatCard label="Total Earnings" value={`₹${stats.totalEarnings.toLocaleString()}`} icon={DollarSign} color={CHART_COLORS.success} trend={15} />
          <StatCard label="Wallet Balance" value={`₹${stats.walletBalance.toLocaleString()}`} icon={FaWallet} color={stats.walletBalance > 0 ? CHART_COLORS.success : CHART_COLORS.warning} />
          <StatCard label="Rating" value={`${stats.avgRating.toFixed(1)}★`} icon={FaStar} color={CHART_COLORS.orange} />
        </div>

        {/* Chart Selector */}
        <div className="flex flex-wrap gap-2">
          {['all', 'status', 'earnings', 'performance', 'trends'].map((type) => (
            <button key={type} onClick={() => setSelectedChart(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedChart === type ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Charts
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {(selectedChart === 'all' || selectedChart === 'status') && (
            <ChartCard title="Trip Status" icon={PieChart} subtitle="Distribution by status">
              {tripStatusData.length > 0 ? <HighchartsReact highcharts={Highcharts} options={pieOptions(tripStatusData, 'Trips')} /> : <div className="h-[200px] flex items-center justify-center text-gray-400">No data</div>}
            </ChartCard>
          )}
          {(selectedChart === 'all' || selectedChart === 'performance') && (
            <ChartCard title="Driver Rating" icon={Gauge} subtitle="Current rating out of 5">
              <HighchartsReact highcharts={Highcharts} options={ratingGaugeOptions} />
            </ChartCard>
          )}
          {(selectedChart === 'all' || selectedChart === 'trends') && monthlyData.length > 0 && (
            <ChartCard title="Monthly Earnings" icon={BarChart3} subtitle="Earnings by month">
              <HighchartsReact highcharts={Highcharts} options={barOptions} />
            </ChartCard>
          )}
          {(selectedChart === 'all' || selectedChart === 'trends') && (
            <ChartCard title="Daily Trips" icon={LineChart} subtitle="Trips per day">
              <HighchartsReact highcharts={Highcharts} options={lineOptions} />
            </ChartCard>
          )}
        </div>

        {/* Pending Ride Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-2">
              <FaClock className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Pending Ride Requests ({pendingRequests.length})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingRequests.map((req, idx) => {
                const booking = req.booking || req;
                const passenger = booking.passengerDetails || {};
                const pickup = booking.pickup || {};
                const drop = booking.drop || {};
                return (
                  <div key={req._id || idx} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <FaUser className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{passenger.name || 'Passenger'}</p>
                          <p className="text-sm text-gray-500">{passenger.phone || '—'}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <Navigation size={12} /> {pickup.address?.split(',')[0]}
                            {booking.stops && booking.stops.length > 0 && (
                              <span className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                +{booking.stops.length} STOPS
                              </span>
                            )}
                            <span>→</span>
                            <MapPin size={12} /> {drop.address?.split(',')[0]}
                          </div>
                          {booking.stops && booking.stops.length > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1 italic line-clamp-1">
                              via: {booking.stops.map(s => s.address?.split(',')[0]).join(' → ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{booking.fareEstimate || 0}</p>
                          <p className="text-xs text-gray-500">{booking.rideType || 'Ride'} • {booking.estimatedDistanceKm || 0} km</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptRide(req._id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Accept</button>
                          <button onClick={() => handleRejectRide(req._id)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Reject</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scheduled Bulk Trips */}
        {bulkAssignments.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-blue-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                    <FaLayerGroup size={14} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Scheduled Bulk Trips ({bulkAssignments.length})</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Upcoming Jobs</span>
            </div>
            <div className="divide-y divide-gray-100">
              {bulkAssignments.map((job, idx) => (
                <div key={job._id || idx} className="p-5 hover:bg-blue-50/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex flex-col items-center justify-center text-center p-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">
                            {new Date(job.pickupDateTime).toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-lg font-black text-gray-900 leading-none">
                            {new Date(job.pickupDateTime).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">Trip to {job.drop?.address?.split(',')[0]}</p>
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-full uppercase tracking-tighter">Bulk</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {job.pickup?.address}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                <FaCar /> {job.myCar?.carNumber || 'Assigned Car'}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                            <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                <FaClock /> {new Date(job.pickupDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">Estimated</p>
                        <p className="text-xl font-black text-blue-600">₹{job.offeredPrice?.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => toast.info(`Bulk Trip details will be available on ${new Date(job.pickupDateTime).toLocaleDateString()}`)}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg"
                      >
                        View Job
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Trips */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2"><FaHistory className="text-blue-600" /><h3 className="text-sm font-semibold text-gray-900">Recent Trips</h3></div>
            <button onClick={() => navigate('/driver/trips')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All →</button>
          </div>
          <div className="divide-y divide-gray-200">
            {tripHistory.slice(0, 5).map((trip, idx) => {
              const tripStatus = (trip.status || trip.bookingStatus)?.toLowerCase();
              return (
                <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tripStatus === 'completed' ? 'bg-green-100' : tripStatus === 'ongoing' ? 'bg-blue-100' : tripStatus === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'}`}>
                        {tripStatus === 'completed' ? <FaCheckCircle className="text-green-600" /> : tripStatus === 'cancelled' ? <FaBan className="text-red-600" /> : <FaRoute className="text-gray-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Trip #{trip._id?.slice(-8)}</p>
                        <p className="text-xs text-gray-500">{new Date(trip.createdAt).toLocaleDateString()} • {trip.pickup?.address?.split(',')[0]} → {trip.drop?.address?.split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-green-600">₹{trip.actualFare || trip.fareEstimate || 0}</p>
                      {tripStatus === 'ongoing' && (
                        <button onClick={() => handleStartTrip(trip._id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Start Trip</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {tripHistory.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <FaCar className="mx-auto text-4xl mb-3 opacity-30" />
                <p>No trips yet. Go online to start receiving ride requests!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button onClick={() => navigate('/driver/wallet')} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-5 flex items-center gap-3"><FaWallet size={24} /><div><h3 className="font-semibold">Wallet</h3><p className="text-xs">Balance & withdraw</p></div></button>
          <button onClick={() => navigate('/driver/trips')} className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-5 flex items-center gap-3"><FaHistory size={24} /><div><h3 className="font-semibold">Trip History</h3><p className="text-xs">All trips</p></div></button>
          <button onClick={() => navigate('/driver/profile')} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl p-5 flex items-center gap-3"><FaUser size={24} /><div><h3 className="font-semibold">Profile</h3><p className="text-xs">Update details</p></div></button>
          <button onClick={() => navigate('/driver/support')} className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl p-5 flex items-center gap-3"><FaHeadset size={24} /><div><h3 className="font-semibold">Support</h3><p className="text-xs">Get help</p></div></button>
        </div>
      </div>
    </>
  );
}
