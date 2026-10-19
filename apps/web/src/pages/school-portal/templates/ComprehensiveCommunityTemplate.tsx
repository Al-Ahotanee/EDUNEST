import React, { useState } from 'react';
import {
  Bell, Users, UserCheck, Calendar, BookOpen, HeartHandshake,
  ArrowRight, ChevronDown, CheckCircle2, Send, CheckCircle,
  MapPin, Phone, Mail, Award, Clock
} from 'lucide-react';

interface TemplateProps {
  data: any;
  onApplyClick: () => void;
  onPortalClick: () => void;
  onSubmitInquiry: (form: any) => Promise<any>;
}

export default function ComprehensiveCommunityTemplate({
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
  const news = content?.news || [];
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Community Announcement Header */}
      <div className="bg-emerald-800 text-emerald-50 text-xs py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Bell size={14} className="text-emerald-300" />
            <span>Community Notice: Next Academic Term Resumption Date & Orientation Details Available Online.</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <button onClick={onPortalClick} className="hover:underline">Parent Portal</button>
            <span>•</span>
            <button onClick={onPortalClick} className="hover:underline">Staff Desk</button>
          </div>
        </div>
      </div>

      {/* Main Navbar with Multi-Audience Gateway */}
      <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-12 w-12 object-contain rounded-xl shadow-sm" />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow"
                style={{ backgroundColor: 'var(--color-primary, #065f46)' }}
              >
                {branding.name?.[0] || 'C'}
              </div>
            )}
            <div>
              <span className="font-extrabold text-lg text-slate-900 block leading-tight">{branding.name}</span>
              <span className="text-xs text-slate-500 font-medium block">{branding.motto || 'A Community of Lifelong Learners'}</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#about" className="hover:text-emerald-700 transition-colors">Our Community</a>
            <a href="#programs" className="hover:text-emerald-700 transition-colors">Academics</a>
            <a href="#roadmap" className="hover:text-emerald-700 transition-colors">Admission Steps</a>
            <a href="#events" className="hover:text-emerald-700 transition-colors">News & Events</a>
            <a href="#faq" className="hover:text-emerald-700 transition-colors">Parent FAQ</a>
            <a href="#contact" className="hover:text-emerald-700 transition-colors">Help Desk</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onApplyClick}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all"
              style={{ backgroundColor: 'var(--color-primary, #065f46)' }}
            >
              Online Admissions
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner with Community Welcome */}
      {enabled.hero !== false && (
        <section className="relative bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white py-20 px-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${hero.bgImage || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1800&q=80'})` }}
          />

          <div className="relative max-w-7xl mx-auto px-4 grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-400/30">
                {hero.badgeText || 'Welcome to our Family'}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                {hero.headline}
              </h1>
              <p className="text-lg text-emerald-100 font-normal leading-relaxed max-w-2xl">
                {hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={onApplyClick}
                  className="px-7 py-3.5 rounded-xl text-white font-extrabold text-sm shadow-xl transition-all hover:scale-105"
                  style={{ backgroundColor: 'var(--color-primary, #059669)' }}
                >
                  Start Admission Application
                </button>
                <a
                  href="#roadmap"
                  className="px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all"
                >
                  How to Enroll
                </a>
              </div>
            </div>

            {/* Quick Links Hub */}
            <div className="lg:col-span-4 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 space-y-4">
              <h3 className="font-bold text-sm text-emerald-200 uppercase tracking-wider">Quick Community Portals</h3>
              <div className="space-y-3">
                <div onClick={onPortalClick} className="p-4 bg-white/95 text-slate-900 rounded-2xl cursor-pointer hover:shadow-lg transition-all flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Parents & Guardians</h4>
                    <p className="text-xs text-slate-500">View terminal reports & fees</p>
                  </div>
                  <UserCheck className="text-emerald-700" size={20} />
                </div>
                <div onClick={onApplyClick} className="p-4 bg-white/95 text-slate-900 rounded-2xl cursor-pointer hover:shadow-lg transition-all flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Prospective Families</h4>
                    <p className="text-xs text-slate-500">Online admission register</p>
                  </div>
                  <HeartHandshake className="text-emerald-700" size={20} />
                </div>
                <div onClick={onPortalClick} className="p-4 bg-white/95 text-slate-900 rounded-2xl cursor-pointer hover:shadow-lg transition-all flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Faculty & Staff</h4>
                    <p className="text-xs text-slate-500">Teacher gradebook & timetable</p>
                  </div>
                  <BookOpen className="text-emerald-700" size={20} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Community Stats */}
      {enabled.stats !== false && stats.length > 0 && (
        <section className="bg-white border-b border-slate-200 py-10 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((st: any, i: number) => (
              <div key={i} className="border-r last:border-r-0 border-slate-100 px-4">
                <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 block" style={{ color: 'var(--color-primary, #065f46)' }}>
                  {st.value}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 block">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step-by-Step Admission Roadmap */}
      <section id="roadmap" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-700 block mb-2">Enrollment Guide</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">4 Simple Steps to Join Our School</h2>
          <p className="text-sm text-slate-500 mt-2">Transparent, supportive admissions process designed to welcome every family smoothly.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Submit Online Application', desc: 'Complete our easy 5-step online form and receive your unique Application Number instantly.' },
            { step: '02', title: 'Screening & Entrance Exam', desc: 'Prospective students attend a welcoming evaluation session or age-appropriate screening test.' },
            { step: '03', title: 'Parent Consultation', desc: 'Meet our academic leadership to align on learning goals, pastoral care, and co-curricular programs.' },
            { step: '04', title: 'Official Offer & Enrollment', desc: 'Receive your formal Admission Letter, settle tuition fees securely, and begin orientation.' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative">
              <span className="text-3xl font-black text-emerald-700/20 block mb-2">{item.step}</span>
              <h3 className="font-extrabold text-slate-900 text-base mb-2">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onApplyClick}
            className="px-8 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-lg hover:scale-105 transition-all"
            style={{ backgroundColor: 'var(--color-primary, #065f46)' }}
          >
            Start Step 1: Submit Application
          </button>
        </div>
      </section>

      {/* News & Upcoming Events Calendar */}
      {(news.length > 0 || events.length > 0) && (
        <section id="events" className="py-20 bg-slate-100 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-12 gap-12">
              {/* News Feed */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 block">Community Updates</span>
                    <h3 className="text-2xl font-black text-slate-900">Latest School News</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {news.map((item: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                            {item.category || 'News'}
                          </span>
                          <span className="text-xs text-slate-400">{item.date}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-base mb-2">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events Calendar */}
              <div className="lg:col-span-5 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 block">Dates to Remember</span>
                  <h3 className="text-2xl font-black text-slate-900">Upcoming Events</h3>
                </div>
                <div className="space-y-4">
                  {events.map((ev: any, i: number) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-center min-w-[60px]">
                        <Calendar size={18} className="mx-auto mb-1 text-emerald-600" />
                        <span className="text-[11px] font-bold block">{ev.date?.split(' ')[0]}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{ev.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={12} /> {ev.time} • {ev.location}</p>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Community FAQ */}
      {enabled.faq !== false && faq.length > 0 && (
        <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700 block mb-2">Parent Helpdesk</span>
            <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Inquiries</h2>
          </div>

          <div className="space-y-3">
            {faq.map((item: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-slate-900 text-sm hover:text-emerald-700 transition-colors"
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
        </section>
      )}

      {/* Contact & Inquiries */}
      {enabled.contact !== false && (
        <section id="contact" className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700 block">We Are Here For You</span>
              <h2 className="text-3xl font-extrabold text-slate-900">Community Help & Inquiries Desk</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect with our front office, admissions counselors, or head of school for any inquiries or campus visits.
              </p>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <p className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"><MapPin size={18} className="text-emerald-700" /> {contact.address || branding.address}</p>
                <p className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"><Phone size={18} className="text-emerald-700" /> {contact.phone || branding.phone}</p>
                <p className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"><Mail size={18} className="text-emerald-700" /> {contact.email || branding.email}</p>
              </div>
            </div>

            {/* Inquiries Box */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-extrabold text-slate-900 text-lg mb-4">Send a Community Inquiry</h3>
              {inquirySent ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle size={36} className="text-emerald-700 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">Inquiry Dispatched!</h4>
                  <p className="text-xs text-emerald-700">Our administrative desk will reply to your email promptly.</p>
                  <button onClick={() => setInquirySent(false)} className="mt-3 text-xs font-bold underline text-emerald-800">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                    <input
                      required
                      type="text"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email *</label>
                      <input
                        required
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Message *</label>
                    <textarea
                      required
                      rows={3}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="w-full py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all"
                    style={{ backgroundColor: 'var(--color-primary, #065f46)' }}
                  >
                    {inquirySubmitting ? 'Transmitting...' : 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Community Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 text-center text-xs">
        <p className="font-bold text-white mb-1">{branding.name}</p>
        <p className="text-slate-500">{content?.footer?.copyright || `© ${new Date().getFullYear()} ${branding.name}. Building character, community, and scholarship.`}</p>
      </footer>
    </div>
  );
}
