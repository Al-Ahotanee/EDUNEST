import React, { useState } from 'react';
import {
  Sparkles, Zap, Flame, Camera, Calendar, ArrowRight,
  Send, CheckCircle, MapPin, Phone, Mail, Trophy, Star
} from 'lucide-react';

interface TemplateProps {
  data: any;
  onApplyClick: () => void;
  onPortalClick: () => void;
  onSubmitInquiry: (form: any) => Promise<any>;
}

export default function VibrantCampusTemplate({
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
  const studentLife = content?.studentLife || { clubs: [], sports: [] };
  const events = content?.events || [];
  const gallery = content?.gallery || [];
  const testimonials = content?.testimonials || [];
  const contact = content?.contact || {};

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  const categories = ['All', ...Array.from(new Set(gallery.map((g: any) => g.category || 'Campus')))];
  const filteredGallery = activeCategory === 'All' ? gallery : gallery.filter((g: any) => g.category === activeCategory);

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
    <div className="min-h-screen bg-slate-900 font-sans text-white selection:bg-amber-400 selection:text-slate-950">
      {/* Live Events / News Ticker */}
      {events.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-slate-950 text-xs font-black py-2 px-4 shadow-lg flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Zap size={14} className="fill-slate-950" /> Next Event: {events[0].title} — {events[0].date}
            </span>
            <button onClick={onApplyClick} className="underline uppercase tracking-wider text-[11px] font-black">
              Register Now →
            </button>
          </div>
        </div>
      )}

      {/* Modern High-Impact Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-amber-400/50" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center font-black text-2xl text-slate-950 shadow-lg">
                {branding.name?.[0] || 'V'}
              </div>
            )}
            <div>
              <span className="font-black text-lg text-white block tracking-tight">{branding.name}</span>
              <span className="text-xs text-amber-400 font-semibold">{branding.motto || 'Discover Your Potential'}</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-300">
            <a href="#about" className="hover:text-amber-400 transition-colors">Our Spirit</a>
            <a href="#programs" className="hover:text-amber-400 transition-colors">Academics</a>
            <a href="#student-life" className="hover:text-amber-400 transition-colors">Student Life</a>
            <a href="#gallery" className="hover:text-amber-400 transition-colors">Gallery</a>
            <a href="#contact" className="hover:text-amber-400 transition-colors">Join Us</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onPortalClick}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
            >
              Portal Login
            </button>
            <button
              onClick={onApplyClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              Apply Online
            </button>
          </div>
        </div>
      </header>

      {/* Vibrant Hero with Angled Visual Divider */}
      {enabled.hero !== false && (
        <section className="relative pt-20 pb-36 px-4 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
            style={{ backgroundImage: `url(${hero.bgImage || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=80'})` }}
          />

          <div className="relative max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400/20 to-rose-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/30">
              <Flame size={16} className="text-amber-400" /> {hero.badgeText || 'Vibrant Learning Community'}
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none text-white">
              {hero.headline}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
              {hero.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button
                onClick={onApplyClick}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-2xl hover:scale-105 transition-all"
              >
                Join Our Academy Now
              </button>
              <a
                href="#student-life"
                className="px-8 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all"
              >
                Explore Student Life
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Colored Stat Counters */}
      {enabled.stats !== false && stats.length > 0 && (
        <section className="relative z-10 -mt-16 max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((st: any, i: number) => (
              <div key={i} className="p-6 rounded-3xl bg-slate-800/90 backdrop-blur-md border border-slate-700/80 text-center shadow-xl">
                <span className="text-4xl font-black bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent block">
                  {st.value}
                </span>
                <span className="text-xs uppercase font-extrabold text-slate-400 mt-1 block tracking-wider">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Student Life & Clubs Grid */}
      <section id="student-life" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-amber-400 block mb-2">Life Beyond The Classroom</span>
          <h2 className="text-3xl sm:text-4xl font-black">Clubs, Athletics & Creative Innovation</h2>
          <p className="text-xs text-slate-400 mt-2">Every student finds their passion through our dynamic ecosystem of sports teams, arts, and technology clubs.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Clubs Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border border-slate-700/60 shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-amber-400">
              <Sparkles size={24} />
              <h3 className="font-black text-xl text-white">Innovation & Discovery Societies</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(studentLife.clubs?.length ? studentLife.clubs : ['Robotics Club', 'Media & Press', 'Junior Engineers', 'Debating Society', 'Chess Masters', 'Music Ensemble']).map((club: string, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Star size={14} className="text-amber-400 flex-shrink-0" /> {club}
                </div>
              ))}
            </div>
          </div>

          {/* Sports Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border border-slate-700/60 shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-rose-400">
              <Trophy size={24} />
              <h3 className="font-black text-xl text-white">Athletics & Competitive Sports</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(studentLife.sports?.length ? studentLife.sports : ['Football League', 'Basketball Squad', 'Swimming Team', 'Track & Field', 'Volleyball', 'Table Tennis']).map((sport: string, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Zap size={14} className="text-rose-400 flex-shrink-0" /> {sport}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery Showcase */}
      {enabled.gallery !== false && gallery.length > 0 && (
        <section id="gallery" className="py-24 bg-slate-950 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 block mb-1">Campus Life In Action</span>
                <h2 className="text-3xl font-black">Photo & Moments Gallery</h2>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeCategory === cat ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredGallery.map((item: any, i: number) => (
                <div key={i} className="group relative h-64 rounded-2xl overflow-hidden shadow-lg border border-slate-800 bg-slate-900">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">{item.category}</span>
                    <h4 className="text-sm font-bold text-white leading-tight">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive Contact & Inquiries */}
      {enabled.contact !== false && (
        <section id="contact" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400 block">Connect With Us</span>
              <h2 className="text-3xl sm:text-5xl font-black leading-tight">Begin Your Scholar's Journey Today</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Experience our campus culture firsthand. Schedule a guided tour or reach out to our dynamic admissions counselors.
              </p>

              <div className="space-y-3 pt-4 text-xs font-bold text-slate-300">
                <p className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60"><MapPin className="text-amber-400" /> {contact.address || branding.address}</p>
                <p className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60"><Phone className="text-rose-400" /> {contact.phone || branding.phone}</p>
                <p className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60"><Mail className="text-indigo-400" /> {contact.email || branding.email}</p>
              </div>
            </div>

            {/* Inquiries Box */}
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
              <h3 className="font-black text-xl text-white mb-4">Send a Message</h3>
              {inquirySent ? (
                <div className="p-6 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-center space-y-2">
                  <CheckCircle size={36} className="text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm">Message Sent!</h4>
                  <p className="text-xs text-emerald-200">Thanks for connecting. We'll be in touch soon.</p>
                  <button onClick={() => setInquirySent(false)} className="mt-3 text-xs font-bold underline text-amber-400">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Name</label>
                    <input
                      required
                      type="text"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Email</label>
                      <input
                        required
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Message</label>
                    <textarea
                      required
                      rows={3}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black uppercase tracking-wider text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    {inquirySubmitting ? 'Submitting...' : 'Send Inquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-400 mb-2">{branding.name}</p>
        <p>{content?.footer?.copyright || `© ${new Date().getFullYear()} ${branding.name}. Empowering the Next Generation.`}</p>
      </footer>
    </div>
  );
}
