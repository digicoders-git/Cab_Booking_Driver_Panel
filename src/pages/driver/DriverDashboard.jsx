import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FaCheckCircle, FaBan, FaRoute, FaHeadset, FaBell, FaHistory, FaPhone
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
  const { admin: driver } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedChart, setSelectedChart] = useState('all');
  const [showRideModal, setShowRideModal] = useState(false);
  const [currentRideRequest, setCurrentRideRequest] = useState(null);
  const [countdown, setCountdown] = useState(10);

  const prevRequestIdsRef = useRef(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('\n🔄 ========== FETCH DASHBOARD DATA START ==========');
      console.log('⏰ Time:', new Date().toLocaleTimeString());
      setRefreshing(true);

      console.log('📡 Making API calls...');
      const [profileRes, walletRes, pendingRes, tripsRes, notifRes] = await Promise.all([
        driverService.getProfile(),
        driverService.getWalletBalance(),
        driverService.getPendingRequests(),
        driverService.getMyTrips(),
        driverService.getNotifications()
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

      // Pehli baar load ho raha hai (prevRequestIdsRef null hai)
      if (prevRequestIdsRef.current === null) {
        console.log('\n🆕 FIRST LOAD DETECTED');
        prevRequestIdsRef.current = new Set(newRequests.map(r => r._id));
        console.log('✅ Initialized prevRequestIdsRef with:', Array.from(prevRequestIdsRef.current));

        // Agar koi pending request hai toh modal dikha do
        if (newRequests.length > 0) {
          console.log('\n🚨 SHOWING MODAL FOR FIRST REQUEST');
          console.log('📦 Request Data:', newRequests[0]);
          console.log('👤 Passenger:', newRequests[0].booking?.passengerDetails?.name);
          console.log('📍 Pickup:', newRequests[0].booking?.pickup?.address?.split(',')[0]);
          console.log('💰 Fare:', newRequests[0].booking?.fareEstimate);

          setCurrentRideRequest(newRequests[0]);
          setShowRideModal(true);
          console.log('✅ Modal state updated: showRideModal = true');
        } else {
          console.log('ℹ️ No pending requests on first load');
        }
      } else {
        // Subsequent loads - check for new requests
        console.log('\n🔄 SUBSEQUENT LOAD - Checking for new requests');
        let foundNewRequest = false;

        newRequests.forEach((req) => {
          if (!prevRequestIdsRef.current.has(req._id)) {
            console.log('\n🆕 NEW REQUEST DETECTED!');
            console.log('🆔 Request ID:', req._id);
            console.log('📦 Request Data:', req);
            console.log('👤 Passenger:', req.booking?.passengerDetails?.name);
            console.log('📍 Pickup:', req.booking?.pickup?.address?.split(',')[0]);
            console.log('💰 Fare:', req.booking?.fareEstimate);

            const remaining = Math.max(0, Math.round(((req.expiresAt || (new Date(req.createdAt).getTime() + 10000)) - Date.now()) / 1000));
            setCurrentRideRequest(req);
            setShowRideModal(true);
            setCountdown(remaining); // Sync with backend time
            prevRequestIdsRef.current.add(req._id);
            foundNewRequest = true;
            console.log('✅ Modal state updated: showRideModal = true');
          }
        });

        if (!foundNewRequest) {
          console.log('ℹ️ No new requests found');
        }
      }

      console.log('\n📊 Final prevRequestIdsRef:', Array.from(prevRequestIdsRef.current));

      setTripHistory(tripsRes?.trips || tripsRes || []);
      setNotifications(notifRes?.notifications || notifRes || []);

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
              console.log('🆔 Request ID:', req._id);
              console.log('📦 Request Data:', req);
              console.log('👤 Passenger:', req.booking?.passengerDetails?.name);
              console.log('📍 Pickup:', req.booking?.pickup?.address?.split(',')[0]);
              console.log('💰 Fare:', req.booking?.fareEstimate);

              const remaining = Math.max(0, Math.round(((req.expiresAt || (new Date(req.createdAt).getTime() + 10000)) - Date.now()) / 1000));
              setCurrentRideRequest(req);
              setShowRideModal(true);
              setCountdown(remaining); // Sync from polling
              prevRequestIdsRef.current.add(req._id);
              foundNew = true;
              console.log('✅ Modal triggered from polling');
            }
          });

          // SYNC CHECK: Agar current request list se gayab ho gayi hai, toh modal close kar do
          setCurrentRideRequest(prev => {
            if (prev) {
              const stillActive = newRequests.find(r => r._id === prev._id);
              if (!stillActive) {
                console.log('⚠️ CURRENT REQUEST NO LONGER PENDING - Closing Modal');
                setShowRideModal(false);
                return null;
              }
            }
            return prev;
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
        console.log('\n🔔 ========== SOCKET EVENT: new_ride_request ==========');
        console.log('⏰ Event Time:', new Date().toLocaleTimeString());
        console.log('📦 Event Data:', data);
        console.log('🔄 Triggering fetchDashboardData...');
        const remaining = Math.max(0, Math.round((data.expiresAt - Date.now()) / 1000));
        setCountdown(remaining); // Sync from socket event
        fetchDashboardData();
        console.log('========================================\n');
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
        
        setCurrentRideRequest(prev => {
          if (prev && prev._id === data.requestId) {
            console.log('🚫 Closing Modal due to Timeout');
            setShowRideModal(false);
            return null;
          }
          return prev;
        });
        
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

    // Listen for foreground messages (har baar aayega)
    const unsubscribeFCM = onMessageListener((payload) => {
      console.log('Foreground Message:', payload);
      toast.info(
        <div>
          <p className="font-bold">{payload.notification.title}</p>
          <p className="text-sm">{payload.notification.body}</p>
        </div>,
        { duration: 5000 }
      );
      fetchDashboardData();
    });

    return () => {
      console.log('\n🛑 ========== COMPONENT UNMOUNTING ==========');
      console.log('⏰ Unmount Time:', new Date().toLocaleTimeString());
      console.log('🧹 Cleaning up polling interval and socket listeners');

      clearInterval(pollInterval);
      if (unsubscribeFCM) unsubscribeFCM(); // FCM listener cleanup
      const socket = getSocket();
      if (socket) {
        socket.off('new_ride_request');
        socket.off('ride_status_update');
        console.log('✅ Socket listeners removed');
      }
      console.log('========================================\n');
    };
  }, []);

  useEffect(() => {
    let timer;
    if (showRideModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowRideModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showRideModal, countdown]);

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
      {/* Ride Request Modal */}
      {showRideModal && currentRideRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out] border-2 border-gray-100 mx-2">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-4 sm:px-6 py-4 sm:py-5 relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20"></div>
              </div>

              {/* Countdown Timer Circle */}
              <div className="absolute top-4 right-4 flex items-center justify-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="white"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 * (1 - countdown / 10)}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute text-white font-black text-sm animate-pulse">
                    {countdown}
                  </span>
                </div>
              </div>

              <div className="relative flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform flex-shrink-0">
                  <FaCar className="text-blue-600 text-xl sm:text-2xl" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">New Ride Request!</h2>
                  <p className="text-blue-100 text-[10px] sm:text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Respond quickly to accept
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-gradient-to-b from-gray-50 to-white">
              {/* Passenger Info */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-lg sm:text-2xl shadow-lg flex-shrink-0">
                  {currentRideRequest.booking?.passengerDetails?.name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-base sm:text-lg truncate">{currentRideRequest.booking?.passengerDetails?.name || 'Passenger'}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <FaPhone className="text-green-600" size={10} />
                    {currentRideRequest.booking?.passengerDetails?.phone || '—'}
                  </p>
                </div>
              </div>

              {/* Route Info */}
              <div className="space-y-3">
                {/* Pickup */}
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="mt-0.5 p-2.5 bg-green-500 rounded-xl shadow-md">
                    <Navigation className="text-white" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-700 mb-1 uppercase tracking-wide">Pickup Location</p>
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{currentRideRequest.booking?.pickup?.address || '—'}</p>
                  </div>
                </div>

                {/* Divider with Arrow */}
                <div className="flex items-center justify-center">
                  <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                  <div className="px-3 text-gray-400">↓</div>
                  <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                </div>

                {/* Drop */}
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="mt-0.5 p-2.5 bg-red-500 rounded-xl shadow-md">
                    <MapPin className="text-white" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Drop Location</p>
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{currentRideRequest.booking?.drop?.address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Fare & Distance Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-lg transform hover:scale-105 transition-transform flex flex-col justify-center">
                  <p className="text-xl sm:text-3xl font-bold text-white tracking-tighter italic">₹{currentRideRequest.booking?.fareEstimate || 0}</p>
                  <p className="text-[9px] sm:text-xs text-green-100 mt-0.5 sm:mt-1 font-medium uppercase tracking-widest">Fare</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-lg transform hover:scale-105 transition-transform flex flex-col justify-center">
                  <p className="text-xl sm:text-3xl font-bold text-white tracking-tighter">{currentRideRequest.booking?.estimatedDistanceKm || 0}</p>
                  <p className="text-[9px] sm:text-xs text-blue-100 mt-0.5 sm:mt-1 font-medium uppercase tracking-widest">KM</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-lg transform hover:scale-105 transition-transform flex flex-col justify-center min-w-0">
                  <p className="text-xs sm:text-lg font-bold text-white leading-tight truncate uppercase tracking-tighter">{currentRideRequest.booking?.rideType || 'Ride'}</p>
                  <p className="text-[9px] sm:text-xs text-purple-100 mt-0.5 sm:mt-1 font-medium uppercase tracking-widest">Type</p>
                </div>
              </div>
</div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 flex gap-2 sm:gap-3 bg-white">
              <button
                onClick={() => handleRejectRide(currentRideRequest._id)}
                className="flex-1 py-3.5 sm:py-4 px-3 sm:px-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaBan size={16} /> Reject
              </button>
              <button
                onClick={() => handleAcceptRide(currentRideRequest._id)}
                className="flex-1 py-3.5 sm:py-4 px-3 sm:px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-95 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <FaCheckCircle size={16} /> Accept Ride
              </button>
            </div>
          </div>
        </div>
      )}

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
                {/* Online Status Badge */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profile?.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {profile?.isOnline ? '🟢 Online' : '🔴 Offline'}
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
                            <span>→</span>
                            <MapPin size={12} /> {drop.address?.split(',')[0]}
                          </div>
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
