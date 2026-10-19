import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { admissionsApi, websiteApi } from '../../services/api';
import { applyThemeColors } from '../../hooks/useTenantTheme';
import {
  Search, ArrowLeft, CheckCircle2, Clock, Calendar, AlertCircle,
  FileText, Download, Printer, Phone, Mail, MapPin, Building
} from 'lucide-react';
import toast from 'react-hot-toast';

const STAGES = [
  { key: 'SUBMITTED', label: 'Application Submitted', desc: 'Received and queued for initial verification' },
  { key: 'UNDER_REVIEW', label: 'Under Review', desc: 'Academic board is evaluating credentials' },
  { key: 'EXAM_SCHEDULED', label: 'Entrance Examination', desc: 'Assessment date assigned' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Parent Consultation', desc: 'Interview scheduled' },
  { key: 'APPROVED', label: 'Offer of Admission', desc: 'Provisional admission granted' },
  { key: 'ENROLLED', label: 'Fully Enrolled', desc: 'Enrolled in student register and class assigned' },
];

export default function AdmissionStatusCheckerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [applicationNo, setApplicationNo] = useState('');
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load school info for branding
  const { data: school } = useQuery({
    queryKey: ['status-check-school', slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await websiteApi.getPublicWebsite(slug);
      return res.data?.data?.branding;
    },
    enabled: !!slug,
  });

  React.useEffect(() => {
    if (school) {
      applyThemeColors({
        primaryColor: school.primaryColor,
        secondaryColor: school.secondaryColor,
        name: school.name,
        logo: school.logo,
      });
    }
  }, [school]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationNo.trim() || !phone.trim()) {
      toast.error('Please enter both your Application Number and registered Phone number');
      return;
    }

    setSearching(true);
    setResult(null);

    try {
      const res = await admissionsApi.checkStatus(slug!, applicationNo.trim(), phone.trim());
      setResult(res.data?.data);
      toast.success('Application record located!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not find an application matching those details.');
    } finally {
      setSearching(false);
    }
  };

  const getStageIndex = (stage: string, status: string) => {
    if (status === 'REJECTED' || stage === 'REJECTED') return -1;
    if (status === 'APPROVED' || stage === 'APPROVED') return 4;
    if (status === 'ENROLLED' || stage === 'ENROLLED') return 5;
    const idx = STAGES.findIndex(s => s.key === stage);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIdx = result ? getStageIndex(result.stage, result.status) : 0;
  const isRejected = result?.status === 'REJECTED' || result?.stage === 'REJECTED';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to={`/school/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} /> Back to School Website
          </Link>
          <Link
            to={`/school/${slug}/apply`}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Submit New Application →
          </Link>
        </div>

        {/* School Branding Banner */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center space-y-3">
          {school?.logo ? (
            <img src={school.logo} alt={school.name} className="h-16 w-16 mx-auto object-contain rounded-2xl shadow-sm" />
          ) : (
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto shadow-md"
              style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
            >
              {school?.name?.[0] || 'S'}
            </div>
          )}
          <h1 className="text-2xl font-black text-slate-900">{school?.name || 'School Admissions'}</h1>
          <p className="text-xs text-slate-500 font-medium">Online Application Status Portal & Decision Tracker</p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-md">
          <h2 className="text-base font-extrabold text-slate-900 mb-1">Check Your Admission Status</h2>
          <p className="text-xs text-slate-500 mb-6">Enter the Application Number generated upon submission and the primary Parent Phone number.</p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Application Number *
                </label>
                <input
                  required
                  type="text"
                  value={applicationNo}
                  onChange={(e) => setApplicationNo(e.target.value.toUpperCase())}
                  placeholder="e.g. DEMO/26/0001"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parent Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={searching}
              className="w-full py-3.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
            >
              <Search size={16} /> {searching ? 'Searching Records...' : 'Check Live Status'}
            </button>
          </form>
        </div>

        {/* Results Card */}
        {result && (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-8 animate-fadeIn">
            {/* Applicant Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 block mb-1">
                  Application #{result.applicationNo}
                </span>
                <h3 className="text-2xl font-black text-slate-900">{result.applicantName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Applied for Class: <strong className="text-slate-800">{result.applyingForClass}</strong></p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  result.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  result.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                  result.status === 'SCREENING' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {result.status}
                </span>
              </div>
            </div>

            {/* Decision Status Banner */}
            {isRejected ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <AlertCircle size={20} className="text-rose-600" /> Admission Decision Notice
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Thank you for your interest in {school?.name || 'our school'}. After careful consideration of all applicants, we regret that we are unable to offer admission for the selected class session at this time.
                </p>
                {result.rejectionReason && (
                  <p className="text-xs font-medium text-rose-900 bg-white/70 p-3 rounded-lg border border-rose-200">
                    Remark: {result.rejectionReason}
                  </p>
                )}
              </div>
            ) : result.status === 'APPROVED' ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                  <CheckCircle2 size={22} className="text-emerald-600" /> Congratulations! Provisional Admission Granted
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  We are delighted to offer {result.applicantName} provisional admission to <strong>{result.applyingForClass}</strong> at {school?.name || 'our institution'}.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Printer size={15} /> Print Admission Acknowledgement Slip
                  </button>
                  <Link
                    to="/parent-portal"
                    className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
                  >
                    Go to Parent Portal →
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Stepper Progression */}
            {!isRejected && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Application Progress Stepper</h4>
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-6 py-2">
                  {STAGES.map((st, idx) => {
                    const isCompleted = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;

                    return (
                      <div key={st.key} className="relative">
                        <div
                          className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                              : 'bg-slate-200 text-slate-500 ring-4 ring-slate-100'
                          }`}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <div>
                          <h5 className={`font-bold text-sm ${isCurrent ? 'text-blue-600 font-extrabold' : 'text-slate-800'}`}>
                            {st.label} {isCurrent && <span className="ml-2 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">In Progress</span>}
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
                          {st.key === 'EXAM_SCHEDULED' && result.examDate && (
                            <p className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 inline-flex items-center gap-2">
                              <Calendar size={14} /> Examination Date: {new Date(result.examDate).toLocaleDateString()} {new Date(result.examDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {st.key === 'INTERVIEW_SCHEDULED' && result.interviewDate && (
                            <p className="mt-2 text-xs font-semibold text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200 inline-flex items-center gap-2">
                              <Clock size={14} /> Consultation Date: {new Date(result.interviewDate).toLocaleDateString()} {new Date(result.interviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* School Contact Footer */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-2"><Phone size={14} className="text-blue-600" /> {result.school?.phone || school?.phone}</span>
              <span className="flex items-center gap-2"><Mail size={14} className="text-blue-600" /> {result.school?.email || school?.email}</span>
              <button onClick={() => window.print()} className="font-bold text-slate-800 hover:underline flex items-center gap-1">
                <Printer size={13} /> Print Slip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
