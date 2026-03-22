// src/pages/driver/DriverWallet.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverService } from '../../api/driverApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
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
  FaWallet, FaHistory, FaArrowUp, FaArrowDown, FaSync, FaArrowLeft,
  FaChartLine, FaChartPie, FaChartBar, FaMoneyBillWave, FaClock,
  FaCheckCircle, FaExclamationTriangle, FaDownload, FaPrint
} from 'react-icons/fa';
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard,
  Banknote, Activity, Target, Gauge, ArrowUpCircle, ArrowDownCircle, Shield
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

export default function DriverWallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDesc, setWithdrawDesc] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [selectedChart, setSelectedChart] = useState('all');

  useEffect(() => { fetchWallet(); }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const data = await driverService.getWalletBalance();
      setWallet(data?.wallet || data || {});
    } catch (err) { toast.error('Failed to load wallet'); } finally { setLoading(false); }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return toast.error('Enter valid amount');
    if (amount > (wallet?.walletBalance || 0)) return Swal.fire({
      icon: 'error',
      title: 'Insufficient Balance',
      text: `Your wallet balance is ₹${wallet?.walletBalance?.toLocaleString()}`,
      confirmButtonColor: '#3B82F6'
    });

    const result = await Swal.fire({
      title: 'Confirm Withdrawal',
      text: `Request withdrawal of ₹${amount.toLocaleString()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Yes, Withdraw',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    setWithdrawing(true);
    try {
      const res = await driverService.withdraw(amount, withdrawDesc);
      if (res.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Request Submitted',
          text: 'Your withdrawal request has been sent for approval',
          confirmButtonColor: '#10B981'
        });
        setWithdrawAmount('');
        setWithdrawDesc('');
        fetchWallet();
      }
    } catch (err) { toast.error('Withdrawal failed'); } finally { setWithdrawing(false); }
  };

  const stats = useMemo(() => {
    const transactions = wallet?.transactions || [];
    const totalCredits = transactions.filter(t => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0);
    const totalDebits = transactions.filter(t => t.type === 'Debit').reduce((s, t) => s + (t.amount || 0), 0);
    const pendingAmount = transactions.filter(t => t.status === 'Pending').reduce((s, t) => s + (t.amount || 0), 0);
    const completedCount = transactions.filter(t => t.status === 'Completed').length;
    const pendingCount = transactions.filter(t => t.status === 'Pending').length;
    const successRate = transactions.length ? (completedCount / transactions.length) * 100 : 0;

    // Monthly earnings for chart
    const monthlyEarnings = {};
    transactions.forEach(t => {
      if (t.type === 'Credit') {
        const month = new Date(t.createdAt).toLocaleString('default', { month: 'short' });
        if (!monthlyEarnings[month]) monthlyEarnings[month] = 0;
        monthlyEarnings[month] += t.amount || 0;
      }
    });

    return {
      totalCredits, totalDebits, netFlow: totalCredits - totalDebits,
      pendingAmount, completedCount, pendingCount, successRate,
      monthlyEarnings
    };
  }, [wallet]);

  // Chart 1: Transaction Types Distribution - Pie Chart
  const typeData = [
    { name: 'Credits', value: stats.totalCredits, color: CHART_COLORS.success },
    { name: 'Debits', value: stats.totalDebits, color: CHART_COLORS.danger }
  ].filter(item => item.value > 0);

  // Chart 2: Status Distribution - Pie Chart
  const statusData = [
    { name: 'Completed', value: stats.completedCount, color: CHART_COLORS.success },
    { name: 'Pending', value: stats.pendingCount, color: CHART_COLORS.warning }
  ].filter(item => item.value > 0);

  // Chart 3: Monthly Earnings - Bar Chart
  const monthlyData = Object.entries(stats.monthlyEarnings).map(([month, amount]) => ({ month, amount }));

  // Chart 4: Success Rate - Gauge Chart
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
          format: '<div style="text-align:center"><span style="font-size:24px">{point.y:.0f}%</span><br/><span style="font-size:9px">Success Rate</span></div>'
        }
      }
    },
    series: [{ name: 'Success Rate', data: [parseFloat(stats.successRate)] }],
    credits: { enabled: false }
  };

  // Chart 5: Transaction Trend - Line Chart
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayTransactions = (wallet?.transactions || []).filter(t => new Date(t.createdAt).toDateString() === date.toDateString());
    const credits = dayTransactions.filter(t => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0);
    const debits = dayTransactions.filter(t => t.type === 'Debit').reduce((s, t) => s + (t.amount || 0), 0);
    return { day: dayName, credits, debits, net: credits - debits };
  }).reverse();

  const lineOptions = {
    chart: { type: 'spline', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    xAxis: { categories: weeklyData.map(d => d.day), labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'Amount (₹)' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: true, itemStyle: { fontSize: '10px' } },
    tooltip: { pointFormat: '{series.name}: ₹{point.y}' },
    plotOptions: { spline: { marker: { radius: 3 } } },
    series: [
      { name: 'Credits', data: weeklyData.map(d => d.credits), color: CHART_COLORS.success, lineWidth: 2 },
      { name: 'Debits', data: weeklyData.map(d => d.debits), color: CHART_COLORS.danger, lineWidth: 2 },
      { name: 'Net', data: weeklyData.map(d => d.net), color: CHART_COLORS.primary, lineWidth: 2 }
    ],
    credits: { enabled: false }
  };

  const pieOptions = (data, title) => ({
    chart: { type: 'pie', height: 180, style: { fontFamily: 'inherit' } },
    title: { text: null },
    tooltip: { pointFormat: '{point.name}: <b>₹{point.y}</b> ({point.percentage:.1f}%)' },
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
    xAxis: { categories: monthlyData.map(d => d.month), labels: { style: { fontSize: '10px' } } },
    yAxis: { title: { text: 'Earnings (₹)' }, labels: { style: { fontSize: '10px' } } },
    legend: { enabled: false },
    tooltip: { pointFormat: '₹{point.y}' },
    plotOptions: { column: { borderRadius: 4, color: CHART_COLORS.success } },
    series: [{ name: 'Earnings', data: monthlyData.map(d => d.amount) }],
    credits: { enabled: false }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading wallet...</p>
        </div>
      </div>
    );
  }

  const walletBalance = wallet?.walletBalance || 0;
  const totalEarnings = wallet?.totalEarnings || 0;
  const commissionPercentage = wallet?.commissionPercentage || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-4">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaWallet className="text-blue-600" />
                My Wallet
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your earnings and withdrawals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWallet}
              className="p-2.5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => window.print()}
              className="p-2.5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all"
              title="Print"
            >
              <FaPrint size={14} />
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm mb-1">Available Balance</p>
                <p className="text-4xl font-bold">₹{walletBalance.toLocaleString()}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FaWallet size={32} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-blue-100 text-xs">Total Earnings</p>
                <p className="text-lg font-semibold">₹{totalEarnings.toLocaleString()}</p>
              </div>
              <div className="flex-1">
                <p className="text-blue-100 text-xs">Commission</p>
                <p className="text-lg font-semibold">{commissionPercentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Total Credits</span>
                <span className="text-lg font-bold text-green-600">₹{stats.totalCredits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Total Debits</span>
                <span className="text-lg font-bold text-red-600">₹{stats.totalDebits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Net Flow</span>
                <span className={`text-lg font-bold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.netFlow >= 0 ? '+' : '-'} ₹{Math.abs(stats.netFlow).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Pending Amount</span>
                <span className="text-lg font-bold text-yellow-600">₹{stats.pendingAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'distribution', 'trends'].map((type) => (
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
          {/* Chart 1: Transaction Types */}
          {(selectedChart === 'all' || selectedChart === 'distribution') && (
            <ChartCard title="Transaction Types" icon={FaChartPie} subtitle="Credits vs Debits">
              {typeData.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={pieOptions(typeData, 'Types')} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>
          )}

          {/* Chart 2: Status Distribution */}
          {(selectedChart === 'all' || selectedChart === 'distribution') && (
            <ChartCard title="Status Distribution" icon={FaChartPie} subtitle="Completed vs Pending">
              {statusData.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={pieOptions(statusData, 'Status')} />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>
          )}

          {/* Chart 3: Weekly Transaction Trend */}
          {(selectedChart === 'all' || selectedChart === 'trends') && (
            <ChartCard title="Weekly Trend" icon={FaChartLine} subtitle="Credits, Debits & Net">
              <HighchartsReact highcharts={Highcharts} options={lineOptions} />
            </ChartCard>
          )}

          {/* Chart 4: Success Rate Gauge */}
          {(selectedChart === 'all' || selectedChart === 'distribution') && (
            <ChartCard title="Success Rate" icon={Gauge} subtitle="Transaction completion">
              <HighchartsReact highcharts={Highcharts} options={gaugeOptions} />
            </ChartCard>
          )}
        </div>

        {/* Withdraw Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Banknote size={18} className="text-green-600" />
            Request Withdrawal
          </h2>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">₹</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(walletBalance.toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum withdrawal: ₹100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={withdrawDesc}
                onChange={(e) => setWithdrawDesc(e.target.value)}
                rows="2"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                placeholder="Add a note for your withdrawal request..."
              />
            </div>

            <button
              type="submit"
              disabled={withdrawing}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg"
            >
              {withdrawing ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <FaArrowUp size={16} />
                  Request Withdrawal
                </>
              )}
            </button>
          </form>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Transaction History</h3>
            <span className="text-xs text-gray-400 ml-auto">Last 10 transactions</span>
          </div>

          {(wallet?.transactions || []).length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaHistory size={24} className="text-gray-300" />
              </div>
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Your earnings will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(wallet?.transactions || []).slice(0, 10).map(tx => (
                <div key={tx._id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${tx.type === 'Credit' ? 'bg-green-50' : 'bg-red-50'}`}>
                        {tx.type === 'Credit' ? (
                          <TrendingUp className="text-green-600" size={18} />
                        ) : (
                          <TrendingDown className="text-red-600" size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.description || tx.category}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} />
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${tx.type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'Credit' ? '+' : '-'} ₹{tx.amount?.toLocaleString()}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Shield size={18} className="text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Secure Transactions</h4>
              <p className="text-xs text-gray-600 mt-1">
                All withdrawals are processed securely and may take 24-48 hours to reflect in your bank account.
                Withdrawal requests are reviewed by admin for security purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}