import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Building2, User, FileText, CheckCircle, ChevronRight,
  ChevronLeft, Upload, Check, Shield, Globe, School, Loader2, X, AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { EduNestLogo } from '../../components/common/EduNestLogo';

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
];

const PLANS = [
  {
    id: 'BASIC',
    name: 'Basic Pilot',
    price: 'Free',
    sub: '14-day evaluation',
    popular: false,
    features: ['Up to 150 students', 'Class broadsheets', 'Offline sync', 'Email support'],
  },
  {
    id: 'STANDARD',
    name: 'Standard Term',
    price: '₦85,000',
    sub: 'per term',
    popular: true,
    features: ['Up to 600 students', 'CBT examination suite', 'Bursary & Paystack', 'Priority support'],
  },
  {
    id: 'PREMIUM',
    name: 'Institutional Pro',
    price: '₦175,000',
    sub: 'per term',
    popular: false,
    features: ['Up to 2,000 students', 'All academic modules', 'Parent portal & SMS', 'Dedicated account manager'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Group / Network',
    price: 'Custom',
    sub: 'multi-branch',
    popular: false,
    features: ['Multi-campus federation', 'Custom domain', 'Dedicated cluster', '24/7 SLA hotline'],
  },
];

const STEPS = [
  { id: 1, label: 'Institution Profile', icon: Building2 },
  { id: 2, label: 'Principal Account', icon: User },
  { id: 3, label: 'Plan & Accreditation', icon: FileText },
];

export default function SaasRegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [school, setSchool] = useState({
    schoolName: '',
    slug: '',
    schoolType: 'PRIMARY',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Lagos',
    lga: '',
    motto: '',
    yearEstablished: '',
    logo: '',
  });

  const [admin, setAdmin] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [plan, setPlan] = useState('STANDARD');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [documents, setDocuments] = useState<Record<string, { name: string; dataUrl: string }>>({});
  const [agreed, setAgreed] = useState(false);

  // ─── SLUG LIVE AVAILABILITY CHECK ────────────────────────────────────────────
  // EDN-slug fix: each school gets a subdomain like disc.edunest.com.
  // We validate + check availability on the backend via /saas/check-slug/:slug
  // with a 400ms debounce so the user sees inline feedback as they type.
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);

  // Strict client-side slug normalization: lowercase, alphanumeric + hyphens,
  // no leading/trailing hyphens, no consecutive hyphens.
  const normalizeSlug = (raw: string): string => {
    return raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')   // non-alphanumeric → hyphen
      .replace(/-{2,}/g, '-')         // collapse multiple hyphens
      .replace(/^-+|-+$/g, '');       // trim leading/trailing hyphens
  };

  useEffect(() => {
    if (!school.slug) {
      setSlugStatus('idle');
      setSlugMessage('');
      setSlugSuggestion(null);
      return;
    }
    const slug = school.slug;
    // Quick client-side length check (faster than round-trip)
    if (slug.length < 3) {
      setSlugStatus('invalid');
      setSlugMessage('Slug must be at least 3 characters');
      return;
    }
    if (slug.length > 30) {
      setSlugStatus('invalid');
      setSlugMessage('Slug must be 30 characters or fewer');
      return;
    }
    setSlugStatus('checking');
    setSlugMessage('');
    setSlugSuggestion(null);
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/saas/check-slug/${encodeURIComponent(slug)}`);
        const data = res.data?.data || res.data;
        if (data?.available) {
          setSlugStatus('available');
          setSlugMessage('Available');
          setSlugSuggestion(null);
        } else {
          setSlugStatus(data?.reason?.includes('reserved') ? 'invalid' : 'taken');
          setSlugMessage(data?.reason || 'Not available');
          setSlugSuggestion(data?.suggestion || null);
        }
      } catch {
        // Network error — don't block the user, just stay in 'checking' state
        setSlugStatus('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [school.slug]);

  const handleFileUpload = (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setDocuments(prev => ({
        ...prev,
        [key]: { name: file.name, dataUrl: reader.result as string }
      }));
      toast.success(`${file.name} attached`);
    };
    reader.readAsDataURL(file);
  };

  const setSchoolField = (k: string, v: string) => {
    if (k === 'schoolName') {
      // Auto-suggest a slug from the school name on first entry. The slug is
      // editable separately so the user can override it. We only auto-fill
      // when the slug is empty or still matches the previous auto-suggestion.
      const suggested = normalizeSlug(v);
      setSchool(f => ({
        ...f,
        schoolName: v,
        slug: f.slug && f.slug !== normalizeSlug(f.schoolName) ? f.slug : suggested,
      }));
      return;
    }
    if (k === 'slug') {
      // Normalize slug as the user types — strip illegal chars immediately
      const normalized = normalizeSlug(v);
      setSchool(f => ({ ...f, slug: normalized }));
      return;
    }
    setSchool(f => ({ ...f, [k]: v }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!school.schoolName.trim()) { toast.error('Please enter the official school name'); return false; }
      if (!school.slug.trim()) { toast.error('Please choose a subdomain slug'); return false; }
      if (slugStatus !== 'available') {
        toast.error('Subdomain is not available — please pick another');
        return false;
      }
      if (!school.email.trim()) { toast.error('Please provide an official school email'); return false; }
    }
    if (step === 2) {
      if (!admin.firstName.trim() || !admin.lastName.trim() || !admin.email.trim() || !admin.password) {
        toast.error('Please fill in all administrator fields');
        return false;
      }
      if (admin.password !== admin.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (admin.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return false;
      }
    }
    if (step === 3 && !agreed) {
      toast.error('Please accept the Institutional Terms and Conditions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const payloadDocuments = {
        ministryApprovalDoc: documents.ministryApprovalDoc?.dataUrl || '',
        cacDocument: documents.cacDocument?.dataUrl || '',
        proofOfAddress: documents.proofOfAddress?.dataUrl || '',
        otherDoc: documents.otherDoc?.dataUrl || '',
      };
      const res = await api.post('/saas/register', {
        school,
        admin,
        plan,
        referralCode,
        documents: payloadDocuments,
      });
      toast.success('Registration submitted successfully!');
      navigate('/login', { state: { message: res.data.data?.message || 'Institution registered. Please sign in.' } });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all";
  const labelClass = "block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="h-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 sm:px-10 lg:px-16 flex items-center justify-between sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <EduNestLogo size="md" subtext="School Onboarding" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 hidden sm:inline">Already registered?</span>
          <Link to="/login" className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
            Sign In →
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-5xl 2xl:max-w-6xl mx-auto px-6 sm:px-10 py-14 w-full">
        {/* Step Progression Bar */}
        <div className="flex items-center justify-center mb-8 max-w-xl mx-auto">
          {STEPS.map(({ id, label, icon: Icon }, i) => (
            <React.Fragment key={id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all text-xs font-semibold ${
                    step >= id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {step > id ? <Check size={16} /> : id}
                </div>
                <span className={`text-[11px] font-medium ${step >= id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 mb-4 transition-colors ${
                    step > id ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10">

            {/* STEP 1: Institution Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institutional Profile</h2>
                  <p className="text-xs text-slate-500 mt-1">Specify your school's official nomenclature and portal domain</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Official School Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dutse International Model College"
                      value={school.schoolName}
                      onChange={e => setSchoolField('schoolName', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Subdomain URL *</label>
                    <p className="text-xs text-slate-500 mb-2">
                      Your school's white-label entry point. This is the single URL every
                      principal, admin, teacher, parent, and visitor will use to reach your portal.
                    </p>
                    <div className="flex items-stretch">
                      <input
                        type="text"
                        required
                        placeholder="disc"
                        value={school.slug}
                        onChange={e => setSchoolField('slug', e.target.value)}
                        className={`${inputClass} rounded-r-none font-mono text-xs lowercase`}
                        style={{ textTransform: 'lowercase' }}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <span className="h-11 px-3 flex items-center bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-xs font-mono text-slate-500 whitespace-nowrap">
                        .edunest.com
                      </span>
                    </div>
                    {/* Live availability status */}
                    <div className="mt-2 min-h-[20px]">
                      {slugStatus === 'checking' && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Loader2 size={12} className="animate-spin" /> Checking availability…
                        </div>
                      )}
                      {slugStatus === 'available' && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                          <CheckCircle size={13} /> Available! URL will be{' '}
                          <span className="font-mono">{school.slug}.edunest.com</span>
                        </div>
                      )}
                      {slugStatus === 'taken' && (
                        <div className="flex items-start gap-1.5 text-xs text-rose-700">
                          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold">{slugMessage}</p>
                            {slugSuggestion && (
                              <button
                                type="button"
                                onClick={() => setSchoolField('slug', slugSuggestion)}
                                className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md text-rose-800 font-mono font-semibold transition-colors"
                              >
                                Use <strong>{slugSuggestion}</strong>.edunest.com →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {slugStatus === 'invalid' && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700">
                          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                          <span>{slugMessage}</span>
                        </div>
                      )}
                      {slugStatus === 'idle' && school.slug === '' && (
                        <p className="text-[11px] text-slate-400">
                          Lowercase letters, digits, and hyphens. 3-30 characters.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Institution Tier *</label>
                    <select
                      value={school.schoolType}
                      onChange={e => setSchoolField('schoolType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="NURSERY">Pre-Nursery / Early Years (Crèche, Playgroup)</option>
                      <option value="PRIMARY">Primary School (Nursery &amp; Basic 1-6)</option>
                      <option value="SECONDARY">Secondary School (JSS &amp; SSS)</option>
                      <option value="COMBINED">Comprehensive K-12 (Pre-Nursery → SSS)</option>
                      <option value="TERTIARY">Tertiary College / Polytechnic</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Official School Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admissions@school.edu.ng"
                      value={school.email}
                      onChange={e => setSchoolField('email', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Official Phone Line</label>
                    <input
                      type="tel"
                      placeholder="+234 803 000 0000"
                      value={school.phone}
                      onChange={e => setSchoolField('phone', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>State *</label>
                    <select
                      value={school.state}
                      onChange={e => setSchoolField('state', e.target.value)}
                      className={inputClass}
                    >
                      {NIGERIAN_STATES.map(st => (
                        <option key={st} value={st}>{st} State</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Ikeja, Dutse, Wuse 2"
                      value={school.city}
                      onChange={e => setSchoolField('city', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Campus Physical Address</label>
                    <input
                      type="text"
                      placeholder="Plot 14, Academic Way, Adjacent Federal Secretariat"
                      value={school.address}
                      onChange={e => setSchoolField('address', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>School Motto</label>
                    <input
                      type="text"
                      placeholder="e.g. Excellence, Integrity and Service"
                      value={school.motto}
                      onChange={e => setSchoolField('motto', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Year Established</label>
                    <input
                      type="number"
                      placeholder="e.g. 1998"
                      value={school.yearEstablished}
                      onChange={e => setSchoolField('yearEstablished', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Administrative Account */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Lead Administrator Account</h2>
                  <p className="text-xs text-slate-500 mt-1">This master account will hold executive authority over staff and students</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Principal First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Folashade"
                      value={admin.firstName}
                      onChange={e => setAdmin(f => ({ ...f, firstName: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Principal Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adeyemi"
                      value={admin.lastName}
                      onChange={e => setAdmin(f => ({ ...f, lastName: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Admin Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="principal@school.edu.ng"
                      value={admin.email}
                      onChange={e => setAdmin(f => ({ ...f, email: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Direct Phone *</label>
                    <input
                      type="tel"
                      placeholder="+234 802 000 0000"
                      value={admin.phone}
                      onChange={e => setAdmin(f => ({ ...f, phone: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Master Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 8 characters"
                      value={admin.password}
                      onChange={e => setAdmin(f => ({ ...f, password: e.target.value }))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Confirm Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={admin.confirmPassword}
                      onChange={e => setAdmin(f => ({ ...f, confirmPassword: e.target.value }))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Plan & Verification Documents */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tariff Plan & Verification</h2>
                  <p className="text-xs text-slate-500 mt-1">Select an institutional package and attach verification credentials</p>
                </div>

                {/* Plan Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PLANS.map(p => {
                    const isSelected = plan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPlan(p.id)}
                        className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        {p.popular && (
                          <span className={`absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-emerald-400 text-slate-900' : 'bg-slate-900 text-white'
                          }`}>
                            Popular
                          </span>
                        )}
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {p.name}
                        </p>
                        <p className="text-xl font-bold mt-1 tracking-tight">{p.price}</p>
                        <p className={`text-[10px] mb-3 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{p.sub}</p>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200/20 text-[11px]">
                          {p.features.map(f => (
                            <div key={f} className="flex items-center gap-1.5">
                              <Check size={12} className={isSelected ? 'text-emerald-400' : 'text-slate-700'} />
                              <span className={isSelected ? 'text-slate-200' : 'text-slate-600'}>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Document Attachments */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Shield size={14} className="text-blue-600" />
                    <span>State Ministry or Corporate Accreditation Document (Optional for Pilot)</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-3 flex items-center gap-2.5 cursor-pointer bg-white transition-colors">
                      <Upload size={16} className="text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-slate-700 block truncate">
                          {documents.ministryApprovalDoc ? documents.ministryApprovalDoc.name : 'Attach Ministry Approval / License'}
                        </span>
                        <span className="text-[10px] text-slate-400">PDF, JPG or PNG up to 10MB</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => e.target.files?.[0] && handleFileUpload('ministryApprovalDoc', e.target.files[0])}
                      />
                    </label>

                    <label className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-3 flex items-center gap-2.5 cursor-pointer bg-white transition-colors">
                      <Upload size={16} className="text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-slate-700 block truncate">
                          {documents.cacDocument ? documents.cacDocument.name : 'Attach CAC Certificate of Incorporation'}
                        </span>
                        <span className="text-[10px] text-slate-400">PDF, JPG or PNG up to 10MB</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => e.target.files?.[0] && handleFileUpload('cacDocument', e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>

                {/* Referral Code */}
                <div>
                  <label className={labelClass}>Partner / Marketer Referral Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. MKT-8492"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value.toUpperCase())}
                    className={`${inputClass} font-mono`}
                  />
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <label htmlFor="terms-check" className="cursor-pointer leading-relaxed">
                    I confirm that I am an authorized representative of this institution. I agree to EduNest's{' '}
                    <span className="text-slate-900 font-semibold underline">Institutional Operating Agreement</span> and{' '}
                    <span className="text-slate-900 font-semibold underline">Data Privacy Policy</span> under NDPR standards.
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* Action Footer */}
          <div className="px-6 sm:px-10 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>Continue</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>Complete Institutional Registration</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-200/60 bg-white text-center flex items-center justify-center text-xs text-slate-500 px-4">
        <span>© {new Date().getFullYear()} EduNest Institutional OS. Fully NDPR & ISO 27001 Compliant.</span>
      </footer>
    </div>
  );
}
