import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Phone, Mail, MapPin, Award, BookOpen, Shield, Heart, Users, ChevronRight, GraduationCap } from 'lucide-react';

export default function SchoolLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: school, isLoading, isError } = useQuery({
    queryKey: ['school-public', slug],
    queryFn: () => api.get(`/saas/school/${slug}`).then(r => r.data.data),
  });

  useEffect(() => {
    if (!school) return;
    const root = document.documentElement;
    root.style.setProperty('--school-primary', school.primaryColor || '#1a56db');
    root.style.setProperty('--school-secondary', school.secondaryColor || '#7e3af2');
    return () => { root.style.removeProperty('--school-primary'); root.style.removeProperty('--school-secondary'); };
  }, [school]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading school portal...</p>
      </div>
    </div>
  );

  if (isError || !school) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <GraduationCap size={64} className="mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-700 mb-2">School Not Found</h1>
        <p className="text-gray-500">The school portal you are looking for does not exist.</p>
      </div>
    </div>
  );

  const primary = school.primaryColor || '#1a56db';
  const secondary = school.secondaryColor || '#7e3af2';

  const features = [
    { icon: Award, title: 'Academic Excellence', desc: 'Committed to the highest academic standards and quality education.' },
    { icon: Users, title: 'Qualified Teachers', desc: 'Experienced, certified educators dedicated to student success.' },
    { icon: Shield, title: 'Safe Environment', desc: 'A secure, nurturing environment where every child thrives.' },
    { icon: Heart, title: 'Holistic Development', desc: 'Sports, arts, and co-curriculars for all-round development.' },
  ];

  return (
    <div className="font-sans text-gray-800">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                {school.name[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight">{school.name}</p>
              {school.motto && <p className="text-xs text-gray-500 italic truncate max-w-48">"{school.motto}"</p>}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#home" className="hover:text-blue-600 transition-colors">Home</a>
            <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
            <a href="#admissions" className="hover:text-blue-600 transition-colors">Admissions</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
          <button
            onClick={() => navigate(`/school/${slug}/apply`)}
            className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            Apply Now <ChevronRight size={16} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="relative pt-16 min-h-screen flex items-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${secondary}10 100%)` }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: primary }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-10" style={{ background: secondary }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          {school.logo && (
            <img src={school.logo} alt={school.name} className="w-24 h-24 object-contain rounded-2xl mx-auto mb-6 shadow-xl border-4 border-white" />
          )}
          <div className="inline-flex items-center gap-2 bg-white/80 border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-600 mb-6 shadow-sm">
            <Award size={14} style={{ color: primary }} />
            {school.type?.replace('_', ' ')} School{school.yearEstablished ? ` · Est. ${school.yearEstablished}` : ''}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-4">
            Welcome to<br />
            <span style={{ color: primary }}>{school.name}</span>
          </h1>
          {school.motto && (
            <p className="text-xl md:text-2xl text-gray-500 italic mb-8 max-w-2xl mx-auto">"{school.motto}"</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(`/school/${slug}/apply`)}
              className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              Apply for Admission <ChevronRight size={20} />
            </button>
            <a href="#about"
              className="inline-flex items-center gap-2 border-2 font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:-translate-y-0.5 bg-white"
              style={{ borderColor: primary, color: primary }}
            >
              Learn More <BookOpen size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 text-white" style={{ background: primary }}>About Us</div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Our Story & Mission</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              {school.name} is a reputable {school.type?.toLowerCase().replace('_', ' ')} school
              {school.state ? ` located in ${school.city ? school.city + ', ' : ''}${school.state} State` : ''}, dedicated to providing quality education and nurturing future leaders.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { label: 'Year Established', value: school.yearEstablished || 'N/A', icon: Award },
              { label: 'School Type', value: school.type?.replace('_', ' ') || 'N/A', icon: BookOpen },
              { label: 'Classes Offered', value: `${school.classes?.length || 0}+ Classes`, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${primary}20` }}>
                  <Icon size={24} style={{ color: primary }} />
                </div>
                <p className="text-2xl font-black text-gray-900 mb-1">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20" style={{ background: `linear-gradient(135deg, ${primary}08, ${secondary}08)` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 text-white" style={{ background: secondary }}>Why Choose Us</div>
            <h2 className="text-4xl font-black text-gray-900">The {school.name?.split(' ')[0]} Advantage</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                  <Icon size={26} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admission CTA */}
      <section id="admissions" className="py-20 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <GraduationCap size={60} className="mx-auto mb-6 opacity-90" />
          <h2 className="text-4xl font-black mb-4">Enrol Your Child Today</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Give your child the gift of quality education. Apply for admission to {school.name} and set them on the path to excellence.
          </p>
          <button
            onClick={() => navigate(`/school/${slug}/apply`)}
            className="inline-flex items-center gap-3 bg-white font-bold px-10 py-5 rounded-2xl text-xl shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1"
            style={{ color: primary }}
          >
            <BookOpen size={24} /> Start Application <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900">Get In Touch</h2>
            <p className="text-gray-500 mt-2">We'd love to hear from you</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, label: 'Address', value: [school.address, school.city, school.state].filter(Boolean).join(', ') || 'Contact us for address' },
              { icon: Phone, label: 'Phone', value: school.phone || 'Contact us for phone' },
              { icon: Mail, label: 'Email', value: school.email || 'Contact us for email' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${primary}20` }}>
                  <Icon size={22} style={{ color: primary }} />
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-gray-700 font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-8" style={{ background: primary }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-90">
          <p>© {new Date().getFullYear()} {school.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#home" className="hover:opacity-75 transition-opacity">Home</a>
            <a href="#about" className="hover:opacity-75 transition-opacity">About</a>
            <a href="#admissions" className="hover:opacity-75 transition-opacity">Admissions</a>
          </div>
          <p className="opacity-60">Powered by <span className="font-semibold">SchoolERP</span></p>
        </div>
      </footer>
    </div>
  );
}
