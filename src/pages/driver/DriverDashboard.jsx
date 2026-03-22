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
    if (typeof init === 'function') {
      try { init(Highcharts); } catch (e) { /* ignore Error 16 */ }
    }
  }
};
initHC(HC_more);
initHC(HC_solidGauge);
initHC(HC_accessibility);


import {
  FaCar, FaUser, FaWallet, FaChartLine, FaChartPie, FaChartBar,
  FaMapMarkerAlt, FaHistory, FaMoneyBillWave, FaStar, FaClock,
  FaSync, FaPowerOff, FaCheckCircle, FaTimesCircle, FaBan,
  FaArrowUp, FaArrowDown, FaRoute, FaTachometerAlt, FaHeadset,
  FaBell, FaTicketAlt
} from 'react-icons/fa';
import {
  TrendingUp, DollarSign, Activity, Target, Gauge, MapPin,
  Navigation, Clock, Calendar, Award, Medal, Users, Headphones,
  PieChart, BarChart3, LineChart
} from 'lucide-react';

// Chart Colors
const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  orange: '#F97316',
  teal: '#14B8A6',
  gray: '#94A3B8',
  lightGray: '#E5E7EB'
};

// Chart Card Component
const ChartCard = ({ title, icon: Icon, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="text-blue-600" size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    {children}
  </div>
);

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color, trend, subtitle }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-lg transition-all group">
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
    {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
  </div>
);

// Online Status Toggle Button
const OnlineToggle = ({ isOnline, onToggle, loading }) => (
  <button
    onClick={onToggle}
    disabled={loading}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
      isOnline
        ? 'bg-red-100 text-red-700 hover:bg-red-200'
        : 'bg-green-100 text-green-700 hover:bg-green-200'
    }`}
  >
    {isOnline ? (
      <>
        <FaPowerOff size={14} />
        <span>Go Offline</span>
      </>
    ) : (
      <>
        <FaCheckCircle size={14} />
        <span>Go Online</span>
      </>
    )}
  </button>
);

// Main Driver Dashboard Component
export default function DriverDashboard() {
  const navigate = useNavigate();
  const { admin: driver, setLoginData, token } = useAuth();

  const [profile, setProfile] = useState(null);
  const isOnlineRef = useRef(false);
  const lastAddressUpdateRef = useRef(0);
  const ADDRESS_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineToggleLoading, setOnlineToggleLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [selectedChart, setSelectedChart] = useState('all');

  // Fetch all data
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const [profileRes, walletRes, pendingRes, tripsRes, notifRes] = await Promise.all([
        driverService.getProfile(),
        driverService.getWalletBalance(),
        driverService.getPendingRequests(),
        driverService.getMyTrips(),
        driverService.getNotifications()
      ]);

      const profileData = profileRes?.driver || profileRes || {};
      setProfile(profileData);
      isOnlineRef.current = profileData?.isOnline || false;
      setWallet(walletRes?.wallet || walletRes || {});
      setPendingRequests(pendingRes?.requests || pendingRes || []);
      setTripHistory(tripsRes?.trips || tripsRes || []);
      setNotifications(notifRes?.notifications || notifRes || []);

      if (profileRes?.driver) {
        // Omitting setLoginData here to avoid infinite render loops, local profile state is sufficient
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    startLocationTracking();
    return () => stopLocationTracking();
  }, []);

  // Google Maps Geocoding — lat/lng se exact address nikalna
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      return data?.results?.[0]?.formatted_address || `${lat},${lng}`;
    } catch {
      return `${lat},${lng}`;
    }
  };

  // GPS Location Tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported on this device');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        if (isOnlineRef.current) {
          try {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastAddressUpdateRef.current;
            if (timeSinceLastUpdate >= ADDRESS_UPDATE_INTERVAL) {
              const address = await getAddressFromCoords(latitude, longitude);
              await driverService.updateLocation(latitude, longitude, address);
              lastAddressUpdateRef.current = now;
            } else {
              await driverService.updateLocation(latitude, longitude);
            }
          } catch (e) { /* silent fail */ }
        }
      },
      (error) => console.error('GPS Error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    window.gpsWatchId = watchId;
  };

  const stopLocationTracking = () => {
    if (window.gpsWatchId) {
      navigator.geolocation.clearWatch(window.gpsWatchId);
    }
  };

  // Toggle Online Status
  const handleToggleOnline = async () => {
    if (!location.lat || !location.lng) {
      toast.error('GPS location not available. Please enable location access.');
      return;
    }
    setOnlineToggleLoading(true);
    try {
      const address = await getAddressFromCoords(location.lat, location.lng);
      const res = await driverService.toggleOnline(location.lat, location.lng);
      if (res.success) {
        const goingOnline = !isOnlineRef.current;
        isOnlineRef.current = goingOnline;
        setProfile(prev => ({ ...prev, isOnline: goingOnline }));
        if (goingOnline) {
          await driverService.updateLocation(location.lat, location.lng, address);
          toast.success(`You are now Online 📍 ${address}`);
        } else {
          toast.success('You are now Offline');
        }
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle status');
    } finally {
      setOnlineToggleLoading(false);
    }
  };

  // Accept Ride Request
  const handleAcceptRide = async (requestId) => {
    try {
      const res = await driverService.respondToRequest(requestId, 'accept');
      if (res.success) {
        toast.success('Ride accepted!');
        fetchDashboardData();
        navigate(`/driver/trip/${res.booking?._id || requestId}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to accept ride');
    }
  };

  // Reject Ride Request
  const handleRejectRide = async (requestId) => {
    try {
      const res = await driverService.respondToRequest(requestId, 'reject');
      if (res.success) {
        toast.info('Ride rejected');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to reject ride');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalTrips = tripHistory.length;
    const completedTrips = tripHistory.filter(t => t.status === 'completed').length;
    const cancelledTrips = tripHistory.filter(t => t.status === 'cancelled').length;
    const totalEarnings = wallet?.totalEarnings || 0;
    const walletBalance = wallet?.walletBalance || 0;
    const avgRating = profile?.rating || 0;
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return {
      totalTrips,
      completedTrips,
      cancelledTrips,
      totalEarnings,
      walletBalance,
      avgRating,
      unreadCount,
      successRate: totalTrips ? (completedTrips / totalTrips) * 100 : 0
    };
  }, [tripHistory, wallet, profile, notifications]);

  // Chart Data
  const tripStatusData = [
    { name: 'Completed', value: stats.completedTrips, color: CHART_COLORS.success },
    { name: 'Cancelled', value: stats.cancelledTrips, color: CHART_COLORS.danger },
    { name: 'Pending', value: tripHistory.filter(t => t.status === 'pending').length, color: CHART_COLORS.warning }
  ].filter(item => item.value > 0);

  const earningsData = [
    { name: 'Total Earnings', value: stats.totalEarnings, color: CHART_COLORS.success },
    { name: 'Wallet Balance', value: stats.walletBalance, color: CHART_COLORS.primary }
  ].filter(item => item.value > 0);

  // Monthly Earnings Trend
  const monthlyData = useMemo(() => {
    const months = {};
    tripHistory.forEach(trip => {
      const month = new Date(trip.createdAt).toLocaleString('default', { month: 'short' });
      if (!months[month]) months[month] = 0;
      months[month] += trip.earnings || 0;
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [tripHistory]);

  // Rating Gauge
  const ratingGaugeOptions = {
    chart: { type: 'solidgauge', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    pane: {
      center: ['50%', '70%'],
      size: '100%',
      startAngle: -90,
      endAngle: 90,
      background: { backgroundColor: CHART_COLORS.lightGray, innerRadius: '60%', outerRadius: '100%', shape: 'arc' }
    },
    tooltip: { enabled: false },
    yAxis: { min: 0, max: 5, stops: [[0.2, CHART_COLORS.danger], [0.4, CHART_COLORS.warning], [0.6, CHART_COLORS.warning], [0.8, CHART_COLORS.success], [1, CHART_COLORS.success]], lineWidth: 0, tickWidth: 0 },
    plotOptions: {
      solidgauge: {
        dataLabels: { y: -20, borderWidth: 0, useHTML: true, format: '<div style="text-align:center"><span style="font-size:28px">{point.y:.1f}</span><br/><span style="font-size:10px">★ Rating</span></div>' }
      }
    },
    series: [{ name: 'Rating', data: [stats.avgRating] }],
    credits: { enabled: false }
  };

  // Daily Trips Trend
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

  const lineOptions = {
    chart: { type: 'spline', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: dailyTripsData.map(d => d.day) },
    yAxis: { title: { text: 'Trips' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '{point.y} trips' },
    plotOptions: { spline: { marker: { radius: 4 }, color: CHART_COLORS.primary, lineWidth: 2 } },
    series: [{ name: 'Trips', data: dailyTripsData.map(d => d.count) }],
    credits: { enabled: false }
  };

  const pieOptions = (data, title) => ({
    chart: { type: 'pie', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    tooltip: { pointFormat: '{point.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' },
    plotOptions: { pie: { innerRadius: '60%', dataLabels: { enabled: false }, showInLegend: true } },
    series: [{ name: title, colorByPoint: true, data: data.map(d => ({ name: d.name, y: d.value, color: d.color })) }],
    legend: { enabled: true, layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px' } },
    credits: { enabled: false }
  });

  const barOptions = {
    chart: { type: 'column', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: monthlyData.map(d => d.month) },
    yAxis: { title: { text: 'Earnings (₹)' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '₹{point.y}' },
    plotOptions: { column: { borderRadius: 4, color: CHART_COLORS.success } },
    series: [{ name: 'Earnings', data: monthlyData.map(d => d.amount) }],
    credits: { enabled: false }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 px-4 sm:px-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            {profile?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.name || 'Driver'}!</h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <FaStar className="text-yellow-400" size={14} />
                <span className="text-sm font-medium">{profile?.rating || 0} ★</span>
              </div>
              <div className="w-px h-3 bg-gray-300" />
              <span className="text-sm text-gray-500">{profile?.carModel || 'Car not assigned'}</span>
              <div className="w-px h-3 bg-gray-300" />
              <span className="text-sm text-gray-500">{profile?.carNumber || 'No plate'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/driver/notifications')}
            className="relative p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
          >
            <FaBell size={18} className="text-gray-600" />
            {stats.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {stats.unreadCount}
              </span>
            )}
          </button>
          <OnlineToggle isOnline={profile?.isOnline} onToggle={handleToggleOnline} loading={onlineToggleLoading} />
          <button onClick={fetchDashboardData} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all">
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
          <button key={type} onClick={() => setSelectedChart(type)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedChart === type ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)} Charts
          </button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Chart 1: Trip Status */}
        {(selectedChart === 'all' || selectedChart === 'status') && (
          <ChartCard title="Trip Status" icon={PieChart} subtitle="Distribution by status">
            {tripStatusData.length > 0 ? <HighchartsReact highcharts={Highcharts} options={pieOptions(tripStatusData, 'Trips')} /> : <div className="h-[200px] flex items-center justify-center text-gray-400">No data</div>}
          </ChartCard>
        )}

        {/* Chart 2: Earnings Overview */}
        {(selectedChart === 'all' || selectedChart === 'earnings') && (
          <ChartCard title="Earnings Overview" icon={BarChart3} subtitle="Earnings vs Wallet">
            {earningsData.length > 0 ? <HighchartsReact highcharts={Highcharts} options={pieOptions(earningsData, 'Earnings')} /> : <div className="h-[200px] flex items-center justify-center text-gray-400">No data</div>}
          </ChartCard>
        )}

        {/* Chart 3: Rating Gauge */}
        {(selectedChart === 'all' || selectedChart === 'performance') && (
          <ChartCard title="Driver Rating" icon={Gauge} subtitle="Current rating out of 5">
            <HighchartsReact highcharts={Highcharts} options={ratingGaugeOptions} />
          </ChartCard>
        )}

        {/* Chart 4: Monthly Earnings */}
        {(selectedChart === 'all' || selectedChart === 'trends') && monthlyData.length > 0 && (
          <ChartCard title="Monthly Earnings" icon={BarChart3} subtitle="Earnings by month">
            <HighchartsReact highcharts={Highcharts} options={barOptions} />
          </ChartCard>
        )}

        {/* Chart 5: Daily Trips */}
        {(selectedChart === 'all' || selectedChart === 'trends') && (
          <ChartCard title="Daily Trips" icon={LineChart} subtitle="Trips per day">
            <HighchartsReact highcharts={Highcharts} options={lineOptions} />
          </ChartCard>
        )}

        {/* Chart 6: Location Status */}
        <ChartCard title="Location Status" icon={MapPin} subtitle="Current GPS location">
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Latitude:</span><span className="font-mono">{location.lat?.toFixed(6) || '—'}</span></div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Longitude:</span><span className="font-mono">{location.lng?.toFixed(6) || '—'}</span></div>
            <div className="flex justify-between p-3 bg-green-50 rounded-lg"><span>Status:</span><span className={`px-2 py-1 rounded-full text-xs font-medium ${profile?.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{profile?.isOnline ? 'Online' : 'Offline'}</span></div>
            <div className="text-center text-xs text-gray-400">GPS updates every 30 sec</div>
          </div>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => navigate('/driver/wallet')} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-5 hover:from-blue-700 hover:to-blue-800 flex items-center gap-3"><FaWallet size={24} /><div><h3 className="font-semibold">Wallet</h3><p className="text-xs">Balance & withdraw</p></div></button>
        <button onClick={() => navigate('/driver/trips')} className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-5 hover:from-green-700 hover:to-green-800 flex items-center gap-3"><FaHistory size={24} /><div><h3 className="font-semibold">Trip History</h3><p className="text-xs">All trips</p></div></button>
        <button onClick={() => navigate('/driver/profile')} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl p-5 hover:from-purple-700 hover:to-purple-800 flex items-center gap-3"><FaUser size={24} /><div><h3 className="font-semibold">Profile</h3><p className="text-xs">Update details</p></div></button>
        <button onClick={() => navigate('/driver/support')} className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl p-5 hover:from-orange-700 hover:to-orange-800 flex items-center gap-3"><FaHeadset size={24} /><div><h3 className="font-semibold">Support</h3><p className="text-xs">Get help</p></div></button>
      </div>
    </div>
  );
}
