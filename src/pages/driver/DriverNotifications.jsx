// src/pages/driver/DriverNotifications.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  FaBell, FaSync, FaRegClock, FaInfoCircle, FaArrowLeft,
  FaChartLine, FaChartPie, FaChartBar, FaEye, FaTrash,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaStar, FaSearch
} from 'react-icons/fa';
import {
  BellOff, TrendingUp, Calendar, Filter, X, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight
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
  pink: '#EC4899',
  gray: '#94A3B8',
  lightGray: '#E5E7EB'
};

// Chart Card Component
const ChartCard = ({ title, icon: Icon, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-lg transition-all">
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 bg-blue-50 rounded-lg">
        <Icon className="text-blue-600" size={14} />
      </div>
      <h4 className="text-xs font-semibold text-gray-700">{title}</h4>
      {subtitle && <span className="text-xs text-gray-400 ml-auto">{subtitle}</span>}
    </div>
    {children}
  </div>
);

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: color + '15' }}>
        <Icon className="text-lg" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export default function DriverNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedChart, setSelectedChart] = useState('all');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await driverService.getNotifications();
      setNotifications(res?.notifications || res || []);
    } catch (err) { toast.error('Failed to load notifications'); } finally { setLoading(false); }
  };

  const getTimeAgo = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getIcon = (title) => {
    const lower = title?.toLowerCase() || '';
    if (lower.includes('trip') || lower.includes('ride')) return { icon: FaInfoCircle, color: '#3B82F6', bg: '#3B82F615', label: 'Trip' };
    if (lower.includes('payment') || lower.includes('earning') || lower.includes('wallet')) return { icon: FaInfoCircle, color: '#10B981', bg: '#10B98115', label: 'Payment' };
    if (lower.includes('alert') || lower.includes('warning')) return { icon: FaExclamationTriangle, color: '#F59E0B', bg: '#F59E0B15', label: 'Alert' };
    if (lower.includes('system')) return { icon: FaInfoCircle, color: '#8B5CF6', bg: '#8B5CF615', label: 'System' };
    return { icon: FaInfoCircle, color: '#94A3B8', bg: '#94A3B815', label: 'Info' };
  };

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const read = total - unread;
    const today = notifications.filter(n => {
      const today = new Date().toDateString();
      return new Date(n.createdAt).toDateString() === today;
    }).length;
    const thisWeek = notifications.filter(n => {
      const now = new Date();
      const then = new Date(n.createdAt);
      const diff = (now - then) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;

    // Category distribution
    const categories = {
      Trip: notifications.filter(n => n.title?.toLowerCase().includes('trip') || n.title?.toLowerCase().includes('ride')).length,
      Payment: notifications.filter(n => n.title?.toLowerCase().includes('payment') || n.title?.toLowerCase().includes('earning')).length,
      Alert: notifications.filter(n => n.title?.toLowerCase().includes('alert') || n.title?.toLowerCase().includes('warning')).length,
      System: notifications.filter(n => n.title?.toLowerCase().includes('system')).length
    };

    return { total, unread, read, today, thisWeek, categories };
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (filter !== 'all') {
      filtered = filtered.filter(n => filter === 'unread' ? !n.read : n.read);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, filter, search]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const displayedNotifications = filteredNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Chart 1: Notification Status Distribution - Pie Chart
  const statusData = [
    { name: 'Unread', value: stats.unread, color: CHART_COLORS.primary },
    { name: 'Read', value: stats.read, color: CHART_COLORS.gray }
  ].filter(item => item.value > 0);

  // Chart 2: Category Distribution - Bar Chart
  const categoryData = Object.entries(stats.categories).map(([name, value]) => ({ name, value }));

  // Chart 3: Weekly Trend - Line Chart
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const count = notifications.filter(n => new Date(n.createdAt).toDateString() === date.toDateString()).length;
    return { day: dayName, count };
  }).reverse();

  // Chart 4: Daily Distribution - Bar Chart
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0') + ':00';
    const count = notifications.filter(n => new Date(n.createdAt).getHours() === i).length;
    return { hour, count };
  });

  // === HIGHCHARTS CONFIG ===
  const pieOptions = (data, title) => ({
    chart: { type: 'pie', height: 180, style: { fontFamily: 'inherit' } },
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

  const barOptions = {
    chart: { type: 'column', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: categoryData.map(d => d.name), labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'Count' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '{point.y} notifications' },
    plotOptions: { column: { borderRadius: 4, color: CHART_COLORS.purple } },
    series: [{ name: 'Notifications', data: categoryData.map(d => d.value) }],
    credits: { enabled: false }
  };

  const lineOptions = {
    chart: { type: 'spline', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: weeklyData.map(d => d.day), labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'Count' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '{point.y} notifications' },
    plotOptions: {
      spline: {
        marker: { radius: 4 },
        color: CHART_COLORS.primary,
        lineWidth: 2,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [[0, 'rgba(59, 130, 246, 0.3)'], [1, 'rgba(59, 130, 246, 0.0)']]
        }
      }
    },
    series: [{ name: 'Notifications', data: weeklyData.map(d => d.count) }],
    credits: { enabled: false }
  };

  const hourlyBarOptions = {
    chart: { type: 'column', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: hourlyData.map(d => d.hour), labels: { rotation: -45, style: { fontSize: '8px' }, step: 3 } },
    yAxis: { title: { text: 'Count' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '{point.y} notifications' },
    plotOptions: { column: { borderRadius: 4, color: CHART_COLORS.orange } },
    series: [{ name: 'Notifications', data: hourlyData.map(d => d.count) }],
    credits: { enabled: false }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-4">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaBell className="text-blue-600" />
                Notifications
              </h1>
              <p className="text-sm text-gray-500 mt-1">Stay updated with your ride alerts and earnings</p>
            </div>
          </div>
          <button
            onClick={fetchNotifications}
            className="p-2.5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Notifications" value={stats.total} icon={FaBell} color={CHART_COLORS.primary} />
          <StatCard label="Unread" value={stats.unread} icon={FaClock} color={CHART_COLORS.warning} subtitle={`${stats.read} read`} />
          <StatCard label="Today" value={stats.today} icon={FaRegClock} color={CHART_COLORS.success} />
          <StatCard label="This Week" value={stats.thisWeek} icon={Calendar} color={CHART_COLORS.purple} />
        </div>

        {/* Chart Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'status', 'category', 'trends', 'hourly'].map((type) => (
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* Chart 1: Status Distribution */}
          {(selectedChart === 'all' || selectedChart === 'status') && (
            <ChartCard title="Status Distribution" icon={FaChartPie} subtitle="Unread vs Read">
              {statusData.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={pieOptions(statusData, 'Status')} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>
          )}

          {/* Chart 2: Category Distribution */}
          {(selectedChart === 'all' || selectedChart === 'category') && (
            <ChartCard title="Category Distribution" icon={FaChartBar} subtitle="By notification type">
              {categoryData.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={barOptions} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>
          )}

          {/* Chart 3: Weekly Trend */}
          {(selectedChart === 'all' || selectedChart === 'trends') && (
            <ChartCard title="Weekly Trend" icon={FaChartLine} subtitle="Last 7 days">
              <HighchartsReact highcharts={Highcharts} options={lineOptions} />
            </ChartCard>
          )}

          {/* Chart 4: Hourly Distribution */}
          {(selectedChart === 'all' || selectedChart === 'hourly') && (
            <ChartCard title="Hourly Distribution" icon={FaChartBar} subtitle="Notifications by hour">
              <HighchartsReact highcharts={Highcharts} options={hourlyBarOptions} />
            </ChartCard>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => { setFilter('unread'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'unread' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Unread
              </button>
              <button
                onClick={() => { setFilter('read'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'read' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Read
              </button>
            </div>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <BellOff size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500 text-sm">You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedNotifications.map((n) => {
                const icon = getIcon(n.title);
                const IconTag = icon.icon;
                return (
                  <div
                    key={n._id}
                    className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer group ${!n.read ? 'border-blue-200 shadow-sm bg-gradient-to-r from-white to-blue-50/30' : 'border-gray-200'
                      }`}
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                          style={{ backgroundColor: icon.bg }}
                        >
                          <IconTag size={20} style={{ color: icon.color }} />
                        </div>
                        {!n.read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {n.title}
                              </h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: icon.bg, color: icon.color }}>
                                {icon.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <FaRegClock size={10} />
                                {getTimeAgo(n.createdAt)}
                              </span>
                              <span className="text-xs text-gray-400">
                                From: {n.createdByModel || 'System'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {/* Mark as read logic */ }}
                            className={`opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg ${!n.read ? 'hover:bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-400'
                              }`}
                          >
                            {!n.read ? <FaCheckCircle size={14} /> : <FaEye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {filteredNotifications.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Showing {Math.min(filteredNotifications.length, (currentPage - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredNotifications.length, currentPage * itemsPerPage)} of {filteredNotifications.length}
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {[10, 20, 50].map(v => <option key={v} value={v}>{v} per page</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}