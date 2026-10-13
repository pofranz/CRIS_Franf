import React, { useState, useMemo } from 'react';
import {
  RegistryCategory,
  AnyRegistryRecord,
  IssuedCertification,
} from '../types';
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
  BarChart3,
  Calendar,
  Baby,
  Heart,
  Cross,
  Scroll,
  Award,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';

interface RegistrationMonthlyChartProps {
  category: RegistryCategory | 'certifications' | 'settings' | 'certificate-designer';
  records: AnyRegistryRecord[];
  certifications?: IssuedCertification[];
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface CategoryMeta {
  title: string;
  badgeLabel: string;
  color: string;
  barColor: string;
  hoverColor: string;
  bgLight: string;
  borderLight: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
  births: {
    title: 'Birth Registrations',
    badgeLabel: 'Live Births Registered',
    color: 'text-blue-600',
    barColor: '#2563eb', // blue-600
    hoverColor: '#1d4ed8', // blue-700
    bgLight: 'bg-blue-50/70',
    borderLight: 'border-blue-200',
    icon: Baby,
  },
  marriages: {
    title: 'Marriage Registrations',
    badgeLabel: 'Marriages Contracted & Registered',
    color: 'text-pink-600',
    barColor: '#db2777', // pink-600
    hoverColor: '#be185d', // pink-700
    bgLight: 'bg-pink-50/70',
    borderLight: 'border-pink-200',
    icon: Heart,
  },
  deaths: {
    title: 'Death Registrations',
    badgeLabel: 'Civil Deaths Registered',
    color: 'text-amber-700',
    barColor: '#d97706', // amber-600
    hoverColor: '#b45309', // amber-700
    bgLight: 'bg-amber-50/70',
    borderLight: 'border-amber-200',
    icon: Cross,
  },
  'legal-instruments': {
    title: 'Legal Instrument Registrations',
    badgeLabel: 'Court Decrees & Affidavits',
    color: 'text-indigo-600',
    barColor: '#4f46e5', // indigo-600
    hoverColor: '#4338ca', // indigo-700
    bgLight: 'bg-indigo-50/70',
    borderLight: 'border-indigo-200',
    icon: Scroll,
  },
  certifications: {
    title: 'Issued Civil Certifications',
    badgeLabel: 'Official LCR Forms 1/2/3 Issued',
    color: 'text-emerald-600',
    barColor: '#059669', // emerald-600
    hoverColor: '#047857', // emerald-700
    bgLight: 'bg-emerald-50/70',
    borderLight: 'border-emerald-200',
    icon: Award,
  },
};

export const RegistrationMonthlyChart: React.FC<RegistrationMonthlyChartProps> = ({
  category,
  records,
  certifications = [],
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isUnsupportedCategory = category === 'settings' || category === 'certificate-designer';

  const activeMeta = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.births;
  const CategoryIcon = activeMeta.icon;

  // Extract all valid dates for the active category
  const dates = useMemo(() => {
    const rawList: (AnyRegistryRecord | IssuedCertification)[] =
      category === 'certifications' ? certifications : records;

    return rawList
      .map((item) => {
        let dateStr = '';
        if ('dateIssued' in item && typeof item.dateIssued === 'string') {
          dateStr = item.dateIssued;
        } else if ('registryDate' in item && typeof item.registryDate === 'string') {
          dateStr = item.registryDate;
        } else if ('dateOfRegistration' in item && typeof (item as Record<string, any>).dateOfRegistration === 'string') {
          dateStr = (item as Record<string, any>).dateOfRegistration;
        } else if ('dateOfReceipt' in item && typeof (item as Record<string, any>).dateOfReceipt === 'string') {
          dateStr = (item as Record<string, any>).dateOfReceipt;
        } else if ('firstAddedDateTime' in item && typeof item.firstAddedDateTime === 'string') {
          dateStr = item.firstAddedDateTime.split(' ')[0];
        } else if ('createdAt' in item && typeof item.createdAt === 'string') {
          dateStr = item.createdAt.split('T')[0];
        }

        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      })
      .filter((d): d is Date => d !== null);
  }, [category, records, certifications]);

  // Extract available years from records
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    dates.forEach((d) => yearSet.add(d.getFullYear()));
    const currentYear = new Date().getFullYear();
    yearSet.add(currentYear);
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [dates]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear();
    return currentYear;
  });

  // Calculate registrations per month for the selected year
  const chartData = useMemo(() => {
    const monthlyCounts = Array(12).fill(0);

    dates.forEach((d) => {
      if (d.getFullYear() === selectedYear) {
        const monthIndex = d.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyCounts[monthIndex]++;
        }
      }
    });

    return MONTH_NAMES.map((month, idx) => ({
      month,
      fullName: FULL_MONTH_NAMES[idx],
      count: monthlyCounts[idx],
    }));
  }, [dates, selectedYear]);

  // Summary metrics for the selected year
  const totalInYear = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const peakMonth = useMemo(() => {
    let max = -1;
    let peak = 'None';
    chartData.forEach((d) => {
      if (d.count > max) {
        max = d.count;
        peak = d.fullName;
      }
    });
    return max > 0 ? `${peak} (${max})` : 'N/A';
  }, [chartData]);

  const maxCount = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.count), 0);
    return maxVal < 5 ? 5 : maxVal + 1;
  }, [chartData]);

  // If on settings or certificate designer, do not render chart UI
  if (isUnsupportedCategory) {
    return null;
  }

  return (
    <section
      id="dashboard-monthly-registration-chart"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
    >
      {/* Header bar */}
      <div className="p-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${activeMeta.bgLight} ${activeMeta.color} border ${activeMeta.borderLight}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {activeMeta.title}: Monthly Registration Statistics
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activeMeta.bgLight} ${activeMeta.color} border ${activeMeta.borderLight}`}>
                {activeMeta.badgeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registration volume breakdown across calendar months for fiscal year {selectedYear}
            </p>
          </div>
        </div>

        {/* Right controls: Year selector & collapse */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="registration-year-select" className="text-xs text-slate-600 font-medium">
              Year:
            </label>
            <select
              id="registration-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
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
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title={isCollapsed ? 'Expand monthly chart' : 'Collapse monthly chart'}
            aria-label={isCollapsed ? 'Expand monthly chart' : 'Collapse monthly chart'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total for {selectedYear}
              </span>
              <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
                {totalInYear}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">
                  {totalInYear === 1 ? 'record' : 'records'}
                </span>
              </span>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Peak Registration Month
              </span>
              <span className="text-sm font-bold text-slate-800 mt-1 block truncate">
                {peakMonth}
              </span>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Monthly Average
              </span>
              <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
                {(totalInYear / 12).toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">/ mo</span>
              </span>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Registry Status
                </span>
                <span className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Synchronized
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 font-mono block">R.A. 3753</span>
                <span className="text-[9px] text-slate-400 font-mono block">CIVIL REG</span>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxCount]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const percentage =
                        totalInYear > 0
                          ? ((data.count / totalInYear) * 100).toFixed(1)
                          : '0';
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-xs min-w-[140px]">
                          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between">
                            <span>{data.fullName} {selectedYear}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{activeMeta.title.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-slate-400">Registrations:</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">
                              {data.count}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mt-1">
                            <span>Annual share:</span>
                            <span className="font-mono text-slate-300">{percentage}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                  fill={activeMeta.barColor}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.count > 0 ? activeMeta.barColor : '#cbd5e1'}
                      className="transition-colors hover:opacity-85"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
              <span>Bars reflect civil registry books and digital index records stored in the CRIS database.</span>
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
              LCR Form Series {category === 'births' ? '102 (Form 1)' : category === 'marriages' ? '97 (Form 2)' : category === 'deaths' ? '103 (Form 3)' : 'Official'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
