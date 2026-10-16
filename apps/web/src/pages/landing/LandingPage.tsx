import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Check, ArrowRight, ShieldCheck, Wifi, 
  Award, DollarSign, Monitor, ChevronDown, Users, School,
  FileText, Clock, Sparkles, BookOpen, Menu, X, ArrowUpRight
} from 'lucide-react';
import { EduNestLogo } from '../../components/common/EduNestLogo';

const CORE_MODULES = {
  academic: [
    { title: 'Student Master Dossier', desc: 'Centralized biodata, enrollment history, guardian links, and health records.' },
    { title: 'Broadsheets & Termly Cards', desc: 'Continuous assessment (CA) + exam calculation, automated rankings, and PDF transcripts.' },
    { title: 'CBT Examination Engine', desc: 'Secure question banks, timed tests, anti-cheating window lock, and instant auto-grading.' },
    { title: 'Biometric & Daily Attendance', desc: 'Daily classroom roll-call with automated SMS notifications to parents on arrival.' },
  ],
  finance: [
    { title: 'Automated Fee Invoicing', desc: 'Class-specific fee schedules, early-payment discounts, and automated invoice dispatch.' },
    { title: 'Paystack & Bank Settlement', desc: 'Direct online and transfer reconciliation with cryptographic receipt generation.' },
    { title: 'Staff Payroll & PAYE', desc: 'Monthly salary calculation with PAYE tax, pension deductions, and automated payslips.' },
    { title: 'Audited Financial Ledger', desc: 'Daily bursary logs, expense tracking, and real-time cashflow statements.' },
  ],
  campus: [
    { title: 'Hostel & Boarding Wardens', desc: 'Room allocation, boarding roll-call, exeat permit issuance, and warden logs.' },
    { title: 'Health Clinic & Sick Bay', desc: 'Student medical history, clinic visit logging, prescriptions, and emergency contacts.' },
    { title: 'Digital School Library', desc: 'Catalog indexing, barcode checkout, return tracking, and overdue fine management.' },
    { title: 'Inventory & Storekeeper', desc: 'Stock monitoring for uniforms, textbooks, laboratory equipment, and stationery.' },
  ],
};

const FAQS = [
  {
    q: 'How does EduNest function when internet access is unavailable?',
    a: 'EduNest uses a local-first offline cache. Teachers and administrators can take classroom attendance, input grades, and manage daily tasks offline. The instant connectivity is restored, all data automatically syncs with zero conflict or data loss.',
  },
  {
    q: 'Can we import our existing student records from Excel or CSV?',
    a: 'Yes. EduNest includes a 1-click spreadsheet importer. You can upload existing student biodata, parent contacts, and staff rosters in minutes without manual re-entry.',
  },
  {
    q: 'How do parents access terminal report cards and fee invoices?',
    a: 'Each institution receives a branded web portal (e.g. portal.yourschool.ng). Parents log in securely via smartphone or desktop to inspect terminal report cards, pay tuition fees directly via Paystack/Bank Transfer, and monitor attendance.',
  },
  {
    q: 'How does the pricing structure work? Are there setup fees?',
    a: 'Pricing is billed per academic term (3 terms per school year) based on enrolled scholar capacity. There are no setup fees, server maintenance charges, or update fees.',
  },
  {
    q: 'Is student and financial data secure?',
    a: 'Yes. Each institution operates in an isolated tenant partition with cryptographic encryption, automated daily off-site backups, role-based access controls, and full NDPR data compliance.',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'broadsheet' | 'bursary' | 'cbt'>('broadsheet');
  const [moduleCategory, setModuleCategory] = useState<'academic' | 'finance' | 'campus'>('academic');
  const [billingCycle, setBillingCycle] = useState<'termly' | 'annual'>('termly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-900 selection:text-white antialiased">

      {/* ── Minimalist Top Navigation ─────────────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs' 
          : 'bg-white/70 backdrop-blur-xs border-b border-slate-200/50'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <EduNestLogo size="sm" subtext="School OS" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600">
            <a href="#overview" className="hover:text-slate-900 transition-colors">Overview</a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">Offline Sync</a>
            <a href="#modules" className="hover:text-slate-900 transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faqs" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/saas/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              Register school <ArrowRight size={13} />
            </Link>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-medium text-slate-700 py-1.5">Overview</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-medium text-slate-700 py-1.5">Offline Sync</a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-medium text-slate-700 py-1.5">Modules</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-medium text-slate-700 py-1.5">Pricing</a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" className="text-center py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800">Sign in</Link>
              <Link to="/saas/register" className="text-center py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">Register school</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Refined Minimalist Hero ───────────────────────────────────────── */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Release Pill */}
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-full px-3 py-1 mb-6 text-xs text-slate-600 font-medium shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Version 2.4 Active</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">Offline-first institutional architecture</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.12]">
            The operating system for modern education.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-500 font-normal max-w-2xl mx-auto mt-4 leading-relaxed">
            EduNest unifies student biodata, continuous assessment broadsheets, automated fee settlement, and CBT exams into a single institutional platform—engineered to work online and offline.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/saas/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              Start 30-day pilot <ArrowRight size={14} />
            </Link>
            <a
              href="#overview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm px-5 py-2.5 rounded-lg shadow-2xs transition-colors"
            >
              Explore platform
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-normal">
            <span>✓ Works 100% offline</span>
            <span>✓ 1-click Excel student import</span>
            <span>✓ Ministry compliant</span>
          </div>
        </div>

        {/* ── Minimalist Clean Interactive Application Mockup ────────────────── */}
        <div id="overview" className="mt-14 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            {/* Titlebar */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                </div>
                <span className="font-mono text-slate-500 text-[11px] ml-2">app.edunest.ng/institution</span>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setActiveTab('broadsheet')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'broadsheet' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Terminal Broadsheet
                </button>
                <button
                  onClick={() => setActiveTab('bursary')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'bursary' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bursary Ledger
                </button>
                <button
                  onClick={() => setActiveTab('cbt')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'cbt' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CBT Assessment
                </button>
              </div>
            </div>

            {/* Display Body */}
            <div className="p-6 bg-white min-h-[280px]">
              {activeTab === 'broadsheet' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">JSS 3A Terminal Broadsheet</p>
                      <p className="text-slate-500 text-xs">First Term Assessment • CA 40% + Examination 60%</p>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Computed & Certified
                    </span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100 font-medium pb-2 text-[11px]">
                        <th className="py-2">Student Name</th>
                        <th className="py-2">Admission No</th>
                        <th className="py-2">CA 1 (20)</th>
                        <th className="py-2">CA 2 (20)</th>
                        <th className="py-2">Exam (60)</th>
                        <th className="py-2">Aggregate</th>
                        <th className="py-2">Grade</th>
                        <th className="py-2 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { name: 'Amina Bello', no: 'SCH-041', ca1: 18, ca2: 19, exam: 54, tot: 91, grade: 'A1', pos: '1st' },
                        { name: 'Chukwudi Eze', no: 'SCH-089', ca1: 17, ca2: 16, exam: 51, tot: 84, grade: 'B2', pos: '2nd' },
                        { name: 'Oluwaseun Bakare', no: 'SCH-112', ca1: 16, ca2: 17, exam: 48, tot: 81, grade: 'B2', pos: '3rd' },
                      ].map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-medium text-slate-900">{r.name}</td>
                          <td className="py-2.5 font-mono text-slate-500">{r.no}</td>
                          <td className="py-2.5 text-slate-600">{r.ca1}</td>
                          <td className="py-2.5 text-slate-600">{r.ca2}</td>
                          <td className="py-2.5 text-slate-600">{r.exam}</td>
                          <td className="py-2.5 font-semibold text-slate-900">{r.tot}%</td>
                          <td className="py-2.5">
                            <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                              {r.grade}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-medium text-slate-700">{r.pos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'bursary' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Tuition Settlement Ledger</p>
                      <p className="text-slate-500 text-xs">Direct Paystack & Automated Bank Reconciliation</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      Total: ₦18,450,000 Settled
                    </span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100 font-medium pb-2 text-[11px]">
                        <th className="py-2">Receipt No</th>
                        <th className="py-2">Payer / Scholar</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Channel</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { rc: 'REC-2026-0941', name: 'Zarah Mohammed', amt: '₦85,000', ch: 'Card (Paystack)', st: 'Reconciled', dt: 'Today, 09:14' },
                        { rc: 'REC-2026-0940', name: 'Ibrahim Danladi', amt: '₦85,000', ch: 'Bank Transfer', st: 'Reconciled', dt: 'Today, 08:32' },
                        { rc: 'REC-2026-0939', name: 'Grace Okafor', amt: '₦85,000', ch: 'Card (Paystack)', st: 'Reconciled', dt: 'Yesterday' },
                      ].map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-mono text-slate-500">{r.rc}</td>
                          <td className="py-2.5 font-medium text-slate-900">{r.name}</td>
                          <td className="py-2.5 font-semibold text-slate-900">{r.amt}</td>
                          <td className="py-2.5 text-slate-600">{r.ch}</td>
                          <td className="py-2.5">
                            <span className="font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                              {r.st}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-500">{r.dt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'cbt' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Computer-Based Examination Center</p>
                      <p className="text-slate-500 text-xs">Mathematics JSS 3 • Timed Auto-Submission</p>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Time: 34:12 Remaining
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
                    <p className="font-medium text-slate-900">
                      Question 14: Solve for \( x \) in the quadratic expression \( 2x^2 + 5x - 3 = 0 \).
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-white border border-blue-400 font-semibold text-blue-900">
                        A) x = 1/2 or x = -3 (Selected)
                      </div>
                      <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-600">
                        B) x = -1/2 or x = 3
                      </div>
                      <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-600">
                        C) x = 2 or x = -3/2
                      </div>
                      <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-600">
                        D) x = 3/2 or x = -1
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quiet Social Proof ────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider mb-6">
            Trusted by educational leaders across Nigeria
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
            <div>
              <p className="text-2xl font-semibold text-slate-900">200+</p>
              <p className="text-slate-500 mt-0.5">Accredited Schools</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">85,000+</p>
              <p className="text-slate-500 mt-0.5">Enrolled Scholars</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">₦2.4B+</p>
              <p className="text-slate-500 mt-0.5">Tuition Reconciled</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">99.98%</p>
              <p className="text-slate-500 mt-0.5">Platform Availability</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Core Pillars Bento Grid ─────────────────────────────────────── */}
      <section id="architecture" className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Core Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1">
              Purpose-built for institutional performance.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pillar 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Wifi size={18} />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Dual-Engine Offline Sync</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Classroom roll-call and continuous assessment grading function locally on laptops and tablets without internet. When connected, changes reconcile with zero data loss or conflicts.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Award size={18} />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Statutory Broadsheets</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Ministry-compliant grading models (CA 30%/40% + Exam 60%/70%). Calculates GPA, class rankings, and produces standardized printable PDF report cards in one click.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <DollarSign size={18} />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Reconciled Bursary Collection</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Integrated Paystack and bank transfer channels automatically log settlements and issue electronic receipts, completely eliminating manual teller verification queues.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Monitor size={18} />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">CBT Examination Suite</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Conduct large-scale mock tests and internal terminal exams. Features question bank randomization, anti-cheating window blur detection, and instant auto-grading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Organized Modules Tabbed Section ──────────────────────────────── */}
      <section id="modules" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Functional Modules
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1">
                Everything required to run your institution.
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setModuleCategory('academic')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  moduleCategory === 'academic' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Academic
              </button>
              <button
                onClick={() => setModuleCategory('finance')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  moduleCategory === 'finance' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bursary
              </button>
              <button
                onClick={() => setModuleCategory('campus')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  moduleCategory === 'campus' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Campus Life
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CORE_MODULES[moduleCategory].map((m, i) => (
              <div 
                key={i} 
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-2xs transition-all space-y-1.5"
              >
                <h4 className="font-semibold text-slate-900 text-sm">{m.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Minimalist Clean Pricing Matrix ───────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Transparent Tariff
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1">
              Predictable institutional pricing.
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Billed per academic term (3 terms per year). No hidden fees or setup charges.
            </p>

            <div className="mt-6 inline-flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg text-xs font-medium shadow-2xs">
              <button
                onClick={() => setBillingCycle('termly')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  billingCycle === 'termly' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Termly billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  billingCycle === 'annual' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual (Save 15%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Basic */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Basic Tier</p>
                <h3 className="font-semibold text-slate-900 text-base mt-0.5">Primary / Small School</h3>
                <p className="text-xs text-slate-500 mt-1">Up to 500 scholars</p>

                <div className="my-5">
                  <span className="text-2xl font-bold text-slate-900">
                    ₦{billingCycle === 'termly' ? '15,000' : '38,250'}
                  </span>
                  <span className="text-xs text-slate-500"> / {billingCycle === 'termly' ? 'term' : 'year'}</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Student biodata & roll call</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Terminal broadsheet grading</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> PDF report card generation</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Offline sync engine</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Paystack fee reconciliation</li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  to="/saas/register"
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Standard */}
            <div className="bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xs flex flex-col justify-between relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Most Popular
              </span>

              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase">Standard Tier</p>
                <h3 className="font-semibold text-slate-900 text-base mt-0.5">Comprehensive Academy</h3>
                <p className="text-xs text-slate-500 mt-1">Up to 2,000 scholars</p>

                <div className="my-5">
                  <span className="text-2xl font-bold text-slate-900">
                    ₦{billingCycle === 'termly' ? '35,000' : '89,250'}
                  </span>
                  <span className="text-xs text-slate-500"> / {billingCycle === 'termly' ? 'term' : 'year'}</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2 font-medium text-slate-900"><Check size={13} className="text-slate-900" /> Everything in Basic Tier</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> CBT examination suite</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Staff HR & automated payroll</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> E-Library, Clinic & Hostel</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Parent SMS & WhatsApp alerts</li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  to="/saas/register"
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Enterprise Tier</p>
                <h3 className="font-semibold text-slate-900 text-base mt-0.5">School Group / Multi-Campus</h3>
                <p className="text-xs text-slate-500 mt-1">Custom capacity quotas</p>

                <div className="my-5">
                  <span className="text-2xl font-bold text-slate-900">Custom Tariff</span>
                  <span className="text-xs text-slate-500 block mt-0.5">Tailored institutional package</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Unlimited scholars & staff</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Multi-campus centralized sync</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Custom domain (portal.school.edu.ng)</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Dedicated account manager</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-slate-800" /> Guaranteed 99.98% SLA</li>
                </ul>
              </div>

              <div className="pt-6">
                <a
                  href="#contact"
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Contact sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Minimalist Testimonials ───────────────────────────────────────── */}
      <section className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Testimonials
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1">
              Trusted by educational administrators.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                “Tuition reconciliation previously took our bursary three weeks every term. With EduNest, payments reflect instantly and parents receive digital receipts on WhatsApp.”
              </p>
              <div>
                <p className="font-semibold text-slate-900 text-xs">Alhaji Musa Ibrahim</p>
                <p className="text-[11px] text-slate-500">Principal, Dutse Model Secondary School</p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                “The CBT examination suite allowed us to run 1,400 students across 6 classes in a single morning. Results were generated immediately with broad sheets compiled automatically.”
              </p>
              <div>
                <p className="font-semibold text-slate-900 text-xs">Mrs. Folashade Adeyemi</p>
                <p className="text-[11px] text-slate-500">Proprietress, Crown Crest College, Lagos</p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                “The offline sync capability was the deciding factor for our campuses. Teachers take daily classroom roll-call without worrying about network fluctuations.”
              </p>
              <div>
                <p className="font-semibold text-slate-900 text-xs">Dr. Umar Bello Sani</p>
                <p className="text-[11px] text-slate-500">Executive Director, Apex Academy, Kano</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Minimalist FAQ Accordion ──────────────────────────────────────── */}
      <section id="faqs" className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FAQ</span>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
              Frequently asked questions.
            </h2>
          </div>

          <div className="space-y-2.5">
            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200/80 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 font-medium text-xs sm:text-sm text-slate-900 hover:text-slate-700"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2.5 font-normal">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Understated Minimalist Call To Action ──────────────────────────── */}
      <section id="contact" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-2xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            Ready to upgrade your school operations?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Deploy your school portal in less than 15 minutes with our automated spreadsheet onboarding.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/saas/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              Start 30-day school trial <ArrowRight size={14} />
            </Link>
            <a
              href="mailto:support@edunest.ng"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Speak with an advisor
            </a>
          </div>
        </div>
      </section>

      {/* ── Clean Minimalist Footer ────────────────────────────────────────── */}
      <footer className="py-12 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-2">
              <EduNestLogo size="sm" subtext="School OS" />
            </Link>

            <div className="flex items-center gap-6 text-slate-500">
              <Link to="/login" className="hover:text-slate-900 transition-colors">Portal Login</Link>
              <Link to="/saas/register" className="hover:text-slate-900 transition-colors">Register School</Link>
              <Link to="/super-admin" className="hover:text-slate-900 transition-colors">Platform SuperAdmin</Link>
              <a href="mailto:support@edunest.ng" className="hover:text-slate-900 transition-colors">Support</a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} EduNest. Built for educational institutions across Nigeria.</p>
            <p>NDPR Compliant · ISO 27001 Standard</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
