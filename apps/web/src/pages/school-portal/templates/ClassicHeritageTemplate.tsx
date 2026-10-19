import React, { useState } from 'react';
import {
  Award, Shield, BookOpen, Send, CheckCircle, ChevronDown,
  MapPin, Phone, Mail, Clock, ArrowRight, FileText
} from 'lucide-react';

interface TemplateProps {
  data: any;
  onApplyClick: () => void;
  onPortalClick: () => void;
  onSubmitInquiry: (form: any) => Promise<any>;
}

export default function ClassicHeritageTemplate({
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
  const events = content?.events || [];
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
    <div className="min-h-screen bg-stone-50 font-serif text-stone-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Formal Traditional Header */}
      <div className="border-b-4 border-double border-amber-800/40 bg-stone-100 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-5">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-20 w-20 object-contain ring-2 ring-stone-300 p-1 bg-white rounded-lg shadow-sm" />
            ) : (
              <div
                className="h-20 w-20 rounded-lg flex items-center justify-center text-white font-serif text-3xl font-black shadow-md border-2 border-amber-600/30"
                style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
              >
                {branding.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-900 font-sans font-bold block mb-1">
                Founded {branding.yearEstablished || 1998} • Institutional Heritage
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-normal uppercase">
                {branding.name}
              </h1>
              {branding.motto && (
                <p className="text-sm italic text-stone-600 font-serif mt-1">"{branding.motto}"</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-sans">
            <button
              onClick={onPortalClick}
              className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 shadow-sm"
            >
              Portal Login
            </button>
            <button
              onClick={onApplyClick}
              className="px-5 py-2 text-xs font-bold text-white uppercase tracking-wider rounded-md shadow-md transition-all hover:brightness-110"
              style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
            >
              Enrolment & Admissions
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-stone-900 text-stone-200 text-xs uppercase tracking-widest font-sans font-bold border-b border-stone-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center sm:justify-start gap-8 h-12 overflow-x-auto">
          <a href="#about" className="hover:text-amber-400 transition-colors whitespace-nowrap">Institutional History</a>
          <a href="#programs" className="hover:text-amber-400 transition-colors whitespace-nowrap">Academic Programs</a>
          <a href="#facilities" className="hover:text-amber-400 transition-colors whitespace-nowrap">Facilities</a>
          <a href="#leadership" className="hover:text-amber-400 transition-colors whitespace-nowrap">Headmaster's Desk</a>
          <a href="#faq" className="hover:text-amber-400 transition-colors whitespace-nowrap">Admissions Guide</a>
          <a href="#contact" className="hover:text-amber-400 transition-colors whitespace-nowrap">Contact Us</a>
        </div>
      </nav>

      {/* Hero Section with Academic Crest Aesthetic */}
      {enabled.hero !== false && (
        <section className="relative py-24 px-4 bg-stone-950 text-white overflow-hidden border-b-8 border-stone-800">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 filter grayscale"
            style={{ backgroundImage: `url(${hero.bgImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1800&q=80'})` }}
          />
          <div className="relative max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-block p-3 rounded-full border border-amber-500/40 bg-stone-900/80 mb-2">
              <Award className="text-amber-400" size={32} />
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-wide leading-tight text-amber-50">
              {hero.headline}
            </h2>
            <div className="w-24 h-1 bg-amber-500/80 mx-auto my-4" />
            <p className="text-lg text-stone-300 font-sans max-w-2xl mx-auto leading-relaxed">
              {hero.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4 font-sans">
              <button
                onClick={onApplyClick}
                className="px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xl rounded-md transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
              >
                Commence Admission Application
              </button>
              <a
                href="#about"
                className="px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-stone-200 border border-stone-500 hover:bg-white/10 rounded-md transition-all"
              >
                Inspect Curriculum
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Traditional Stats Banner */}
      {enabled.stats !== false && stats.length > 0 && (
        <section className="bg-stone-200/80 border-b border-stone-300 py-8 px-4 font-sans">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((st: any, i: number) => (
              <div key={i} className="border-r last:border-r-0 border-stone-300 px-3">
                <span className="text-3xl font-black block text-stone-900 font-serif" style={{ color: 'var(--color-primary, #1e3a8a)' }}>
                  {st.value}
                </span>
                <span className="text-xs uppercase font-bold text-stone-600 tracking-wider mt-1 block">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Split-Pane History & Milestones */}
      {enabled.about !== false && (
        <section id="about" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-7 space-y-6">
              <div className="border-l-4 border-amber-800 pl-4">
                <span className="text-xs font-sans font-bold uppercase tracking-widest text-stone-500">Historical Foundations</span>
                <h3 className="text-3xl font-black text-stone-900 mt-1 uppercase">
                  {about.title || 'A Century of Scholastic Tradition'}
                </h3>
              </div>
              <p className="text-stone-700 text-base leading-relaxed">
                {about.history}
              </p>
              <div className="p-6 bg-stone-100 rounded-lg border-l-4 border-stone-800 space-y-4">
                <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wide font-sans">Institutional Creed</h4>
                <p className="text-xs text-stone-700 italic leading-relaxed">"{about.mission}"</p>
                <p className="text-xs text-stone-700 font-sans font-semibold">Vision: {about.vision}</p>
              </div>
            </div>

            {/* Formal Headmaster Letterhead Card */}
            <div id="leadership" className="md:col-span-5 bg-white p-8 rounded-lg shadow-md border-2 border-stone-200 relative">
              <div className="absolute top-4 right-4 opacity-10">
                <Shield size={72} />
              </div>
              <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-amber-900 block mb-2">Office of the Principal</span>
              <div className="flex items-center gap-4 pb-4 border-b border-stone-200">
                <img
                  src={about.principalPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                  alt={about.principalName}
                  className="w-16 h-16 rounded-md object-cover ring-2 ring-stone-300 shadow-sm"
                />
                <div>
                  <h4 className="font-extrabold text-stone-900 text-base">{about.principalName}</h4>
                  <p className="text-xs text-stone-500 font-sans">{about.principalTitle}</p>
                </div>
              </div>
              <div className="pt-4 text-xs text-stone-700 leading-relaxed italic space-y-3">
                <p>"{about.principalMessage}"</p>
              </div>
              {branding.principalSignature ? (
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <img src={branding.principalSignature} alt="Signature" className="h-10 object-contain" />
                  <span className="text-[10px] font-sans text-stone-400 uppercase tracking-widest">Official Seal</span>
                </div>
              ) : (
                <div className="mt-6 pt-4 border-t border-stone-200 text-right">
                  <span className="text-[11px] font-sans font-bold text-stone-400 uppercase tracking-wider block">Authorized Signatory</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tabular Academic Curriculum */}
      {enabled.programs !== false && programs.length > 0 && (
        <section id="programs" className="py-20 bg-stone-100 border-y border-stone-300">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-sans font-bold uppercase tracking-widest text-stone-500 block mb-1">Formative Stages</span>
              <h3 className="text-3xl font-black text-stone-900 uppercase">Curriculum Framework</h3>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-stone-300 overflow-hidden font-sans">
              <div className="divide-y divide-stone-200">
                {programs.map((prog: any, i: number) => (
                  <div key={i} className="p-6 md:flex items-start justify-between gap-6 hover:bg-stone-50/70 transition-colors">
                    <div className="md:w-1/3 mb-3 md:mb-0">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">{prog.ageRange}</span>
                      <h4 className="text-lg font-extrabold text-stone-900 font-serif">{prog.name}</h4>
                    </div>
                    <div className="md:w-2/3">
                      <p className="text-xs text-stone-600 leading-relaxed mb-3">{prog.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {prog.subjects?.map((sub: string, sIdx: number) => (
                          <span key={sIdx} className="px-2.5 py-1 bg-stone-100 text-stone-700 text-[11px] font-medium rounded border border-stone-200">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Facilities Archive */}
      {enabled.facilities !== false && facilities.length > 0 && (
        <section id="facilities" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 font-sans">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">Estate & Infrastructure</span>
            <h3 className="text-3xl font-black text-stone-900 font-serif uppercase">Campus Amenities</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {facilities.map((fac: any, i: number) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-stone-300 flex flex-col sm:flex-row gap-5 items-center">
                <img src={fac.image} alt={fac.title} className="w-full sm:w-44 h-36 object-cover rounded-md border border-stone-200" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    {fac.badge || 'Estate'}
                  </span>
                  <h4 className="font-bold text-stone-900 text-base font-serif">{fac.title}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{fac.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admissions Inquiries & Formal Register */}
      {enabled.contact !== false && (
        <section id="contact" className="py-20 bg-stone-200/60 border-t border-stone-300 font-sans">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12">
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500 block">Registry & Admissions</span>
              <h3 className="text-3xl font-black text-stone-900 font-serif uppercase">Official Registry</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Parents seeking prospectus, examination schedules, or bursary details may submit a dispatch to the registrar.
              </p>

              <div className="space-y-3 pt-2 text-xs text-stone-700">
                <p className="flex items-center gap-2"><MapPin size={16} /> {contact.address || branding.address}</p>
                <p className="flex items-center gap-2"><Phone size={16} /> {contact.phone || branding.phone}</p>
                <p className="flex items-center gap-2"><Mail size={16} /> {contact.email || branding.email}</p>
                <p className="flex items-center gap-2"><Clock size={16} /> {contact.openingHours || 'Monday – Friday, 8:00 AM – 4:00 PM'}</p>
              </div>
            </div>

            {/* Inquiries Box */}
            <div className="bg-white p-8 rounded-lg shadow-md border border-stone-300">
              <h4 className="font-extrabold text-stone-900 text-base uppercase font-serif mb-4">Official Dispatch / Inquiry</h4>
              {inquirySent ? (
                <div className="p-4 bg-stone-100 border border-stone-300 rounded text-center">
                  <CheckCircle size={32} className="text-stone-700 mx-auto mb-2" />
                  <p className="text-xs font-bold text-stone-800">Dispatch Registered</p>
                  <p className="text-[11px] text-stone-600 mt-1">Our administrative officers will review and correspond promptly.</p>
                  <button onClick={() => setInquirySent(false)} className="mt-3 text-[11px] font-bold underline text-stone-700">Submit New Inquiry</button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Email *</label>
                      <input
                        required
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Dispatch Content *</label>
                    <textarea
                      required
                      rows={3}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="w-full py-2.5 bg-stone-900 text-white font-bold uppercase tracking-wider rounded hover:bg-stone-800 transition-colors"
                  >
                    {inquirySubmitting ? 'Transmitting...' : 'Transmit Inquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Traditional Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 px-4 border-t-4 border-stone-700 text-xs font-sans text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="text-sm font-serif font-black uppercase text-stone-200 block tracking-widest">{branding.name}</span>
          <p className="text-[11px] text-stone-400">{branding.motto}</p>
          <div className="pt-4 border-t border-stone-800 text-[11px] text-stone-500">
            {content?.footer?.copyright || `© ${new Date().getFullYear()} ${branding.name}. Classical Academic Charter.`}
          </div>
        </div>
      </footer>
    </div>
  );
}
