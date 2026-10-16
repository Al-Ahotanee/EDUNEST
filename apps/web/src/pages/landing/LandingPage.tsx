import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Check, ArrowRight, ShieldCheck, Wifi, 
  Award, DollarSign, Monitor, ChevronDown, Users, School,
  FileText, Clock, Sparkles, BookOpen, Menu, X, ArrowUpRight,
  TrendingUp, CheckCircle2, Lock, Download, Printer, Filter,
  Layers, Database, Smartphone, Globe, ShieldAlert
} from 'lucide-react';
import { EduNestLogo } from '../../components/common/EduNestLogo';

const CORE_MODULES = {
  academic: [
    { title: 'Student Master Dossier', desc: 'Centralized bio-data, enrollment history, guardian links, blood group, medical alerts, and multi-session historical academic archives.' },
    { title: 'Terminal CA Broadsheets', desc: 'Continuous Assessment (CA1 + CA2) and terminal examination automatic score computation, weighted averages, and automated class ranking.' },
    { title: 'CBT Examination Engine', desc: 'Secure anti-cheating browser lock, timed test windows, randomized question pools, and instant automated grading with question-by-question analytics.' },
    { title: 'Biometric & Daily Attendance', desc: 'Classroom roll-call with automated SMS/email alerts to parents upon arrival, tracking absenteeism and termly punctuality percentages.' },
  ],
  finance: [
    { title: 'Automated Tuition Invoicing', desc: 'Class-specific fee schedules, boarding surcharges, early-payment discounts, installment billing, and automated digital dispatch.' },
    { title: 'Paystack & Bank Settlement', desc: 'Direct online payment checkout and automated bank transfer reconciliation with cryptographic tamper-proof digital receipts.' },
    { title: 'Staff Payroll & PAYE Tax', desc: 'Monthly salary calculation with PAYE tax schedules, pension deductions, staff advance deductions, and automated payslip delivery.' },
    { title: 'Audited Financial Ledger', desc: 'Real-time bursary ledger, income and expenditure tracking, chart of accounts, and one-click financial audit statements.' },
  ],
  campus: [
    { title: 'Hostel & Boarding Wardens', desc: 'Room and bed allocation, boarding house roll-call, exeat permit issuance, visitor logging, and warden incident reports.' },
    { title: 'Health Clinic & Sick Bay', desc: 'Student medical record management, clinic visit logging, doctor prescriptions, nurse observations, and emergency guardian calls.' },
    { title: 'Digital School Library', desc: 'Catalog indexing by Dewey Decimal, barcode book checkout, due date tracking, automated overdue fine calculation, and inventory.' },
    { title: 'Inventory & Storekeeper', desc: 'Stock monitoring for uniforms, textbooks, laboratory supplies, and stationery with automatic reorder threshold notifications.' },
  ],
};

const FAQS = [
  {
    q: 'How does EduNest function when internet access is unavailable?',
    a: 'EduNest is engineered with an advanced local-first offline synchronization engine. Teachers can take classroom attendance, input continuous assessment scores, and conduct CBT exams completely offline. The moment connectivity is restored, all offline transactions seamlessly synchronize with the cloud database with zero data conflict.',
  },
  {
    q: 'Can we import our existing student and staff records from Excel or CSV?',
    a: 'Yes. EduNest includes an intelligent 1-click spreadsheet importer. You can upload existing student biodata, parent phone numbers, staff rosters, and historical grades in minutes without manual re-entry.',
  },
  {
    q: 'How do parents access terminal report cards and tuition invoices?',
    a: 'Each institution receives a branded web portal (e.g., yourschool.edunest.ng). Parents log in securely via smartphone or desktop to view terminal report cards, pay tuition fees directly via Paystack or Bank Transfer, and monitor attendance in real time.',
  },
  {
    q: 'How does the pricing structure work? Are there setup fees?',
    a: 'Pricing is billed per academic term based on enrolled student capacity. There are no setup fees, server maintenance charges, or update fees. Your subscription covers cloud hosting, SSL certificates, automated off-site backups, and support.',
  },
  {
    q: 'Is student and financial data secure and compliant with ministry standards?',
    a: 'Yes. Each institution operates in an isolated tenant partition with cryptographic encryption, automated daily off-site backups, role-based access controls, and full NDPR data protection compliance.',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'broadsheet' | 'bursary' | 'cbt'>('broadsheet');
  const [moduleCategory, setModuleCategory] = useState<'academic' | 'finance' | 'campus'>('academic');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-slate-900 selection:text-white antialiased">

      {/* ── World-Class Expansive Top Navigation ────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm' 
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-200/60'
      }`}>
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <EduNestLogo size="md" subtext="School Operating System" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#overview" className="hover:text-slate-900 transition-colors">Platform Overview</a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">Offline Sync</a>
            <a href="#modules" className="hover:text-slate-900 transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Tariff Packages</a>
            <a href="#faqs" className="hover:text-slate-900 transition-colors">Institutional FAQ</a>
          </nav>

          <div className="hidden sm:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Portal Sign In
            </Link>
            <Link
              to="/saas/register"
              className="inline-flex items-center gap-2 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span>Register Institution</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-8 py-6 space-y-4">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-2">Platform Overview</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-2">Offline Sync Architecture</a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-2">System Modules</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-2">Tariff Packages</a>
            <a href="#faqs" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-2">FAQ</a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link to="/login" className="text-center py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900">Sign In to Portal</Link>
              <Link to="/saas/register" className="text-center py-3 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-md">Register Institution</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Expansive Executive Hero Section ─────────────────────────────────── */}
      <section className="pt-36 pb-20 sm:pt-44 sm:pb-32 bg-white border-b border-slate-200/80">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 text-center">
          
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2.5 bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 mb-8 text-xs sm:text-sm text-slate-700 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>EduNest Enterprise Release v2.4</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-normal">Offline-First Institutional Architecture</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight leading-[1.05] max-w-5xl mx-auto">
            The operating system for modern education.
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-2xl text-slate-600 font-normal max-w-4xl mx-auto mt-6 leading-relaxed">
            EduNest unifies continuous assessment broadsheets, automated bursary reconciliation, CBT examinations, and student dossiers into a single, cohesive institutional platform—engineered to work flawlessly online and offline.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/saas/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <span>Start 30-day institutional pilot</span>
              <ArrowRight size={18} />
            </Link>
            <a
              href="#overview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-base px-8 py-4 rounded-xl shadow-xs transition-colors"
            >
              <span>Explore live platform</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-sm sm:text-base font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>100% Offline Resilience</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>1-Click Excel / CSV Importer</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>State Ministry & NDPR Compliant</span>
            </div>
          </div>
        </div>

        {/* ── Full-Width Immersive Application Mockup ────────────────────────── */}
        <div id="overview" className="mt-16 w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden">
            
            {/* Browser Chrome Header */}
            <div className="bg-slate-900 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-1 rounded-lg border border-slate-700/60 text-slate-300 font-mono text-xs">
                  <Lock size={12} className="text-emerald-400" />
                  <span>https://crown-crest.edunest.ng/broadsheet/2025-2026/term-3</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cloud Synced
                </span>
              </div>
            </div>

            {/* Interactive Tab Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('broadsheet')}
                  className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'broadsheet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Terminal Broadsheet & Scores
                </button>
                <button
                  onClick={() => setActiveTab('bursary')}
                  className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'bursary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bursary & Paystack Ledger
                </button>
                <button
                  onClick={() => setActiveTab('cbt')}
                  className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'cbt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CBT Examination Suite
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                <span className="hidden sm:inline">Academic Session: <strong>2025/2026</strong></span>
                <span className="hidden sm:inline">·</span>
                <span>Term: <strong>3rd Term (Promotional)</strong></span>
              </div>
            </div>

            {/* Executive KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50/50 border-b border-slate-200/80">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Enrolled Scholars</span>
                  <Users size={16} className="text-blue-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">1,420</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">↑ 14.2% vs previous term</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Terminal Attendance</span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">98.4%</p>
                <p className="text-xs text-slate-500 font-medium mt-1">38,400 daily roll-calls</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Tuition Collected</span>
                  <DollarSign size={16} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">₦48,650,000</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">99.2% reconciliation rate</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Broadsheets Approved</span>
                  <Award size={16} className="text-purple-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">100%</p>
                <p className="text-xs text-slate-500 font-medium mt-1">All 18 arms compiled</p>
              </div>
            </div>

            {/* TAB CONTENT: Broadsheet View */}
            {activeTab === 'broadsheet' && (
              <div className="p-6 overflow-x-auto">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">SS3 Diamond — Master Terminal Assessment Broadsheet</h3>
                    <p className="text-xs text-slate-500">Continuous Assessment (40%) + Promotional Exam (60%) = Total (100%)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs">
                      <Download size={13} /> Export Excel
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold flex items-center gap-1.5 shadow-2xs">
                      <Printer size={13} /> Print Transcripts
                    </button>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] tracking-wider border-y border-slate-200 font-bold">
                      <th className="py-3 px-4">Scholar Details</th>
                      <th className="py-3 px-3">Admission No</th>
                      <th className="py-3 px-3">CA 1 (20)</th>
                      <th className="py-3 px-3">CA 2 (20)</th>
                      <th className="py-3 px-3">Exam (60)</th>
                      <th className="py-3 px-3">Total (100)</th>
                      <th className="py-3 px-3">Grade</th>
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-4">Executive Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                          AA
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">Adeyemi Aminat O.</p>
                          <p className="text-[11px] text-slate-400">Science Department</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">EDN/2023/048</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">19</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">18</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">56</td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 text-sm">93.0</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">A1 (Distinction)</span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">1st of 42</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">Exceptional analytical prowess and leadership.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                          IB
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">Ibrahim Babatunde M.</p>
                          <p className="text-[11px] text-slate-400">Science Department</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">EDN/2023/112</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">18</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">17</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">52</td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 text-sm">87.0</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">A1 (Distinction)</span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">2nd of 42</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">Brilliant grasp of advanced physics and calculations.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          CO
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">Chukwuemeka Oluchi G.</p>
                          <p className="text-[11px] text-slate-400">Science Department</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">EDN/2023/074</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">17</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">16</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">49</td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 text-sm">82.0</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px]">B2 (Very Good)</span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">3rd of 42</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">Strong academic performance across all STEM courses.</td>
                    </tr>

                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          DU
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">Danjuma Usman K.</p>
                          <p className="text-[11px] text-slate-400">Science Department</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">EDN/2023/159</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">16</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">15</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">46</td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 text-sm">77.0</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px]">B3 (Good)</span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">4th of 42</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">Consistently dedicated. Commended for prompt CA work.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: Bursary Ledger View */}
            {activeTab === 'bursary' && (
              <div className="p-6 overflow-x-auto">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Terminal Bursary Ledger & Payment Settlements</h3>
                    <p className="text-xs text-slate-500">Automated payment reconciliation with Paystack, Bank Transfers, and Cash Desks</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      Live Settlement: 99.2%
                    </span>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 uppercase text-[10px] tracking-wider border-y border-slate-200 font-bold">
                      <th className="py-3 px-4">Invoice Ref</th>
                      <th className="py-3 px-3">Scholar & Class</th>
                      <th className="py-3 px-3">Payer / Guardian</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Channel</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Reconciliation Timestamp</th>
                      <th className="py-3 px-4">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">INV-2025-8491</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">Adeyemi Aminat (SS3)</td>
                      <td className="py-3.5 px-3 text-slate-600">Engr. T. Adeyemi</td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900">₦185,000</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">Paystack Checkout</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Settled & Verified</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-500">Today, 09:42 AM</td>
                      <td className="py-3.5 px-4">
                        <button className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1">
                          <Download size={12} /> PDF
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">INV-2025-8492</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">Ibrahim Babatunde (SS3)</td>
                      <td className="py-3.5 px-3 text-slate-600">Alhaji M. Ibrahim</td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900">₦185,000</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[10px]">Direct NIP Transfer</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Settled & Verified</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-500">Today, 08:15 AM</td>
                      <td className="py-3.5 px-4">
                        <button className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1">
                          <Download size={12} /> PDF
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: CBT View */}
            {activeTab === 'cbt' && (
              <div className="p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider">
                      Live Examination Room · Anti-Cheat Active
                    </span>
                    <h3 className="font-bold text-slate-900 text-xl mt-1.5">WAEC Mock Chemistry 2026 Paper II</h3>
                    <p className="text-xs text-slate-500 mt-0.5">50 Questions · Timed 60 Minutes · Window Focus Lock Enabled</p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xs">
                    <Clock size={18} className="text-amber-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Remaining Time</p>
                      <p className="text-lg font-mono font-bold text-white">38m : 24s</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-6">
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Question 14 of 50</p>
                      <p className="text-base font-semibold text-slate-900 leading-relaxed">
                        What is the IUPAC name for the organic compound with the molecular formula CH₃-CH(OH)-CH₂-COOH?
                      </p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'A', text: '3-hydroxybutanoic acid', correct: true },
                        { key: 'B', text: '2-hydroxybutanoic acid', correct: false },
                        { key: 'C', text: '4-hydroxybutanoic acid', correct: false },
                        { key: 'D', text: '1-hydroxybutyric acid', correct: false },
                      ].map(opt => (
                        <div
                          key={opt.key}
                          className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${
                            opt.correct
                              ? 'bg-blue-50/80 border-blue-500 text-slate-900 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            opt.correct ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="text-sm">{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Questions Matrix</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
                          <div
                            key={n}
                            className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              n === 14
                                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                : n < 14
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <ShieldCheck size={16} />
                        <span>Anti-Cheating Window: Locked</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Tab switches or minimize actions flag automated penalty logs to the invigilator.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── Offline Architecture Section ────────────────────────────────────── */}
      <section id="architecture" className="py-28 sm:py-36 bg-slate-50 border-b border-slate-200/80">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                Reliable Under Real Conditions
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Engineered for erratic power & intermittent internet.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Most school management software collapses the moment MTN, Airtel, or Starlink drops. EduNest was designed from day one with an **offline-first local database engine**.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Wifi size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Zero Disruption Roll-Call & Exams</h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">Teachers enter attendance and grades in remote classroom blocks without WiFi. Data persists locally and safely.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Automatic Conflict-Free Cloud Sync</h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">The instant internet re-establishes, transaction deltas merge automatically into the cloud without double-entry errors.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" />
                  Dual-Engine Architecture
                </span>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                  CRDT Sync Engine
                </span>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Online State (Cloud Synchronized)</p>
                    <p className="text-emerald-700 mt-0.5">Real-time parent portal updates, Paystack instant tuition settlement, and WhatsApp notifications.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-start gap-3">
                  <Wifi size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Offline State (Local-First Fallback)</p>
                    <p className="text-slate-600 mt-0.5">Continuous assessment scoring, classroom attendance, library barcode checkouts, and clinic logs continue 100% uninterrupted.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── System Modules Section ───────────────────────────────────────────── */}
      <section id="modules" className="py-28 sm:py-36 bg-white border-b border-slate-200/80">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
              Comprehensive Institutional Scope
            </span>
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mt-4">
              Everything your school requires. Nothing it doesn't.
            </h2>
            <p className="text-base sm:text-xl text-slate-600 mt-4 leading-relaxed">
              Designed around the operational realities of Nigerian private, mission, and model schools.
            </p>

            {/* Category Switcher */}
            <div className="mt-8 inline-flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setModuleCategory('academic')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  moduleCategory === 'academic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Academic & Exams
              </button>
              <button
                onClick={() => setModuleCategory('finance')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  moduleCategory === 'finance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bursary & Payroll
              </button>
              <button
                onClick={() => setModuleCategory('campus')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  moduleCategory === 'campus' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hostel, Clinic & Store
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_MODULES[moduleCategory].map((mod, idx) => (
              <div
                key={mod.title}
                className="p-8 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm mb-5 shadow-xs">
                    0{idx + 1}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{mod.title}</h3>
                  <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{mod.desc}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <span>Explore module details</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tariff Packages (Pricing) Section ─────────────────────────────────── */}
      <section id="pricing" className="py-28 sm:py-36 bg-slate-50 border-b border-slate-200/80">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              Transparent Institutional Pricing
            </span>
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mt-4">
              Predictable termly tariffs. Zero setup fees.
            </h2>
            <p className="text-base sm:text-xl text-slate-600 mt-4 leading-relaxed">
              Billed per academic term (3 terms per session). No hidden server maintenance or update charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Basic Pilot */}
            <div className="p-8 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Basic Evaluation</p>
                <p className="text-3xl font-black text-slate-900 mt-2">Free</p>
                <p className="text-xs text-slate-500 mt-1">14-day full pilot trial</p>
                <div className="my-6 border-t border-slate-100 pt-6 space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Up to 150 students</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Continuous Assessment Broadsheets</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Offline Local Sync</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Email Support</span></div>
                </div>
              </div>
              <Link to="/saas/register?plan=BASIC" className="w-full py-3 rounded-xl border border-slate-300 text-center text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors">
                Start Free Pilot
              </Link>
            </div>

            {/* Standard Term */}
            <div className="p-8 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white flex flex-col justify-between relative shadow-xl">
              <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-[11px] font-black uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Standard School</p>
                <p className="text-3xl font-black text-white mt-2">₦85,000</p>
                <p className="text-xs text-slate-400 mt-1">per term · up to 600 scholars</p>
                <div className="my-6 border-t border-slate-800 pt-6 space-y-3 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-400 flex-shrink-0" /><span>Up to 600 students</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-400 flex-shrink-0" /><span>CBT Exam Suite + Broad sheets</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-400 flex-shrink-0" /><span>Bursary & Paystack Integration</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-400 flex-shrink-0" /><span>Parent Portal + SMS Notices</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-400 flex-shrink-0" /><span>Priority Technical Support</span></div>
                </div>
              </div>
              <Link to="/saas/register?plan=STANDARD" className="w-full py-3 rounded-xl bg-white text-slate-950 text-center text-xs sm:text-sm font-black hover:bg-slate-100 transition-colors shadow-sm">
                Register Standard
              </Link>
            </div>

            {/* Institutional Pro */}
            <div className="p-8 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Institutional Pro</p>
                <p className="text-3xl font-black text-slate-900 mt-2">₦175,000</p>
                <p className="text-xs text-slate-500 mt-1">per term · up to 2,000 scholars</p>
                <div className="my-6 border-t border-slate-100 pt-6 space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Up to 2,000 students</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>All Academic, HR, & Hostel Modules</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Automated WhatsApp Fee Receipts</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Custom Domain (e.g. portal.school.ng)</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Dedicated Account Manager</span></div>
                </div>
              </div>
              <Link to="/saas/register?plan=PREMIUM" className="w-full py-3 rounded-xl border border-slate-300 text-center text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors">
                Select Pro Package
              </Link>
            </div>

            {/* Enterprise Group */}
            <div className="p-8 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Group / Multi-Campus</p>
                <p className="text-3xl font-black text-slate-900 mt-2">Custom</p>
                <p className="text-xs text-slate-500 mt-1">multi-branch network federation</p>
                <div className="my-6 border-t border-slate-100 pt-6 space-y-3 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Unlimited Scholars & Campuses</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Centralized Multi-School Dashboard</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Dedicated Cloud Database Cluster</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>Custom API & Ministry Data Feed</span></div>
                  <div className="flex items-center gap-2"><Check size={16} className="text-emerald-600 flex-shrink-0" /><span>24/7 Telephone SLA Hotline</span></div>
                </div>
              </div>
              <a href="mailto:enterprise@edunest.ng" className="w-full py-3 rounded-xl border border-slate-300 text-center text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors">
                Contact Enterprise
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── Testimonials Section ────────────────────────────────────────────── */}
      <section className="py-28 sm:py-36 bg-white border-b border-slate-200/80">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
              Institutional Trust
            </span>
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mt-4">
              Proven in classrooms across Nigeria.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-6">
              <p className="text-base text-slate-700 leading-relaxed">
                “Tuition reconciliation previously took our bursary three weeks every term. With EduNest, payments reflect instantly and parents receive digital receipts on WhatsApp.”
              </p>
              <div>
                <p className="font-bold text-slate-900 text-sm">Alhaji Musa Ibrahim</p>
                <p className="text-xs text-slate-500">Principal, Dutse Model Secondary School</p>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-6">
              <p className="text-base text-slate-700 leading-relaxed">
                “The CBT examination suite allowed us to run 1,400 students across 6 classes in a single morning. Results were generated immediately with broadsheets compiled automatically.”
              </p>
              <div>
                <p className="font-bold text-slate-900 text-sm">Mrs. Folashade Adeyemi</p>
                <p className="text-xs text-slate-500">Proprietress, Crown Crest College, Lagos</p>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-6">
              <p className="text-base text-slate-700 leading-relaxed">
                “The offline synchronization is real. Our teachers can enter CA scores from their classrooms even when network is dead, and it updates the master cloud broadsheet automatically.”
              </p>
              <div>
                <p className="font-bold text-slate-900 text-sm">Rev. Dr. Emmanuel Okonkwo</p>
                <p className="text-xs text-slate-500">Administrator, St. Andrews Academy, Enugu</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────────── */}
      <section id="faqs" className="py-28 sm:py-36 bg-slate-50 border-b border-slate-200/80">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
              Answers & Assurance
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-base sm:text-lg"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-slate-400 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-6 pt-1 border-t border-slate-100 text-sm sm:text-base text-slate-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pre-Footer Big CTA Banner ────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="bg-slate-900 text-white rounded-3xl p-12 sm:p-20 text-center shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
                Modernize your institution's operations today.
              </h2>
              <p className="text-base sm:text-xl text-slate-400 mt-6 leading-relaxed">
                Join forward-thinking schools transforming broadsheets, CBT exams, and tuition reconciliation with EduNest.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/saas/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white text-slate-950 hover:bg-slate-100 font-bold text-base px-8 py-4 rounded-xl shadow-lg transition-all"
                >
                  <span>Start 30-day school trial</span>
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="mailto:support@edunest.ng"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-800 text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors"
                >
                  <span>Speak with an advisor</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Full-Spectrum Modern Footer ─────────────────────────────────────── */}
      <footer className="py-16 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-12 border-b border-slate-200">
            <div>
              <Link to="/" className="flex items-center gap-3">
                <EduNestLogo size="md" subtext="School Operating System" />
              </Link>
              <p className="text-xs text-slate-500 mt-3 max-w-md">
                Institutional operating system for student continuous assessment broadsheets, automated bursary reconciliation, and CBT examinations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-8 text-sm font-semibold text-slate-700">
              <Link to="/login" className="hover:text-slate-900 transition-colors">Portal Login</Link>
              <Link to="/saas/register" className="hover:text-slate-900 transition-colors">Register School</Link>
              <Link to="/super-admin" className="hover:text-slate-900 transition-colors">Platform SuperAdmin</Link>
              <Link to="/marketer/login" className="hover:text-slate-900 transition-colors">Affiliates</Link>
              <a href="mailto:support@edunest.ng" className="hover:text-slate-900 transition-colors">Support</a>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} EduNest Institutional OS. Engineered for educational excellence.</p>
            <p className="flex items-center gap-3 font-medium">
              <span>NDPR Data Protection Compliant</span>
              <span>·</span>
              <span>ISO 27001 Certified Security</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
