import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import { FaCar, FaHistory, FaSearch, FaEye, FaChevronLeft, FaChevronRight, FaRoute, FaStar } from 'react-icons/fa';
import { MapPin, Navigation, DollarSign, Award, X, ChevronsLeft, ChevronsRight, Clock, AlertCircle, CheckCircle, Ban } from 'lucide-react';

const CHART_COLORS = { primary: '#3B82F6', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', purple: '#8B5CF6' };

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-lg transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="p-3 rounded-xl" style={{ backgroundColor: color + '15' }}>
        <Icon className="text-xl" style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs font-medium text-gray-500">{label}</p>
  </div>
);

export default function DriverTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await driverService.getMyTrips();
      setTrips(res?.trips || res || []);
    } catch (err) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter(t => (t.status || t.bookingStatus)?.toLowerCase() === 'completed').length;
    const ongoing = trips.filter(t => (t.status || t.bookingStatus)?.toLowerCase() === 'ongoing').length;
    const cancelled = trips.filter(t => (t.status || t.bookingStatus)?.toLowerCase() === 'cancelled').length;
    const totalEarnings = trips.reduce((sum, t) => sum + (t.actualFare || t.fareEstimate || 0), 0);
    const completionRate = total ? ((completed / total) * 100).toFixed(1) : 0;
    return { total, completed, ongoing, cancelled, totalEarnings, completionRate };
  }, [trips]);

  const filteredTrips = useMemo(() => {
    let filtered = [...trips];
    if (filter !== 'all') {
      filtered = filtered.filter(t => {
        const tripStatus = (t.status || t.bookingStatus)?.toLowerCase();
        return tripStatus === filter;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        t._id?.toLowerCase().includes(q) ||
        t.pickup?.address?.toLowerCase().includes(q) ||
        t.drop?.address?.toLowerCase().includes(q) ||
        t.passengerDetails?.name?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [trips, filter, search]);

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const displayedTrips = filteredTrips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (trip) => {
    const status = (trip.status || trip.bookingStatus)?.toLowerCase();
    switch (status) {
      case 'completed': return { label: 'Completed', color: '#10B981', bg: '#10B98115', icon: CheckCircle };
      case 'ongoing': return { label: 'Ongoing', color: '#3B82F6', bg: '#3B82F615', icon: Clock };
      case 'cancelled': return { label: 'Cancelled', color: '#EF4444', bg: '#EF444415', icon: Ban };
      case 'accepted': return { label: 'Accepted', color: '#F59E0B', bg: '#F59E0B15', icon: AlertCircle };
      case 'pending': return { label: 'Pending', color: '#F59E0B', bg: '#F59E0B15', icon: AlertCircle };
      default: return { label: status || 'Unknown', color: '#6B7280', bg: '#6B728015', icon: AlertCircle };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4">
      <div className="max-w-8xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaRoute className="text-blue-600" /> My Trips
            </h1>
            <p className="text-sm text-gray-500 mt-1">Total {stats.total} trips, {stats.completed} completed</p>
          </div>
          <button onClick={fetchTrips} className="p-2.5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
            <FaHistory className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Trips" value={stats.total} icon={FaRoute} color={CHART_COLORS.primary} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle} color={CHART_COLORS.success} />
          <StatCard label="Completion Rate" value={`${stats.completionRate}%`} icon={Award} color={CHART_COLORS.purple} />
          <StatCard label="Total Earnings" value={`₹${stats.totalEarnings.toLocaleString()}`} icon={DollarSign} color={CHART_COLORS.success} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              {['all', 'completed', 'ongoing', 'cancelled'].map(t => (
                <button key={t} onClick={() => { setFilter(t); setCurrentPage(1); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" placeholder="Search by ID, passenger, or location..."
                value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trips Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Trip History</h3>
            <span className="text-xs text-gray-500 ml-auto">{filteredTrips.length} records</span>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-3">Loading trips...</p>
            </div>
          ) : displayedTrips.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCar size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No trips found</p>
              <p className="text-sm text-gray-400 mt-1">Your completed trips will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-6 py-3 text-left">Trip ID</th>
                      <th className="px-6 py-3 text-left">Route</th>
                      <th className="px-6 py-3 text-left">Passenger</th>
                      <th className="px-6 py-3 text-left">Date & Time</th>
                      <th className="px-6 py-3 text-right">Fare</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedTrips.map((trip) => {
                      const status = getStatusBadge(trip);
                      const StatusIcon = status.icon;
                      return (
                        <tr key={trip._id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-medium text-gray-600">#{trip._id?.slice(-8)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                  <Navigation size={10} className="text-green-600" />
                                </div>
                                <span className="text-gray-700">{trip.pickup?.address?.split(',')[0]}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                  <MapPin size={10} className="text-red-600" />
                                </div>
                                <span className="text-gray-700">{trip.drop?.address?.split(',')[0]}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{trip.passengerDetails?.name || 'Guest'}</p>
                            <p className="text-xs text-gray-400">{trip.passengerDetails?.phone || '—'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{new Date(trip.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">{new Date(trip.createdAt).toLocaleTimeString()}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-lg font-bold text-green-600">₹{trip.actualFare || trip.fareEstimate || 0}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: status.bg, color: status.color }}>
                              <StatusIcon size={10} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => navigate(`/driver/trip/${trip._id.slice(-8)}`)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-all">
                              <FaEye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredTrips.length > 0 && (
                <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Showing {Math.min(filteredTrips.length, (currentPage - 1) * itemsPerPage + 1)}-
                      {Math.min(filteredTrips.length, currentPage * itemsPerPage)} of {filteredTrips.length}
                    </span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="text-sm border rounded-md px-2 py-1 focus:outline-none">
                      {[10, 20, 50].map(v => <option key={v} value={v}>{v} per page</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"><ChevronsLeft size={16} /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"><FaChevronLeft size={14} /></button>
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"><FaChevronRight size={14} /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg border hover:bg-white disabled:opacity-30"><ChevronsRight size={16} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-xl"><FaStar size={20} className="text-blue-600" /></div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Trip Summary</h4>
              <p className="text-xs text-gray-600 mt-1">
                You've completed <span className="font-bold text-green-600">{stats.completed}</span> trips and earned
                <span className="font-bold text-green-600"> ₹{stats.totalEarnings.toLocaleString()}</span> in total.
                Your completion rate is <span className="font-bold text-blue-600">{stats.completionRate}%</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
