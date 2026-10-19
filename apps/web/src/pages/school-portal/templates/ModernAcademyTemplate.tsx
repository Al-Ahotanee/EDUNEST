import React, { useState } from 'react';
import {
  Award, Users, GraduationCap, CheckCircle2, ArrowRight,
  BookOpen, Sparkles, MapPin, Phone, Mail, Clock, ChevronDown,
  Calendar, Send, CheckCircle, ShieldCheck
} from 'lucide-react';

interface TemplateProps {
  data: any;
  onApplyClick: () => void;
  onPortalClick: () => void;
  onSubmitInquiry: (form: any) => Promise<any>;
}

export default function ModernAcademyTemplate({
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
  const news = content?.news || [];
  const events = content?.events || [];
  const gallery = content?.gallery || [];
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
      // error handled by parent toast
    } finally {
      setInquirySubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Announcement Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-blue-400" /> {contact.address || branding.address}</span>
            <span className="hidden md:flex items-center gap-1.5"><Phone size={13} className="text-blue-400" /> {contact.phone || branding.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onPortalClick} className="hover:text-white font-medium transition-colors">Staff & Student Portal</button>
            <span className="text-slate-600">|</span>
            <button onClick={onApplyClick} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Admissions Portal</button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-12 w-12 object-contain rounded-xl shadow-sm" />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md"
                style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
              >
                {branding.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <span className="font-extrabold text-lg text-slate-900 block leading-tight tracking-tight">{branding.name}</span>
              {branding.motto && <span className="text-xs text-slate-500 font-medium block truncate max-w-xs sm:max-w-md">{branding.motto}</span>}
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
            <a href="#programs" className="hover:text-blue-600 transition-colors">Academics</a>
            <a href="#facilities" className="hover:text-blue-600 transition-colors">Campus</a>
            <a href="#faculty" className="hover:text-blue-600 transition-colors">Faculty</a>
            <a href="#events" className="hover:text-blue-600 transition-colors">Events</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Admissions FAQ</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onApplyClick}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition-transform active:scale-95 hover:brightness-105 flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
            >
              Apply Online <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {enabled.hero !== false && (
        <section className="relative min-h-[620px] flex items-center bg-slate-900 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${hero.bgImage || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1800&q=80'})` }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent"
            style={{ opacity: hero.overlayOpacity || 0.7 }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 text-white">
            <div className="max-w-2xl space-y-6">
              {hero.badgeText && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-blue-300 text-xs font-bold tracking-wide uppercase border border-white/15">
                  <Sparkles size={14} /> {hero.badgeText}
                </div>
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                {hero.headline}
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed font-normal">
                {hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={onApplyClick}
                  className="px-7 py-3.5 rounded-xl text-white font-bold text-base shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                  style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
                >
                  {hero.ctaPrimaryText || 'Apply for Admission'} <ArrowRight size={18} />
                </button>
                <a
                  href={hero.ctaSecondaryLink || '#about'}
                  className="px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-base border border-white/20 transition-all"
                >
                  {hero.ctaSecondaryText || 'Discover Campus'}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Floating Quick Stats */}
      {enabled.stats !== false && stats.length > 0 && (
        <section className="relative z-10 -mt-12 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            {stats.map((st: any, i: number) => (
              <div key={i} className="text-center p-3 border-r last:border-r-0 border-slate-100">
                <span className="text-3xl lg:text-4xl font-black block text-slate-900" style={{ color: 'var(--color-primary, #1a56db)' }}>
                  {st.value}
                </span>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-1 block">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About & Principal's Welcome */}
      {enabled.about !== false && (
        <section id="about" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 block">Who We Are</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                {about.title || 'A Heritage of Educational Leadership'}
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                {about.history}
              </p>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60">
                  <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5"><ShieldCheck size={16} className="text-blue-600" /> Our Mission</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{about.mission}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/60">
                  <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5"><Sparkles size={16} className="text-blue-600" /> Our Vision</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{about.vision}</p>
                </div>
              </div>
              {about.values && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Our Core Values</h4>
                  <div className="flex flex-wrap gap-2">
                    {about.values.map((v: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                        ✓ {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Principal's Corner Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
                <img
                  src={about.principalPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                  alt={about.principalName}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md ring-4 ring-slate-100"
                />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">{about.principalName}</h3>
                  <p className="text-xs font-bold text-blue-600">{about.principalTitle}</p>
                </div>
              </div>
              <blockquote className="text-slate-600 text-sm italic leading-relaxed pt-6">
                "{about.principalMessage}"
              </blockquote>
            </div>
          </div>
        </section>
      )}

      {/* Academic Programs */}
      {enabled.programs !== false && programs.length > 0 && (
        <section id="programs" className="py-20 bg-slate-100/60 border-y border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 block mb-2">Curriculum Pathways</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Academic Excellence at Every Stage</h2>
              <p className="text-sm text-slate-500 mt-2">Comprehensive curriculum pathways calibrated to prepare scholars for international and national excellence.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {programs.map((prog: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md inline-block mb-3">
                      {prog.ageRange}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg mb-2">{prog.name}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{prog.description}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Subjects</h4>
                    <ul className="space-y-1">
                      {prog.subjects?.slice(0, 4).map((sub: string, sIdx: number) => (
                        <li key={sIdx} className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-blue-500" /> {sub}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Campus Facilities Showcase */}
      {enabled.facilities !== false && facilities.length > 0 && (
        <section id="facilities" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 block mb-2">World-Class Infrastructure</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Designed for Discovery & Growth</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {facilities.map((fac: any, i: number) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100 group">
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={fac.image}
                    alt={fac.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {fac.badge && (
                    <span className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
                      {fac.badge}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{fac.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{fac.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Faculty Showcase */}
      {enabled.faculty !== false && faculty.length > 0 && (
        <section id="faculty" className="py-20 bg-slate-100/50 border-t border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 block mb-2">Passionate Educators</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Meet Our Dedicated Leadership</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {faculty.map((member: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-24 h-24 mx-auto rounded-full object-cover shadow-md mb-4 ring-4 ring-slate-100"
                  />
                  <h3 className="font-extrabold text-slate-900 text-base">{member.name}</h3>
                  <p className="text-xs font-semibold text-blue-600 mb-1">{member.title}</p>
                  <p className="text-xs text-slate-400 mb-3">{member.department}</p>
                  <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {member.qualification}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {enabled.testimonials !== false && testimonials.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 block mb-2">Voices of our Community</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">What Parents & Alumni Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                <blockquote className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                  "{t.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admissions FAQ Accordion */}
      {enabled.faq !== false && faq.length > 0 && (
        <section id="faq" className="py-20 bg-slate-100/60 border-t border-slate-200/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 block mb-2">Help Center</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              {faq.map((item: any, i: number) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors"
                  >
                    <span>{item.question}</span>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${activeFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {activeFaq === i && (
                    <div className="px-6 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact & Inquiries Section */}
      {enabled.contact !== false && (
        <section id="contact" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 block">Get In Touch</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">We Would Love to Hear From You</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Whether you have questions regarding admissions, tuition fees, campus visits, or academic programs, our admissions team is ready to assist.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><MapPin size={20} /></div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Campus Address</h4>
                    <p className="text-xs text-slate-600">{contact.address || branding.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Phone size={20} /></div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Telephone Lines</h4>
                    <p className="text-xs text-slate-600">{contact.phone || branding.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Mail size={20} /></div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Admissions Email</h4>
                    <p className="text-xs text-slate-600">{contact.email || branding.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiries Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-xl mb-1">Send an Inquiry</h3>
              <p className="text-xs text-slate-500 mb-6">Fill the form below and an admissions counselor will reach out to you.</p>

              {inquirySent ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle size={36} className="text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">Message Sent Successfully!</h4>
                  <p className="text-xs text-emerald-700">Thank you for contacting us. We will get back to you shortly.</p>
                  <button onClick={() => setInquirySent(false)} className="mt-4 text-xs font-bold text-emerald-800 underline">Send Another Message</button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      required
                      type="text"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="e.g. Mrs. Funke Balogun"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                      <input
                        required
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        placeholder="you@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        placeholder="080 1234 5678"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={inquiryForm.subject}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="e.g. JSS 1 Admissions Criteria"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Message *</label>
                    <textarea
                      required
                      rows={4}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="How can we assist you?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
                  >
                    {inquirySubmitting ? 'Sending Message...' : <><Send size={16} /> Submit Inquiry</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Sticky Quick-Action Bar */}
      <aside aria-label="Quick Admissions Bar" className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 py-3 px-4 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold">Admissions Open for {new Date().getFullYear()}/{new Date().getFullYear() + 1} Academic Session</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onApplyClick}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all hover:scale-105"
              style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
            >
              Start Online Application
            </button>
          </div>
        </div>
      </aside>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-24 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-3">
            <h3 className="font-black text-base text-white">{branding.name}</h3>
            <p className="text-slate-400 leading-relaxed">{branding.motto}</p>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#about" className="hover:text-white transition-colors">About Institution</a></li>
              <li><a href="#programs" className="hover:text-white transition-colors">Academic Programs</a></li>
              <li><a href="#facilities" className="hover:text-white transition-colors">Campus Facilities</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact Directory</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Admissions</h4>
            <ul className="space-y-2">
              <li><button onClick={onApplyClick} className="hover:text-white transition-colors text-left">Apply Online</button></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Admissions FAQ</a></li>
              <li><button onClick={onPortalClick} className="hover:text-white transition-colors text-left">Parent Portal Login</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Accreditation</h4>
            <p className="text-slate-500 leading-relaxed">
              Approved and licensed by the Federal Ministry of Education and State Universal Basic Education Board (SUBEB).
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-slate-900 text-center text-slate-600">
          {content?.footer?.copyright || `© ${new Date().getFullYear()} ${branding.name}. All Rights Reserved.`}
        </div>
      </footer>
    </div>
  );
}
