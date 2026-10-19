import React, { useState } from 'react';
import { ArrowUpRight, Check, Send, CheckCircle, ChevronDown, MapPin, Phone, Mail } from 'lucide-react';

interface TemplateProps {
  data: any;
  onApplyClick: () => void;
  onPortalClick: () => void;
  onSubmitInquiry: (form: any) => Promise<any>;
}

export default function MinimalExcellenceTemplate({
  data,
  onApplyClick,
  onPortalClick,
  onSubmitInquiry,
}: TemplateProps) {
  const { content, branding } = data;
  const enabled = content?.enabledSections || {};
  const hero = content?.hero || {};
  const stats = content?.stats || [];
  const about = content?.about || {};
  const programs = content?.programs || [];
  const facilities = content?.facilities || [];
  const faculty = content?.faculty || [];
  const testimonials = content?.testimonials || [];
  const faq = content?.faq || [];
  const contact = content?.contact || {};

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitting(true);
    try {
      await onSubmitInquiry(inquiryForm);
      setInquirySent(true);
      setInquiryForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      // toast in parent
    } finally {
      setInquirySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Ultra-Clean Minimal Topbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-10 w-10 object-contain rounded-lg" />
            ) : (
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                style={{ backgroundColor: 'var(--color-primary, #111827)' }}
              >
                {branding.name?.[0] || 'E'}
              </div>
            )}
            <span className="font-bold text-base tracking-tight text-neutral-900">{branding.name}</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide uppercase text-neutral-500">
            <a href="#about" className="hover:text-neutral-900 transition-colors">Philosophy</a>
            <a href="#programs" className="hover:text-neutral-900 transition-colors">Academics</a>
            <a href="#facilities" className="hover:text-neutral-900 transition-colors">Campus</a>
            <a href="#contact" className="hover:text-neutral-900 transition-colors">Inquiries</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={onPortalClick}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
            >
              Sign In
            </button>
            <button
              onClick={onApplyClick}
              className="px-5 py-2.5 rounded-full text-white text-xs font-semibold tracking-wide shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--color-primary, #111827)' }}
            >
              Apply Online <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Typography-Driven Hero */}
      {enabled.hero !== false && (
        <section className="py-24 sm:py-32 max-w-6xl mx-auto px-6 border-b border-neutral-100">
          <div className="max-w-4xl space-y-8">
            <div className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium tracking-wider uppercase">
              {hero.badgeText || 'Academic Precision & Moral Clarity'}
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.08] text-neutral-950">
              {hero.headline}
            </h1>
            <p className="text-lg sm:text-xl text-neutral-500 font-light leading-relaxed max-w-2xl">
              {hero.subtitle}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={onApplyClick}
                className="px-8 py-3.5 rounded-full text-white font-medium text-sm transition-all hover:scale-105 flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary, #111827)' }}
              >
                Commence Admission <ArrowUpRight size={16} />
              </button>
              <a
                href="#about"
                className="px-8 py-3.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium text-sm transition-all"
              >
                Explore Academic Charter
              </a>
            </div>
          </div>
        </section>
      )}

      {/* High-Contrast Minimal Stats */}
      {enabled.stats !== false && stats.length > 0 && (
        <section className="py-16 max-w-6xl mx-auto px-6 border-b border-neutral-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((st: any, i: number) => (
              <div key={i} className="border-l border-neutral-200 pl-6">
                <span className="text-4xl sm:text-5xl font-light tracking-tight block text-neutral-950" style={{ color: 'var(--color-primary, #111827)' }}>
                  {st.value}
                </span>
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-medium mt-2 block">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Philosophy & Purpose */}
      {enabled.about !== false && (
        <section id="about" className="py-24 max-w-6xl mx-auto px-6 border-b border-neutral-100">
          <div className="grid md:grid-cols-12 gap-16">
            <div className="md:col-span-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 block mb-2">Our Philosophy</span>
              <h2 className="text-3xl font-light tracking-tight text-neutral-900 leading-tight">
                {about.title || 'Forming Intellect and Virtue'}
              </h2>
            </div>
            <div className="md:col-span-8 space-y-8 text-neutral-600 font-light text-base leading-relaxed">
              <p>{about.history}</p>
              <div className="grid sm:grid-cols-2 gap-8 pt-4 border-t border-neutral-100">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">The Mission</h4>
                  <p className="text-sm text-neutral-500 leading-relaxed">{about.mission}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">The Vision</h4>
                  <p className="text-sm text-neutral-500 leading-relaxed">{about.vision}</p>
                </div>
              </div>
              {about.principalMessage && (
                <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-100 mt-6">
                  <p className="italic text-sm text-neutral-700 leading-relaxed mb-4">"{about.principalMessage}"</p>
                  <div>
                    <span className="font-bold text-neutral-900 text-sm block">{about.principalName}</span>
                    <span className="text-xs text-neutral-400">{about.principalTitle}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Structured Curriculum Overview */}
      {enabled.programs !== false && programs.length > 0 && (
        <section id="programs" className="py-24 max-w-6xl mx-auto px-6 border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-16">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 block mb-2">Academic Architecture</span>
              <h2 className="text-3xl font-light text-neutral-900">Curriculum Streams</h2>
            </div>
            <button onClick={onApplyClick} className="text-xs font-bold uppercase tracking-wider underline hover:text-neutral-600">
              View Admissions Requirements →
            </button>
          </div>

          <div className="divide-y divide-neutral-100">
            {programs.map((prog: any, i: number) => (
              <div key={i} className="py-8 grid md:grid-cols-12 gap-8 items-start">
                <div className="md:col-span-4">
                  <span className="text-xs font-mono text-neutral-400 block mb-1">{prog.ageRange}</span>
                  <h3 className="text-xl font-medium text-neutral-950">{prog.name}</h3>
                </div>
                <div className="md:col-span-8 space-y-4">
                  <p className="text-sm text-neutral-600 font-light leading-relaxed">{prog.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {prog.subjects?.map((sub: string, sIdx: number) => (
                      <span key={sIdx} className="px-3 py-1 rounded-full bg-neutral-50 text-neutral-600 text-xs border border-neutral-200/60 font-light">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Facilities & Learning Spaces */}
      {enabled.facilities !== false && facilities.length > 0 && (
        <section id="facilities" className="py-24 max-w-6xl mx-auto px-6 border-b border-neutral-100">
          <div className="mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 block mb-2">Campus Grounds</span>
            <h2 className="text-3xl font-light text-neutral-900">Spaces Dedicated to Discovery</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {facilities.map((fac: any, i: number) => (
              <div key={i} className="space-y-4">
                <div className="h-72 overflow-hidden rounded-2xl bg-neutral-100">
                  <img src={fac.image} alt={fac.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">{fac.badge || 'Learning Space'}</span>
                  <h3 className="font-medium text-neutral-900 text-lg">{fac.title}</h3>
                  <p className="text-sm text-neutral-500 font-light leading-relaxed mt-1">{fac.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Minimal Inquiries */}
      {enabled.contact !== false && (
        <section id="contact" className="py-24 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-16">
            <div className="md:col-span-5 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 block">Admissions Registry</span>
              <h2 className="text-3xl font-light text-neutral-900">Inquire or Arrange a Consultation</h2>
              <p className="text-sm text-neutral-500 font-light leading-relaxed">
                Our admissions committee reviews prospective student inquiries on a rolling basis.
              </p>

              <div className="space-y-3 pt-4 text-xs font-light text-neutral-600">
                <p className="flex items-center gap-2"><MapPin size={15} /> {contact.address || branding.address}</p>
                <p className="flex items-center gap-2"><Phone size={15} /> {contact.phone || branding.phone}</p>
                <p className="flex items-center gap-2"><Mail size={15} /> {contact.email || branding.email}</p>
              </div>
            </div>

            <div className="md:col-span-7">
              {inquirySent ? (
                <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-100 text-center space-y-2">
                  <CheckCircle size={32} className="text-neutral-900 mx-auto" />
                  <h4 className="font-medium text-neutral-900 text-sm">Inquiry Received</h4>
                  <p className="text-xs text-neutral-500">Thank you for writing. Our admissions desk will correspond directly.</p>
                  <button onClick={() => setInquirySent(false)} className="mt-4 text-xs underline font-medium">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-neutral-500 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900 font-light"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-500 mb-1">Email</label>
                      <input
                        required
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900 font-light"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900 font-light"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-500 mb-1">Message</label>
                    <textarea
                      required
                      rows={3}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900 font-light"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="w-full py-3.5 rounded-xl text-white font-medium text-xs tracking-wider uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary, #111827)' }}
                  >
                    {inquirySubmitting ? 'Submitting...' : 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Minimal Footer */}
      <footer className="py-12 max-w-6xl mx-auto px-6 border-t border-neutral-100 text-xs text-neutral-400 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>{branding.name}</span>
        <span>{content?.footer?.copyright || `© ${new Date().getFullYear()} ${branding.name}. All Rights Reserved.`}</span>
      </footer>
    </div>
  );
}
