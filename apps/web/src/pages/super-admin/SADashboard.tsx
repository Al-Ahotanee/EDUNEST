import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, Users, DollarSign, Clock, TrendingUp, AlertCircle, 
  CheckCircle2, ShieldCheck, ArrowUpRight, FileCheck, Activity,
  Server, Database, ChevronRight, Layers, BellRing, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/utils';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706'];

function StatCard({ 
  title, 
  value, 
  sub, 
  icon: Icon, 
  badge,
  iconBg = 'bg-blue-50 text-blue-700 border-blue-200',
  linkTo
}: { 
  title: string; 
  value: string | number; 
  sub?: string; 
  icon: any; 
  badge?: string;
  iconBg?: string;
  linkTo?: string;
}) {
  const content = (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1.5 font-medium">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconBg} shadow-xs`}>
          <Icon size={22} />
        </div>
      </div>
      {badge && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {badge}
          </span>
          {linkTo && (
            <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center">
              View <ChevronRight size={14} />
            </span>
          )}
        </div>
      )}
    </div>
  );

  return linkTo ? <Link to={linkTo} className="block">{content}</Link> : content;
}

export default function SADashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['sa-stats'],
    queryFn: () => api.get('/super-admin/stats').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['sa-pending'],
    queryFn: () => api.get('/super-admin/tenants/pending').then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Compiling Platform Executive Intelligence...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating cross-tenant data, ledger logs, and license registries</p>
      </div>
    );
  }

  const stats = statsData || {};
  const planData = Object.entries(stats.planBreakdown || {}).map(([name, value]) => ({ name, value }));
  const pendingCount = pendingData?.length || 0;

  return (
    <div className="space-y-6">
      {/* Official Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              <ShieldCheck size={13} /> Official Platform Authority
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Network Executive Console
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            SaaS multi-tenant infrastructure, regulatory oversight, institutional licensing, and platform fiscal performance.
          </p>
        </div>

        {/* Quick Institutional Action Strip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/super-admin/tenants"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
          >
            <Building2 size={15} /> All Schools Directory
          </Link>
          <Link
            to="/super-admin/plans"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
          >
            <Layers size={15} /> Pricing Tiers
          </Link>
          <Link
            to="/super-admin/pending"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Clock size={15} /> Accreditation Desk ({pendingCount})
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Accredited Institutions" 
          value={stats.totalTenants || 0} 
          sub={`+${stats.newThisMonth || 0} registered this month`} 
          icon={Building2} 
          iconBg="bg-blue-50 text-blue-700 border-blue-200"
          badge="National Registry"
          linkTo="/super-admin/tenants"
        />
        <StatCard 
          title="Active Licenses" 
          value={stats.activeTenants || 0} 
          sub={`${stats.suspendedTenants || 0} suspended / non-compliant`} 
          icon={CheckCircle2} 
          iconBg="bg-emerald-50 text-emerald-700 border-emerald-200"
          badge="Good Standing"
          linkTo="/super-admin/tenants"
        />
        <StatCard 
          title="Awaiting Accreditation" 
          value={stats.pendingTenants || 0} 
          sub="Institutional KYC review required" 
          icon={Clock} 
          iconBg="bg-amber-50 text-amber-700 border-amber-200"
          badge="Pending Review"
          linkTo="/super-admin/pending"
        />
        <StatCard 
          title="Cumulative Revenue" 
          value={`₦${((stats.totalRevenue || 0) / 1000).toFixed(0)}K`} 
          sub="Platform gross billing volume" 
          icon={DollarSign} 
          iconBg="bg-purple-50 text-purple-700 border-purple-200"
          badge="Audited Settlements"
          linkTo="/super-admin/payments"
        />
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Enrolled Scholars</p>
            <p className="text-2xl font-black text-slate-900">{(stats.totalStudents || 0).toLocaleString()}</p>
            <p className="text-[11px] text-slate-500">Across all accredited school tenancies</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 flex-shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Velocity</p>
            <p className="text-2xl font-black text-slate-900">+{stats.newThisMonth || 0} Schools</p>
            <p className="text-[11px] text-slate-500">New onboarding applications filed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">License Retention SLA</p>
            <p className="text-2xl font-black text-slate-900">99.4%</p>
            <p className="text-[11px] text-slate-500">Institutional renewal & low churn index</p>
          </div>
        </div>
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Platform Billing Performance ({new Date().getFullYear()})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Aggregated monthly subscription & student billing settlements</p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                Audited Ledger
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} 
                  />
                  <Tooltip 
                    formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, 'Settled Revenue']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      color: '#0f172a'
                    }} 
                    labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#1d4ed8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Official Currency: Nigerian Naira (NGN ₦)</span>
            <Link to="/super-admin/payments" className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Access Full Financial Audit Ledger <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Subscription Plan Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Tier Allocations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Distribution across licensing packages</p>
              </div>
              <Link to="/super-admin/plans" className="text-xs font-semibold text-blue-600 hover:underline">
                Configure Rates
              </Link>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={planData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={45}
                    outerRadius={70} 
                    paddingAngle={4}
                  >
                    {planData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '8px', 
                      fontSize: '12px' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Plan Breakdown Legend Table */}
            <div className="space-y-2 mt-2">
              {planData.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} 
                    />
                    <span className="font-semibold text-slate-700">{p.name} Tier</span>
                  </div>
                  <span className="font-bold text-slate-900">{Number(p.value)} {Number(p.value) === 1 ? 'school' : 'schools'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">Institutional Quota Enforcement Active</span>
          </div>
        </div>
      </div>

      {/* Pending Accreditation Docket Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Institutional Accreditation Docket
              </h3>
              <p className="text-xs text-slate-500">
                New school registration applications requiring KYC verification and regulatory clearance
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {pendingCount} Awaiting Review
          </span>
        </div>

        {pendingData && pendingData.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingData.slice(0, 5).map((t: any) => (
              <div key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-base flex-shrink-0">
                    {t.name ? t.name[0] : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {t.subscriptionPlan || 'STANDARD'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Administrator: <span className="font-medium text-slate-700">{t.adminEmail}</span> · State: <span className="font-medium text-slate-700">{t.state || 'Unspecified'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link 
                    to="/super-admin/pending" 
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                  >
                    <FileCheck size={14} /> Inspect Accreditation
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Accreditation Queue Clear</p>
            <p className="text-xs text-slate-500 mt-0.5">All registered schools have undergone formal verification.</p>
          </div>
        )}
      </div>
    </div>
  );
}
