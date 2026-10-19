import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi, financeApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { applyThemeColors } from '../../hooks/useTenantTheme';
import {
  GraduationCap, ArrowLeft, CheckCircle2, ShieldCheck,
  CreditCard, Phone, Mail, Building, HelpCircle, FileText, Calendar
} from 'lucide-react';
import { Button } from '../../components/ui';

export default function SchoolFeesPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  const { data: websiteData, isLoading: loadingWebsite } = useQuery({
    queryKey: ['school-website', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing school slug');
      const res = await websiteApi.getPublicWebsite(slug);
      return res.data?.data;
    },
  });

  const { data: feeScheduleData, isLoading: loadingFees } = useQuery({
    queryKey: ['public-fee-schedules', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing school slug');
      const res = await financeApi.getPublicFeeSchedules(slug);
      return res.data?.data;
    },
  });

  useEffect(() => {
    if (websiteData?.branding) {
      applyThemeColors({
        primaryColor: websiteData.branding.primaryColor,
        secondaryColor: websiteData.branding.secondaryColor,
        name: websiteData.branding.name,
        logo: websiteData.branding.logo,
      });
    }
  }, [websiteData]);

  if (loadingWebsite || loadingFees) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Loading approved school fee schedules...</p>
        </div>
      </div>
    );
  }

  const school = websiteData?.branding || feeScheduleData?.school || {};
  const schedulesByClass: any[] = feeScheduleData?.schedulesByClass || [];
  const filteredSchedules = selectedClassId === 'ALL'
    ? schedulesByClass
    : schedulesByClass.filter(s => s.classId === selectedClassId || !s.classId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/school/${slug}`)}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              title="Return to School Home"
            >
              <ArrowLeft size={20} />
            </button>
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="h-10 w-10 rounded-xl object-contain bg-slate-50 border p-1" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-lg">
                {school.name?.[0] || 'E'}
              </div>
            )}
            <div>
              <p className="font-black text-slate-900 text-base leading-tight">{school.name || 'EduNest School'}</p>
              <p className="text-xs text-slate-400">Official Tuition & Approved Fee Schedules</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/login/${slug}`)}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Guardian Sign In
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/school/${slug}/apply`)}
            >
              Apply for Admission
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/20">
            <ShieldCheck size={14} /> Official Bursary Published Schedules
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Transparent, Value-Driven Education Fees
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            All tuition, learning resources, specialized laboratory levies, and uniform packages are published with full transparency for prospective and returning parents.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Filter Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Class Level:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input py-2 text-xs font-semibold w-64"
            >
              <option value="ALL">All Classes & Levels</option>
              {schedulesByClass.map((s: any) => (
                <option key={s.classId || 'GEN'} value={s.classId || 'GEN'}>
                  {s.className}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Official Approved Fees for 2026/2027 Academic Session</span>
          </div>
        </div>

        {/* Schedules Grid / Cards */}
        {filteredSchedules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No published schedules found for this class</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              The bursary is currently finalizing the fee schedules for this level. Please check back shortly or contact the admissions office.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSchedules.map((schedule: any) => (
              <div key={schedule.classId || 'GEN'} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Class Card Header */}
                <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{schedule.className}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Approved Schedule Breakdown for First & Subsequent Terms</p>
                  </div>

                  {/* Dual Totals Pill */}
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">New Entrants (Term 1)</p>
                      <p className="text-lg font-black text-amber-900">{formatCurrency(schedule.newStudentTotal)}</p>
                    </div>

                    <div className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Returning Students</p>
                      <p className="text-lg font-black text-blue-900">{formatCurrency(schedule.returningStudentTotal)}</p>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="table-container">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                        <th className="px-6 py-3.5">Fee Item & Description</th>
                        <th className="px-4 py-3.5">Billing Frequency</th>
                        <th className="px-4 py-3.5">Applicability Cohort</th>
                        <th className="px-6 py-3.5 text-right">Approved Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {schedule.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{item.name}</p>
                            {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`badge ${item.feeType === 'ONE_TIME' ? 'badge-purple' : item.feeType === 'ANNUAL' ? 'badge-blue' : 'badge-green'}`}>
                              {item.feeType === 'ONE_TIME' ? 'One-Time on Admission' : item.feeType === 'ANNUAL' ? 'Annual (Term 1)' : 'Per Term'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`badge ${
                              item.applicableTo === 'NEW_STUDENT'
                                ? 'bg-amber-100 text-amber-800'
                                : item.applicableTo === 'RETURNING_STUDENT'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.applicableTo === 'NEW_STUDENT' ? 'New Entrants Only' : item.applicableTo === 'RETURNING_STUDENT' ? 'Returning Only' : 'All Students'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold font-mono text-slate-900 text-base">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Notes per Class */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-500">
                  <p>
                    * Uniform pack & application fee are charged on initial admission only and do not recur for returning students.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/school/${slug}/apply`)}
                  >
                    Apply for {schedule.className}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Policy & Bursary Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Accepted Payment Methods</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We accept online card settlements via Paystack, direct verified bank transfers into official institutional accounts, and debit card POS at the School Bursary office. Cash payments must strictly be confirmed with an official digital receipt.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Flexible Instalment Policy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Parents may opt for a structured instalment arrangement (up to 3 instalments per term) upon written agreement with the School Bursar. All partial settlements receive individual immutable official bursary receipts.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Security & Payment Anti-Fraud</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Never pay school fees to private staff accounts, roadside cashiers, or unverified agents. All authenticated payments are automatically reflected in your real-time Parent Portal account.
            </p>
          </div>
        </div>

        {/* Contact Bursary */}
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Have Questions Regarding Fees or Scholarships?</h3>
            <p className="text-xs text-slate-500">Contact the School Bursary & Accounts Directorate directly.</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {school.phone && (
              <a href={`tel:${school.phone}`} className="btn-secondary text-xs font-bold gap-2">
                <Phone size={14} /> {school.phone}
              </a>
            )}
            {school.email && (
              <a href={`mailto:${school.email}`} className="btn-secondary text-xs font-bold gap-2">
                <Mail size={14} /> {school.email}
              </a>
            )}
            <Button variant="primary" onClick={() => navigate(`/school/${slug}/apply`)}>
              Begin Admission Application
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-xs border-t border-slate-800">
        <p>© {new Date().getFullYear()} {school.name || 'EduNest International School'}. Powered by EduNest Cloud ERP.</p>
      </footer>
    </div>
  );
}
