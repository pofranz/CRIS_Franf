import React, { useState, useMemo } from 'react';
import {
  UserAccount,
  SiteSettings,
  RevenueSummaryMetrics,
  CrisRevenueItem,
  MiscellaneousRevenueRecord,
  LegalInstrumentRecord,
} from '../types';
import { storageService } from '../services/storage';
import { openPrintWindow } from '../services/printService';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  DollarSign,
  Calendar,
  Clock,
  Printer,
  Download,
  PlusCircle,
  Search,
  Filter,
  Receipt,
  Award,
  FileText,
  TrendingUp,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface RevenueSummaryDashboardProps {
  currentUser: UserAccount;
  siteSettings: SiteSettings;
  onNavigateToCertifications?: () => void;
  onBackToDashboard?: () => void;
}

export const RevenueSummaryDashboard: React.FC<RevenueSummaryDashboardProps> = ({
  currentUser,
  siteSettings,
  onNavigateToCertifications,
  onBackToDashboard,
}) => {
  // Current time
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly_table' | 'ledger' | 'yearly_comparison'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'ALL'>('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<'ALL' | 'CERTIFICATION' | 'LEGAL_INSTRUMENT' | 'MISCELLANEOUS_FEE'>('ALL');

  // Miscellaneous Fee Modal State
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [miscOrNumber, setMiscOrNumber] = useState('');
  const [miscAmount, setMiscAmount] = useState('150.00');
  const [miscPayerName, setMiscPayerName] = useState('');
  const [miscServiceType, setMiscServiceType] = useState('Marriage License Application Fee');
  const [miscDate, setMiscDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [miscNotes, setMiscNotes] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<CrisRevenueItem | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute Revenue Metrics
  const metrics: RevenueSummaryMetrics = useMemo(() => {
    return storageService.getRevenueSummary(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, refreshKey]);

  // All revenue items
  const allItems: CrisRevenueItem[] = useMemo(() => {
    return storageService.getAllRevenueItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Filtered ledger items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Year filter
      const itemYear = new Date(item.date).getFullYear();
      if (itemYear !== selectedYear) return false;

      // Month filter
      if (selectedMonthFilter !== 'ALL') {
        const itemMonth = new Date(item.date).getMonth();
        if (itemMonth !== selectedMonthFilter) return false;
      }

      // Source filter
      if (selectedSourceFilter !== 'ALL' && item.sourceType !== selectedSourceFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.orNumber.toLowerCase().includes(q) ||
          item.payerOrSubject.toLowerCase().includes(q) ||
          item.serviceDescription.toLowerCase().includes(q) ||
          item.issuedBy.toLowerCase().includes(q) ||
          (item.purpose && item.purpose.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allItems, selectedYear, selectedMonthFilter, selectedSourceFilter, searchQuery]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = metrics.yearlyBreakdown.map((y) => y.year);
    const curr = new Date().getFullYear();
    if (!years.includes(curr)) years.push(curr);
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [metrics.yearlyBreakdown]);

  // Format Philippine Peso currency
  const formatPeso = (val: number) => {
    return `₱ ${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Open modal with default OR
  const handleOpenAddMisc = () => {
    const randomOr = `OR-${Math.floor(892000 + Math.random() * 8000)}`;
    setMiscOrNumber(randomOr);
    setMiscAmount('150.00');
    setMiscPayerName('');
    setMiscServiceType('Marriage License Application Fee');
    setMiscDate(new Date().toISOString().split('T')[0]);
    setMiscNotes('');
    setIsMiscModalOpen(true);
  };

  // Save Miscellaneous Fee
  const handleSaveMisc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miscOrNumber.trim() || !miscPayerName.trim() || !miscAmount.trim()) {
      alert('Please fill out all required fields: O.R. Number, Payer Name, and Amount.');
      return;
    }

    storageService.addMiscellaneousRevenue(
      {
        orNumber: miscOrNumber.trim().toUpperCase(),
        amountPaid: miscAmount.trim(),
        payerName: miscPayerName.trim().toUpperCase(),
        serviceType: miscServiceType,
        dateIssued: miscDate,
        issuedByUsername: currentUser.username,
        notes: miscNotes.trim(),
      },
      currentUser.username
    );

    setIsMiscModalOpen(false);
    setRefreshKey((k) => k + 1);
  };

  // Handle Delete
  const handleDeleteItem = (item: CrisRevenueItem) => {
    if (currentUser.role !== 'superadmin' && currentUser.role !== 'mcr') {
      alert('Unauthorized: Only Superadmin or MCR can delete collection records.');
      return;
    }

    if (item.sourceType === 'MISCELLANEOUS_FEE') {
      storageService.deleteMiscellaneousRevenue(item.id, currentUser);
    } else if (item.sourceType === 'LEGAL_INSTRUMENT') {
      const recs = storageService.getRecords('legal-instruments') as LegalInstrumentRecord[];
      const target = recs.find((r) => r.id === item.id);
      if (target) {
        storageService.updateRecord(
          { ...target, orNumber: undefined, amountPaid: undefined },
          currentUser.username,
          'Removed O.R. payment info from legal instrument'
        );
      }
    } else {
      // Certification delete
      storageService.deleteCertification(item.id, currentUser);
    }

    setRecordToDelete(null);
    setRefreshKey((k) => k + 1);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['O.R. Number', 'Date', 'Amount (PHP)', 'Payer / Subject Person', 'Service Description', 'Source', 'Cashier'];
    const rows = filteredItems.map((item) => [
      `"${item.orNumber}"`,
      `"${item.date}"`,
      item.amount.toFixed(2),
      `"${item.payerOrSubject.replace(/"/g, '""')}"`,
      `"${item.serviceDescription.replace(/"/g, '""')}"`,
      `"${item.sourceType}"`,
      `"${item.issuedBy}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CRIS_Revenue_Ledger_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Monthly Collections Report
  const handlePrintMonthlyReport = () => {
    const printable = document.getElementById('printable-revenue-monthly-report');
    if (printable) {
      openPrintWindow(printable, `Monthly_Report_of_Collections_${selectedYear}`);
    }
  };

  // Print Annual Accomplishment Report
  const handlePrintAnnualReport = () => {
    const printable = document.getElementById('printable-revenue-annual-report');
    if (printable) {
      openPrintWindow(printable, `Annual_Revenue_Accomplishment_Report_${selectedYear}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Civil Registry Revenue & Collection Summary
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                Fiscal Year {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {siteSettings.officeName} • {siteSettings.municipality}, {siteSettings.province} • Official Receipts (O.R.) Ledger & Accomplishment Reports
            </p>
          </div>

          {/* Action Buttons & Year Selector */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label htmlFor="revenue-year-select" className="text-xs font-semibold text-slate-600">
                Fiscal Year:
              </label>
              <select
                id="revenue-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenAddMisc}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Record O.R. Fee</span>
            </button>

            <button
              type="button"
              onClick={handlePrintMonthlyReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Monthly Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Calendar Reset Policy Strip */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Automated Calendar Revenue Reset Rules:</span>
              <span className="text-slate-600 ml-1.5">
                Monthly revenue resets on the <strong>first day of each month (00:00:00)</strong>. Yearly revenue resets on the <strong>first day of the year (January 1, 00:00:00)</strong>.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono shrink-0">
            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-100/70 px-2 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>Next Month Reset: <strong>{metrics.monthlyResetDateFormatted}</strong> ({metrics.daysUntilMonthlyReset}d)</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-700 bg-purple-100/70 px-2 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>Next Year Reset: <strong>{metrics.yearlyResetDateFormatted}</strong> ({metrics.daysUntilYearlyReset}d)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Revenue Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Month Revenue (Resets 1st of each month) */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Current Month Revenue
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {metrics.currentMonthLabel}
              </span>
            </div>
            <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {formatPeso(metrics.currentMonthRevenue)}
            </div>
            <div className="text-xs text-slate-600 mt-1 flex items-center justify-between">
              <span>{metrics.currentMonthTransactions} O.R. Receipts Issued</span>
              <span className="font-mono text-emerald-600 font-semibold">
                Avg: {formatPeso(metrics.currentMonthAverageFee)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Active Monthly Cycle
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Resets: 1st of next month
            </span>
          </div>
        </div>

        {/* Card 2: Current Year Revenue (Resets Jan 1st yearly) */}
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Current Year Revenue (YTD)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                FY {metrics.currentYearLabel}
              </span>
            </div>
            <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {formatPeso(metrics.currentYearRevenue)}
            </div>
            <div className="text-xs text-slate-600 mt-1 flex items-center justify-between">
              <span>{metrics.currentYearTransactions} O.R. Receipts Issued</span>
              <span className="font-mono text-blue-600 font-semibold">
                Avg: {formatPeso(metrics.currentYearAverageFee)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              Calendar Year Total
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Resets: Jan 1 ({metrics.daysUntilYearlyReset}d)
            </span>
          </div>
        </div>

        {/* Card 3: Today's Daily Collections */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Today&apos;s Collections
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                Live Daily
              </span>
            </div>
            <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {formatPeso(metrics.todayRevenue)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              <span>{metrics.todayTransactions} Official Receipts issued today</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="text-slate-600 font-semibold">LCR Counter Active</span>
            <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
          </div>
        </div>

        {/* Card 4: All-Time Civil Registry Collections */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                All-Time Registry Revenue
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                Cumulative
              </span>
            </div>
            <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {formatPeso(metrics.allTimeRevenue)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              <span>{metrics.allTimeTransactions} Total Receipts recorded</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="text-indigo-600 font-semibold">Archive Audit Verified</span>
            <span className="text-[10px] text-slate-400 font-mono">All Records</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Revenue Subsections */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Monthly Revenue Chart</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly_table')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'monthly_table'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly Breakdown Table ({selectedYear})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Official Receipts Ledger ({filteredItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('yearly_comparison')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'yearly_comparison'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Yearly Comparison & Accomplishment</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & MONTHLY BAR CHART */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Monthly Revenue Collections ({selectedYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Collection breakdown in Philippine Pesos (₱) per calendar month. Active month resets on the 1st of every month.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-blue-600" />
                  <span>Closed Month</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>Current Month (Active)</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-slate-200" />
                  <span>Upcoming</span>
                </span>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="monthName"
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11 }}
                    tickFormatter={(val) => `₱${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as (typeof metrics.monthlyBreakdown)[0];
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[200px]">
                            <div className="font-bold text-sm text-blue-300">
                              {data.monthFullName} {data.year}
                            </div>
                            <div className="mt-1 text-slate-300">
                              Period: {data.periodStart} to {data.periodEnd}
                            </div>
                            <div className="mt-2 text-base font-bold font-mono text-emerald-400">
                              {formatPeso(data.revenue)}
                            </div>
                            <div className="text-slate-400 mt-0.5">
                              {data.transactionCount} Official Receipts (Avg: {formatPeso(data.averageFee)})
                            </div>
                            {data.isCurrentMonth && (
                              <div className="mt-2 pt-1 border-t border-slate-700 text-[10px] text-emerald-300 font-semibold">
                                • Active Cycle (Resets 1st of next month)
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {metrics.monthlyBreakdown.map((entry, index) => {
                      let fill = '#2563EB'; // Blue
                      if (entry.isCurrentMonth) fill = '#10B981'; // Emerald
                      else if (entry.isFutureMonth) fill = '#E2E8F0'; // Slate 200
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown by Service / Form Category */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Revenue Collections by Civil Registry Service ({selectedYear})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {metrics.serviceBreakdown.map((srv) => (
                <div key={srv.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block truncate">
                      {srv.label}
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                      {formatPeso(srv.revenue)}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {srv.count} Transactions • {srv.percentage.toFixed(1)}% of Annual
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(2, srv.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY BREAKDOWN TABLE */}
      {activeTab === 'monthly_table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Fiscal Year {selectedYear} Monthly Collections Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every month begins with an initial revenue of ₱0.00 on the 1st day and tracks cumulative collections until month close.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 block">Annual Total:</span>
              <span className="text-lg font-bold font-mono text-blue-700">
                {formatPeso(metrics.selectedYearRevenue)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Calendar Month</th>
                  <th className="py-3 px-4">Accounting Period</th>
                  <th className="py-3 px-4 text-right">O.R. Receipts Issued</th>
                  <th className="py-3 px-4 text-right">Total Revenue (₱)</th>
                  <th className="py-3 px-4 text-right">Average Fee</th>
                  <th className="py-3 px-4 text-right">Share of FY {selectedYear}</th>
                  <th className="py-3 px-4 text-center">Status / Reset Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {metrics.monthlyBreakdown.map((row) => {
                  return (
                    <tr
                      key={row.monthIndex}
                      className={`hover:bg-slate-50 transition ${
                        row.isCurrentMonth ? 'bg-emerald-50/50 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                        {row.isCurrentMonth && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <span>{row.monthFullName}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.periodStart} to {row.periodEnd}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-800">
                        {row.transactionCount}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatPeso(row.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatPeso(row.averageFee)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {row.shareOfAnnualPercent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {row.isCurrentMonth ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Active Cycle (Resets 1st of Next Month)
                          </span>
                        ) : row.isPastMonth ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                            Closed / Archived
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 text-[10px] font-medium">
                            Upcoming
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td className="py-3 px-4 text-slate-900" colSpan={2}>
                    ANNUAL TOTAL ({selectedYear})
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    {metrics.selectedYearTransactions}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-blue-700 text-sm">
                    {formatPeso(metrics.selectedYearRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {formatPeso(
                      metrics.selectedYearTransactions > 0
                        ? metrics.selectedYearRevenue / metrics.selectedYearTransactions
                        : 0
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">100.0%</td>
                  <td className="py-3 px-4 text-center text-xs text-slate-500 font-normal">
                    Resets Jan 1 Yearly
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OFFICIAL RECEIPTS (O.R.) LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search O.R. Number, Payee, Subject Person, or Service..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Selector */}
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium focus:outline-none"
              >
                <option value="ALL">All Months ({selectedYear})</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>

              {/* Source Selector */}
              <select
                value={selectedSourceFilter}
                onChange={(e) => setSelectedSourceFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium focus:outline-none"
              >
                <option value="ALL">All Fee Categories</option>
                <option value="CERTIFICATION">Civil Certifications (Forms 1/2/3)</option>
                <option value="LEGAL_INSTRUMENT">Legal Instruments (Affidavits & Decrees)</option>
                <option value="MISCELLANEOUS_FEE">Miscellaneous Registry Fees</option>
              </select>

              <button
                type="button"
                onClick={handleOpenAddMisc}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ New Receipt</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">O.R. Number</th>
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4">Payee / Subject Person</th>
                  <th className="py-3 px-4">Service Description</th>
                  <th className="py-3 px-4">Source Category</th>
                  <th className="py-3 px-4">Cashier / Staff</th>
                  <th className="py-3 px-4 text-right">Fee (₱)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold">No Official Receipts found for selected filters.</p>
                      <p className="text-[11px] mt-0.5">Try adjusting the search query, month filter, or fiscal year.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.orNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatDateDDMMMYYYY(item.date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.payerOrSubject}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span>{item.serviceDescription}</span>
                        {item.purpose && (
                          <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                            {item.purpose}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.sourceType === 'CERTIFICATION' ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                            LCR Certification
                          </span>
                        ) : item.sourceType === 'LEGAL_INSTRUMENT' ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                            Legal Instrument
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Registry Fee
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        @{item.issuedBy}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatPeso(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(currentUser.role === 'superadmin' || currentUser.role === 'mcr') && (
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete receipt record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: YEARLY COMPARISON */}
      {activeTab === 'yearly_comparison' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Multi-Year Revenue & Accomplishment Comparison
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Annual civil registration collections across fiscal years. On January 1st of every calendar year, the annual revenue counter resets to ₱0.00 for the incoming year.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-sans">Fiscal Year</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">O.R. Transactions</th>
                  <th className="py-3 px-4 text-right">Total Revenue (₱)</th>
                  <th className="py-3 px-4 text-right">Average Fee</th>
                  <th className="py-3 px-4 text-center font-sans">Cycle Status</th>
                  <th className="py-3 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.yearlyBreakdown.map((yr) => (
                  <tr
                    key={yr.year}
                    className={`hover:bg-slate-50 transition ${
                      yr.isCurrentYear ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-bold text-sm text-slate-900">
                      {yr.year}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {yr.periodStart} to {yr.periodEnd}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800">
                      {yr.transactionCount}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                      {formatPeso(yr.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatPeso(yr.averageFee)}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {yr.isCurrentYear ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          Current Active Fiscal Year (Resets Jan 1)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          Completed & Audited
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedYear(yr.year);
                          setActiveTab('monthly_table');
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        <span>View Breakdown</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePrintAnnualReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Annual Accomplishment & Revenue Report ({selectedYear})</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: RECORD MISCELLANEOUS FEE */}
      {isMiscModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Record Civil Registry Fee / Official Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMiscModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMisc} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Official Receipt (O.R.) # *
                  </label>
                  <input
                    type="text"
                    required
                    value={miscOrNumber}
                    onChange={(e) => setMiscOrNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. OR-892401"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Amount Paid (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={miscAmount}
                    onChange={(e) => setMiscAmount(e.target.value)}
                    placeholder="150.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Service / Fee Type *
                </label>
                <select
                  value={miscServiceType}
                  onChange={(e) => setMiscServiceType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="Marriage License Application Fee">Marriage License Application Fee (₱300.00)</option>
                  <option value="Late Registration Penalty & Endorsement Fee">Late Registration Penalty & Endorsement Fee (₱250.00)</option>
                  <option value="Certified True Copy of Civil Registry Book">Certified True Copy of Civil Registry Book (₱150.00)</option>
                  <option value="Court Decree & Legal Instrument Filing Fee">Court Decree & Legal Instrument Filing Fee (₱200.00)</option>
                  <option value="Certificate of No Record / Negative Certification">Certificate of No Record / Negative Certification (₱150.00)</option>
                  <option value="Endorsement / Transmittal to PSA Fee">Endorsement / Transmittal to PSA Fee (₱150.00)</option>
                  <option value="Civil Registry Authentication & Verification">Civil Registry Authentication & Verification (₱100.00)</option>
                  <option value="Solemnization Service LCR Administrative Fee">Solemnization Service LCR Administrative Fee (₱500.00)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Payer / Applicant Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={miscPayerName}
                  onChange={(e) => setMiscPayerName(e.target.value.toUpperCase())}
                  placeholder="e.g. JUAN DELA CRUZ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Date of Collection *
                </label>
                <input
                  type="date"
                  required
                  value={miscDate}
                  onChange={(e) => setMiscDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Notes / Particulars (Optional)
                </label>
                <textarea
                  rows={2}
                  value={miscNotes}
                  onChange={(e) => setMiscNotes(e.target.value)}
                  placeholder="Specify legal decree number, book/page, or applicant details..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMiscModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Save & Add to Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Delete Official Receipt Record?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete receipt <strong>{recordToDelete.orNumber}</strong> ({formatPeso(recordToDelete.amount)}) for <strong>{recordToDelete.payerOrSubject}</strong>?
            </p>
            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(recordToDelete)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          HIDDEN PRINTABLE TEMPLATES FOR LOCAL GOVERNMENT REVENUE REPORTS
          ========================================================================= */}

      {/* 1. Monthly Report of Collections (Printable) */}
      <div id="printable-revenue-monthly-report" className="hidden">
        <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', color: '#0f172a' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Republic of the Philippines
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              PROVINCE OF {siteSettings.province.toUpperCase()}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>
              MUNICIPALITY OF {siteSettings.municipality.toUpperCase()}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
              OFFICE OF THE MUNICIPAL CIVIL REGISTRAR
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '12px', textDecoration: 'underline' }}>
              MONTHLY REPORT OF CIVIL REGISTRY FEES & COLLECTIONS
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: '#475569' }}>
              Fiscal Year {selectedYear} • Summary of Collections by Month
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '16px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Month</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Accounting Period</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>O.R. Count</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Collections (PHP)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.monthlyBreakdown.map((m) => (
                <tr key={m.monthIndex} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{m.monthFullName}</td>
                  <td style={{ padding: '6px 8px' }}>{m.periodStart} to {m.periodEnd}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{m.transactionCount}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                    ₱ {m.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{m.shareOfAnnualPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', fontWeight: 'bold', background: '#f8fafc' }}>
                <td style={{ padding: '8px' }} colSpan={2}>ANNUAL TOTAL ({selectedYear})</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{metrics.selectedYearTransactions}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  ₱ {metrics.selectedYearRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>100.0%</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div style={{ width: '45%' }}>
              <div>Prepared & Certified by:</div>
              <div style={{ marginTop: '35px', fontWeight: 'bold', borderBottom: '1px solid #0f172a', width: '220px', textAlign: 'center' }}>
                {currentUser.name.toUpperCase()}
              </div>
              <div style={{ color: '#475569' }}>Civil Registry Officer / Cashier</div>
            </div>

            <div style={{ width: '45%' }}>
              <div>Noted & Approved by:</div>
              <div style={{ marginTop: '35px', fontWeight: 'bold', borderBottom: '1px solid #0f172a', width: '220px', textAlign: 'center' }}>
                {siteSettings.mcrOfficerName.toUpperCase()}
              </div>
              <div style={{ color: '#475569' }}>{siteSettings.mcrOfficerTitle}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Annual Accomplishment Report (Printable) */}
      <div id="printable-revenue-annual-report" className="hidden">
        <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', color: '#0f172a' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Republic of the Philippines
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              PROVINCE OF {siteSettings.province.toUpperCase()}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>
              MUNICIPALITY OF {siteSettings.municipality.toUpperCase()}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
              OFFICE OF THE MUNICIPAL CIVIL REGISTRAR
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '12px', textDecoration: 'underline' }}>
              ANNUAL FINANCIAL & REVENUE ACCOMPLISHMENT REPORT
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: '#475569' }}>
              Calendar Year {selectedYear} • Summary submitted to Municipal Treasurer
            </div>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '11px', lineHeight: '1.6' }}>
            Pursuant to Republic Act No. 3753 (Civil Registry Law) and Title VI of the Local Government Code of 1991 (RA 7160), this report certifies total revenue collections remitted for the period from <strong>January 1, {selectedYear}</strong> to <strong>December 31, {selectedYear}</strong>.
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '16px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Service Classification</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Transactions</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Collections (PHP)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.serviceBreakdown.map((s) => (
                <tr key={s.key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{s.label}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{s.count}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                    ₱ {s.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{s.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', fontWeight: 'bold', background: '#f8fafc' }}>
                <td style={{ padding: '8px' }}>TOTAL ANNUAL REVENUE ({selectedYear})</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{metrics.selectedYearTransactions}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  ₱ {metrics.selectedYearRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>100.0%</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div style={{ width: '45%' }}>
              <div>Submitted by:</div>
              <div style={{ marginTop: '35px', fontWeight: 'bold', borderBottom: '1px solid #0f172a', width: '220px', textAlign: 'center' }}>
                {siteSettings.mcrOfficerName.toUpperCase()}
              </div>
              <div style={{ color: '#475569' }}>{siteSettings.mcrOfficerTitle}</div>
            </div>

            <div style={{ width: '45%' }}>
              <div>Received by:</div>
              <div style={{ marginTop: '35px', fontWeight: 'bold', borderBottom: '1px solid #0f172a', width: '220px', textAlign: 'center' }}>
                OFFICE OF THE MUNICIPAL TREASURER
              </div>
              <div style={{ color: '#475569' }}>Municipality of {siteSettings.municipality}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
