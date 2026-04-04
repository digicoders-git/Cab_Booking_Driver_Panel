// src/pages/driver/DriverSupport.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HC_more from 'highcharts/highcharts-more';
import HC_solidGauge from 'highcharts/modules/solid-gauge';

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
import {
  FaHeadset, FaTicketAlt, FaPlus, FaEye, FaArrowLeft, FaSync,
  FaChartPie, FaChartBar, FaChartLine, FaClock, FaCheckCircle,
  FaExclamationTriangle, FaInfoCircle, FaTrash, FaEdit, FaSearch
} from 'react-icons/fa';
import {
  Calendar, Filter, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, MessageSquare, User,
  Clock, AlertCircle, CheckCircle2, HelpCircle
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
  lightGray: '#E5E7EB',
  yellow: '#F59E0B',
  green: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444'
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

export default function DriverSupport() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedChart, setSelectedChart] = useState('all');

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const ticketsRes = await driverService.getMyTickets();
      setTickets(ticketsRes?.requests || ticketsRes?.tickets || []);
    } catch (err) { toast.error('Failed to load tickets'); } finally { setLoading(false); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status?.toLowerCase() === 'open').length;
    const inProgress = tickets.filter(t => t.status?.toLowerCase() === 'in-progress').length;
    const resolved = tickets.filter(t => t.status?.toLowerCase() === 'resolved').length;
    const closed = tickets.filter(t => t.status?.toLowerCase() === 'closed').length;
    const avgResponseTime = 24; // Mock data
    const resolutionRate = total ? ((resolved + closed) / total * 100).toFixed(1) : 0;

    return { total, open, inProgress, resolved, closed, avgResponseTime, resolutionRate };
  }, [tickets]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (filter !== 'all') {
      filtered = filtered.filter(t => t.status?.toLowerCase() === filter);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.subject?.toLowerCase().includes(q) ||
        t.message?.toLowerCase().includes(q) ||
        t._id?.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tickets, filter, search]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const displayedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return { label: 'Open', color: '#F59E0B', bg: '#F59E0B15', icon: AlertCircle };
      case 'in-progress': return { label: 'In Progress', color: '#3B82F6', bg: '#3B82F615', icon: Clock };
      case 'resolved': return { label: 'Resolved', color: '#10B981', bg: '#10B98115', icon: CheckCircle2 };
      case 'closed': return { label: 'Closed', color: '#94A3B8', bg: '#94A3B815', icon: X };
      default: return { label: status || 'Unknown', color: '#6B7280', bg: '#6B728015', icon: HelpCircle };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return toast.error('Please fill all fields');
    setSubmitting(true);
    try {
      const res = await driverService.createSupportTicket(subject, message);
      if (res.success) {
        toast.success('Ticket created successfully!');
        setShowForm(false);
        setSubject('');
        setMessage('');
        fetchTickets();
      }
    } catch (err) { toast.error('Failed to create ticket'); } finally { setSubmitting(false); }
  };

  // Chart 1: Ticket Status Distribution - Pie Chart
  const statusData = [
    { name: 'Open', value: stats.open, color: CHART_COLORS.warning },
    { name: 'In Progress', value: stats.inProgress, color: CHART_COLORS.primary },
    { name: 'Resolved', value: stats.resolved, color: CHART_COLORS.success },
    { name: 'Closed', value: stats.closed, color: CHART_COLORS.gray }
  ].filter(item => item.value > 0);

  // Chart 2: Weekly Ticket Trend - Line Chart
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const count = tickets.filter(t => new Date(t.createdAt).toDateString() === date.toDateString()).length;
    return { day: dayName, count };
  }).reverse();

  // Chart 3: Resolution Rate - Gauge Chart
  const gaugeOptions = {
    chart: { type: 'solidgauge', height: 160, style: { fontFamily: 'inherit' } },
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
      max: 100,
      stops: [
        [0.3, CHART_COLORS.danger],
        [0.6, CHART_COLORS.warning],
        [0.9, CHART_COLORS.success]
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
          format: '<div style="text-align:center"><span style="font-size:24px">{point.y:.0f}%</span><br/><span style="font-size:9px">Resolution Rate</span></div>'
        }
      }
    },
    series: [{ name: 'Resolution Rate', data: [parseFloat(stats.resolutionRate)] }],
    credits: { enabled: false }
  };

  // Chart 4: Monthly Ticket Trend - Bar Chart
  const monthlyData = useMemo(() => {
    const months = {};
    tickets.forEach(t => {
      const month = new Date(t.createdAt).toLocaleString('default', { month: 'short' });
      if (!months[month]) months[month] = 0;
      months[month]++;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [tickets]);

  const barOptions = {
    chart: { type: 'column', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: monthlyData.map(d => d.month), labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'Tickets' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '{point.y} tickets' },
    plotOptions: { column: { borderRadius: 4, color: CHART_COLORS.purple } },
    series: [{ name: 'Tickets', data: monthlyData.map(d => d.count) }],
    credits: { enabled: false }
  };

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

  const lineOptions = {
    chart: { type: 'spline', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: weeklyData.map(d => d.day), labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'Tickets' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '{point.y} tickets' },
    plotOptions: {
      spline: {
        marker: { radius: 4 },
        color: CHART_COLORS.primary,
        lineWidth: 2
      }
    },
    series: [{ name: 'Tickets', data: weeklyData.map(d => d.count) }],
    credits: { enabled: false }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaHeadset className="text-blue-600" />
                Support Center
              </h1>
              <p className="text-sm text-gray-500 mt-1">Get help with your issues and track your tickets</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Tickets" value={stats.total} icon={FaTicketAlt} color={CHART_COLORS.primary} />
          <StatCard label="Open" value={stats.open} icon={AlertCircle} color={CHART_COLORS.warning} subtitle="Awaiting response" />
          <StatCard label="In Progress" value={stats.inProgress} icon={Clock} color={CHART_COLORS.blue} />
          <StatCard label="Resolution Rate" value={`${stats.resolutionRate}%`} icon={CheckCircle2} color={CHART_COLORS.success} />
        </div>

        {/* Chart Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'status', 'trends', 'monthly'].map((type) => (
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
            <ChartCard title="Ticket Status" icon={FaChartPie} subtitle="Distribution by status">
              {statusData.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={pieOptions(statusData, 'Status')} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>
          )}

          {/* Chart 2: Resolution Rate Gauge */}
          {(selectedChart === 'all' || selectedChart === 'status') && (
            <ChartCard title="Resolution Rate" icon={FaChartBar} subtitle="Ticket completion rate">
              <HighchartsReact highcharts={Highcharts} options={gaugeOptions} />
            </ChartCard>
          )}

          {/* Chart 3: Weekly Trend */}
          {(selectedChart === 'all' || selectedChart === 'trends') && (
            <ChartCard title="Weekly Trend" icon={FaChartLine} subtitle="Last 7 days">
              <HighchartsReact highcharts={Highcharts} options={lineOptions} />
            </ChartCard>
          )}

          {/* Chart 4: Monthly Trend */}
          {(selectedChart === 'all' || selectedChart === 'monthly') && monthlyData.length > 0 && (
            <ChartCard title="Monthly Trend" icon={FaChartBar} subtitle="Tickets by month">
              <HighchartsReact highcharts={Highcharts} options={barOptions} />
            </ChartCard>
          )}
        </div>

        {/* Create Ticket Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md"
          >
            <FaPlus size={14} />
            New Support Ticket
          </button>
        </div>

        {/* Create Ticket Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <MessageSquare size={18} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Support Ticket</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  rows="4"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Please provide detailed information about your issue..."
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
              <button
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => { setFilter('open'); setCurrentPage(1); }}
                className={`px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === 'open' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Open
              </button>
              <button
                onClick={() => { setFilter('in-progress'); setCurrentPage(1); }}
                className={`px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === 'in-progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Progress
              </button>
              <button
                onClick={() => { setFilter('resolved'); setCurrentPage(1); }}
                className={`px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === 'resolved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Resolved
              </button>
              <button
                onClick={() => { setFilter('closed'); setCurrentPage(1); }}
                className={`px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === 'closed' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Closed
              </button>
            </div>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by subject, message, or ID..."
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

        {/* Tickets Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <FaTicketAlt className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">My Tickets ({filteredTickets.length})</h3>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-3">Loading tickets...</p>
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaHeadset size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No tickets found</p>
              <p className="text-sm text-gray-400 mt-1">Click "New Support Ticket" to create one</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-6 py-3 text-left">Ticket ID</th>
                      <th className="px-6 py-3 text-left">Subject</th>
                      <th className="px-6 py-3 text-left">Message</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Reply</th>
                      <th className="px-6 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedTickets.map((ticket) => {
                      const status = getStatusBadge(ticket.status);
                      const StatusIcon = status.icon;
                      return (
                        <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-medium text-gray-500">#{ticket._id?.slice(-6)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{ticket.subject}</p>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p className="text-sm text-gray-600 line-clamp-2">{ticket.message}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: status.bg, color: status.color }}>
                              <StatusIcon size={10} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600">{ticket.reply || <span className="text-gray-400 italic">No reply yet</span>}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleTimeString()}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredTickets.length > 0 && (
                <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Showing {Math.min(filteredTickets.length, (currentPage - 1) * itemsPerPage + 1)}-
                      {Math.min(filteredTickets.length, currentPage * itemsPerPage)} of {filteredTickets.length}
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

        {/* Support Info */}
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FaHeadset size={20} className="text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Need immediate help?</h4>
              <p className="text-xs text-gray-600 mt-1">
                Our support team typically responds within 24 hours. For urgent issues,
                you can also contact us at <span className="text-blue-600 font-medium">support@cabbooking.com</span> or call <span className="text-blue-600 font-medium">+91 1800 123 4567</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}