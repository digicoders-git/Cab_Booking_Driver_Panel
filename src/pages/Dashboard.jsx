import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../api/driverApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { getSocket } from '../socket/socket';
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
  FaArrowUp, FaArrowDown, FaRoute, FaTachometerAlt, FaHeadset
} from 'react-icons/fa';
import {
  TrendingUp, DollarSign, Activity, Target, Gauge, MapPin,
  Navigation, Clock, Calendar, Award, Medal, Users,
  PieChart, BarChart3, LineChart, MoreVertical
} from 'lucide-react';
import Swal from 'sweetalert2';

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
const ChartCard = ({ title, icon: Icon, subtitle, children, action }) => (
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
      {action && (
        <button className="p-1.5 hover:bg-gray-100 rounded-lg">
          <MoreVertical size={14} className="text-gray-400" />
        </button>
      )}
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
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${isOnline
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
  const { admin: driver } = useAuth();

  // States
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineToggleLoading, setOnlineToggleLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [selectedChart, setSelectedChart] = useState('all');

  // Fetch all data
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      const [profileRes, walletRes, pendingRes, tripsRes] = await Promise.all([
        driverService.getProfile(),
        driverService.getWalletBalance(),
        driverService.getPendingRequests(),
        driverService.getMyTrips()
      ]);

      setProfile(profileRes?.driver || profileRes || {});
      setWallet(walletRes?.wallet || walletRes || {});
      setPendingRequests(pendingRes?.requests || pendingRes || []);
      setTripHistory(tripsRes?.trips || tripsRes || []);

      // Update auth context
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

    // DashboardLayout already socket manage karta hai — sirf events sun lo
    const socket = getSocket();
    if (!socket) return;

    socket.on('new_ride_request', (data) => {
      toast.success(`🚗 New Ride! Pickup: ${data.pickup || ''} | Fare: ₹${data.fare || ''}`, { duration: 8000 });
      fetchDashboardData();
    });

    socket.on('ride_status_update', (data) => {
      toast.info(`Ride status: ${data.status}`);
      fetchDashboardData();
    });

    socket.on('admin_message', (data) => {
      toast.info(`📢 Admin: ${data.message}`);
    });

    return () => {
      socket.off('new_ride_request');
      socket.off('ride_status_update');
      socket.off('admin_message');
    };
  }, []);

  const handleToggleOnline = async () => {
    setOnlineToggleLoading(true);
    try {
      await driverService.toggleOnline(null, null);
      setProfile(prev => ({ ...prev, isOnline: !prev?.isOnline }));
      toast.info(profile?.isOnline ? '🔴 You are now Offline' : '🟢 You are now Online!');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setOnlineToggleLoading(false);
    }
  };

  // Accept Ride Request
  const handleAcceptRide = async (requestId) => {
    try {
      const res = await driverService.respondToRequest(requestId, 'accept');
      if (res.success) {
        const otp = res.booking?.tripData?.startOtp;
        toast.success(`✅ Ride Accepted! ${otp ? `OTP: ${otp}` : ''}`, { duration: 6000 });
        fetchDashboardData();
        if (res.booking?._id) {
          navigate(`/driver/trip/${res.booking._id}`);
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to accept ride');
    }
  };

  // Reject Ride Request
  const handleRejectRide = async (requestId) => {
    try {
      const res = await driverService.respondToRequest(requestId, 'reject');
      if (res.success) {
        toast.info('❌ Ride Rejected');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reject ride');
    }
  };

  // Start Trip
  const handleStartTrip = async (bookingId, otp) => {
    const { value: enteredOtp } = await Swal.fire({
      title: 'Enter OTP',
      input: 'text',
      inputLabel: 'Please enter the 4-digit OTP from passenger',
      inputPlaceholder: '1234',
      showCancelButton: true,
      confirmButtonText: 'Start Trip',
      confirmButtonColor: '#3B82F6'
    });

    if (!enteredOtp) return;

    try {
      const res = await driverService.startTrip(bookingId, enteredOtp);
      if (res.success) {
        toast.success('Trip started!');
        fetchDashboardData();
        navigate(`/driver/trip/${bookingId}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Invalid OTP or trip cannot be started');
    }
  };

  // End Trip
  const handleEndTrip = async (bookingId) => {
    const result = await Swal.fire({
      title: 'End Trip?',
      text: 'Are you sure you want to end this trip?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, End Trip',
      confirmButtonColor: '#10B981',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await driverService.endTrip(bookingId);
      if (res.success) {
        toast.success('Trip completed!');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to end trip');
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

    return {
      totalTrips,
      completedTrips,
      cancelledTrips,
      totalEarnings,
      walletBalance,
      avgRating,
      successRate: totalTrips ? (completedTrips / totalTrips) * 100 : 0
    };
  }, [tripHistory, wallet, profile]);

  // Chart 1: Trip Status Distribution
  const tripStatusData = [
    { name: 'Completed', value: stats.completedTrips, color: CHART_COLORS.success },
    { name: 'Pending', value: tripHistory.filter(t => t.status === 'pending').length, color: CHART_COLORS.warning },
    { name: 'Ongoing', value: tripHistory.filter(t => t.status === 'ongoing').length, color: CHART_COLORS.primary },
    { name: 'Cancelled', value: stats.cancelledTrips, color: CHART_COLORS.danger }
  ].filter(item => item.value > 0);

  // Chart 2: Earnings Overview
  const earningsData = [
    { name: 'Total Earnings', value: stats.totalEarnings, color: CHART_COLORS.success },
    { name: 'Wallet Balance', value: stats.walletBalance, color: CHART_COLORS.primary }
  ].filter(item => item.value > 0);

  // Chart 3: Monthly Earnings Trend
  const monthlyData = useMemo(() => {
    const months = {};
    tripHistory.forEach(trip => {
      const month = new Date(trip.createdAt).toLocaleString('default', { month: 'short' });
      if (!months[month]) months[month] = 0;
      months[month] += trip.earnings || 0;
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [tripHistory]);

  // Chart 4: Rating Gauge
  const ratingGaugeOptions = {
    chart: { type: 'solidgauge', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    pane: {
      center: ['50%', '70%'],
      size: '100%',
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor: CHART_COLORS.lightGray,
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc'
      }
    },
    tooltip: { enabled: false },
    yAxis: {
      min: 0,
      max: 5,
      stops: [
        [0.2, CHART_COLORS.danger],
        [0.4, CHART_COLORS.warning],
        [0.6, CHART_COLORS.warning],
        [0.8, CHART_COLORS.success],
        [1, CHART_COLORS.success]
      ],
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: null,
      tickAmount: 2,
      labels: { y: 16 }
    },
    plotOptions: {
      solidgauge: {
        dataLabels: {
          y: -20,
          borderWidth: 0,
          useHTML: true,
          format: '<div style="text-align:center"><span style="font-size:28px">{point.y:.1f}</span><br/><span style="font-size:10px">★ Rating</span></div>'
        }
      }
    },
    series: [{ name: 'Rating', data: [stats.avgRating] }],
    credits: { enabled: false }
  };

  // Chart 5: Performance Radar
  const radarData = [
    { metric: 'Completion', value: stats.successRate, fullMark: 100 },
    { metric: 'Earnings', value: (stats.totalEarnings / 1000) * 100, fullMark: 100 },
    { metric: 'Rating', value: (stats.avgRating / 5) * 100, fullMark: 100 },
    { metric: 'Trips', value: (stats.totalTrips / 20) * 100, fullMark: 100 }
  ];

  const radarOptions = {
    chart: { polar: true, type: 'line', height: 220, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: radarData.map(d => d.metric), tickmarkPlacement: 'on', lineWidth: 0 },
    yAxis: { gridLineInterpolation: 'polygon', lineWidth: 0, min: 0, max: 100 },
    legend: { enabled: false },
    series: [{
      name: 'Performance',
      data: radarData.map(d => d.value),
      pointPlacement: 'on',
      color: CHART_COLORS.purple,
      fillOpacity: 0.3,
      marker: { radius: 4 }
    }],
    credits: { enabled: false }
  };

  // Chart 6: Daily Trips Trend
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
    plotOptions: {
      spline: {
        marker: { radius: 4 },
        color: CHART_COLORS.primary,
        lineWidth: 2
      }
    },
    series: [{ name: 'Trips', data: dailyTripsData.map(d => d.count) }],
    credits: { enabled: false }
  };

  // Chart 7: Earnings vs Trips Bar
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

  // === HIGHCHARTS CONFIG ===
  const pieOptions = (data, title) => ({
    chart: { type: 'pie', height: 200, style: { fontFamily: 'inherit' } },
    title: { text: null },
    tooltip: { pointFormat: '{point.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' },
    plotOptions: {
      pie: {
        innerRadius: '60%',
        dataLabels: { enabled: false },
        showInLegend: true
      }
    },
    series: [{
      name: title,
      colorByPoint: true,
      data: data.map(d => ({ name: d.name, y: d.value, color: d.color }))
    }],
    legend: { enabled: true, layout: 'vertical', align: 'right', verticalAlign: 'middle', itemStyle: { fontSize: '10px' } },
    credits: { enabled: false }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading driver dashboard...</p>
        </div>
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
              <span className="text-sm text-gray-500">{profile?.carModel || profile?.carDetails?.carModel || 'Car not assigned'}</span>
              <div className="w-px h-3 bg-gray-300" />
              <span className="text-sm text-gray-500">{profile?.carNumber || profile?.carDetails?.carNumber || 'No plate'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OnlineToggle
            isOnline={profile?.isOnline}
            onToggle={handleToggleOnline}
            loading={onlineToggleLoading}
          />
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
            disabled={refreshing}
          >
            <FaSync className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Trips"
          value={stats.totalTrips}
          icon={FaRoute}
          color={CHART_COLORS.primary}
          trend={12}
        />
        <StatCard
          label="Completed"
          value={stats.completedTrips}
          icon={FaCheckCircle}
          color={CHART_COLORS.success}
          trend={8}
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={Target}
          color={stats.successRate >= 70 ? CHART_COLORS.success : CHART_COLORS.warning}
        />
        <StatCard
          label="Total Earnings"
          value={`₹${stats.totalEarnings.toLocaleString()}`}
          icon={DollarSign}
          color={CHART_COLORS.success}
          trend={15}
        />
        <StatCard
          label="Wallet Balance"
          value={`₹${stats.walletBalance.toLocaleString()}`}
          icon={FaWallet}
          color={stats.walletBalance > 0 ? CHART_COLORS.success : CHART_COLORS.warning}
        />
        <StatCard
          label="Rating"
          value={`${stats.avgRating.toFixed(1)}★`}
          icon={FaStar}
          color={CHART_COLORS.orange}
        />
      </div>

      {/* Chart Selector */}
      <div className="flex flex-wrap gap-2">
        {['all', 'status', 'earnings', 'performance', 'trends'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedChart(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedChart === type
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} Charts
          </button>
        ))}
      </div>

      {/* Charts Section - 7 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Chart 1: Trip Status Distribution */}
        {(selectedChart === 'all' || selectedChart === 'status') && (
          <ChartCard title="Trip Status" icon={PieChart} subtitle="Distribution by status">
            {tripStatusData.length > 0 ? (
              <HighchartsReact highcharts={Highcharts} options={pieOptions(tripStatusData, 'Trips')} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                No trip data available
              </div>
            )}
          </ChartCard>
        )}

        {/* Chart 2: Earnings Overview */}
        {(selectedChart === 'all' || selectedChart === 'earnings') && (
          <ChartCard title="Earnings Overview" icon={BarChart3} subtitle="Earnings vs Wallet">
            {earningsData.length > 0 ? (
              <HighchartsReact highcharts={Highcharts} options={pieOptions(earningsData, 'Earnings')} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                No earnings data
              </div>
            )}
          </ChartCard>
        )}

        {/* Chart 3: Rating Gauge */}
        {(selectedChart === 'all' || selectedChart === 'performance') && (
          <ChartCard title="Driver Rating" icon={Gauge} subtitle="Current rating out of 5">
            <HighchartsReact highcharts={Highcharts} options={ratingGaugeOptions} />
          </ChartCard>
        )}

        {/* Chart 4: Monthly Earnings Trend */}
        {(selectedChart === 'all' || selectedChart === 'trends') && monthlyData.length > 0 && (
          <ChartCard title="Monthly Earnings" icon={BarChart3} subtitle="Earnings by month">
            <HighchartsReact highcharts={Highcharts} options={barOptions} />
          </ChartCard>
        )}

        {/* Chart 5: Daily Trips Trend */}
        {(selectedChart === 'all' || selectedChart === 'trends') && (
          <ChartCard title="Daily Trips" icon={LineChart} subtitle="Trips per day">
            <HighchartsReact highcharts={Highcharts} options={lineOptions} />
          </ChartCard>
        )}

        {/* Chart 6: Performance Radar */}
        {(selectedChart === 'all' || selectedChart === 'performance') && (
          <ChartCard title="Performance Radar" icon={Activity} subtitle="Multi-metric analysis">
            <HighchartsReact highcharts={Highcharts} options={radarOptions} />
          </ChartCard>
        )}

        {/* Chart 7: Location Status */}
        <ChartCard title="Location Status" icon={MapPin} subtitle="Current GPS location">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Latitude:</span>
              <span className="font-mono text-sm font-medium">{location.lat?.toFixed(6) || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Longitude:</span>
              <span className="font-mono text-sm font-medium">{location.lng?.toFixed(6) || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${profile?.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {profile?.isOnline ? 'Online • Ready for rides' : 'Offline'}
              </span>
            </div>
            <div className="text-center text-xs text-gray-400 mt-2">
              GPS auto-updates every 30 seconds
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Pending Ride Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-2">
            <FaClock className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Pending Ride Requests ({pendingRequests.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingRequests.map((req, idx) => {
              // Backend response: req._id = requestId, req.booking = booking details
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
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Navigation size={12} /> {pickup.address?.split(',')[0] || '—'}</span>
                        <span>→</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {drop.address?.split(',')[0] || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₹{booking.fareEstimate || 0}</p>
                      <p className="text-xs text-gray-500">{booking.rideType || 'Ride'} • {booking.estimatedDistanceKm || 0} km</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRide(req._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRide(req._id)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ongoing Trip Alert */}
      {tripHistory.some(t => t.status === 'ongoing') && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <FaRoute size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">You have an ongoing trip!</h3>
                <p className="text-white/80 text-sm">Please complete the current trip before accepting new rides.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const ongoingTrip = tripHistory.find(t => t.status === 'ongoing');
                if (ongoingTrip) navigate(`/driver/trip/${ongoingTrip._id}`);
              }}
              className="px-6 py-2 bg-white text-orange-600 rounded-xl hover:bg-gray-100 transition-all font-medium"
            >
              View Ongoing Trip →
            </button>
          </div>
        </div>
      )}

      {/* Recent Trips */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Trips</h3>
          </div>
          <button
            onClick={() => navigate('/driver/trips')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {tripHistory.slice(0, 5).map((trip, idx) => (
            <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trip.status === 'completed' ? 'bg-green-100' :
                      trip.status === 'ongoing' ? 'bg-blue-100' :
                        trip.status === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                    {trip.status === 'completed' ? <FaCheckCircle className="text-green-600" /> :
                      trip.status === 'ongoing' ? <FaClock className="text-blue-600" /> :
                        trip.status === 'cancelled' ? <FaBan className="text-red-600" /> :
                          <FaRoute className="text-gray-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Trip #{trip._id?.slice(-8)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{new Date(trip.createdAt).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="flex items-center gap-1"><Navigation size={10} /> {trip.pickup?.address?.split(',')[0]}</span>
                      <span>→</span>
                      <span>{trip.drop?.address?.split(',')[0]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">₹{trip.fareEstimate || 0}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                        trip.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                          trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                      }`}>
                      {trip.status || 'Pending'}
                    </span>
                  </div>
                  {trip.status === 'ongoing' && trip.tripData?.startOtp && (
                    <button
                      onClick={() => handleStartTrip(trip._id, trip.tripData.startOtp)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                    >
                      Continue Trip
                    </button>
                  )}
                  {trip.status === 'ongoing' && !trip.tripData?.startOtp && (
                    <button
                      onClick={() => handleStartTrip(trip._id, trip.tripData?.startOtp)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
                    >
                      Start Trip
                    </button>
                  )}
                  {trip.status === 'ongoing' && trip.tripData?.startedAt && !trip.tripData?.endedAt && (
                    <button
                      onClick={() => handleEndTrip(trip._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
                    >
                      End Trip
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {tripHistory.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <FaCar className="mx-auto text-4xl mb-3 opacity-30" />
              <p>No trips yet. Go online to start receiving ride requests!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/driver/wallet')}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-5 hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-3 shadow-lg"
        >
          <FaWallet size={24} />
          <div className="text-left">
            <h3 className="font-semibold">Wallet</h3>
            <p className="text-xs text-blue-100">Check balance & withdraw</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/driver/trips')}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-5 hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-3 shadow-lg"
        >
          <FaHistory size={24} />
          <div className="text-left">
            <h3 className="font-semibold">Trip History</h3>
            <p className="text-xs text-green-100">View all your trips</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/driver/profile')}
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl p-5 hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-3 shadow-lg"
        >
          <FaUser size={24} />
          <div className="text-left">
            <h3 className="font-semibold">Profile</h3>
            <p className="text-xs text-purple-100">Update your details</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/driver/support')}
          className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl p-5 hover:from-orange-700 hover:to-orange-800 transition-all flex items-center gap-3 shadow-lg"
        >
          <FaHeadset size={24} />
          <div className="text-left">
            <h3 className="font-semibold">Support</h3>
            <p className="text-xs text-orange-100">Get help 24/7</p>
          </div>
        </button>
      </div>
    </div>
  );
}