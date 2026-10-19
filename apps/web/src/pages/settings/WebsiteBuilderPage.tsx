import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Layout, Eye, Smartphone, Tablet, Monitor, Save, Globe,
  CheckCircle, ArrowUp, ArrowDown, ToggleLeft, ToggleRight,
  Sparkles, Layers, MessageSquare, ExternalLink, RefreshCw,
  Building, BookOpen, Shield, HelpCircle, PhoneCall
} from 'lucide-react';
import toast from 'react-hot-toast';

const TEMPLATES = [
  {
    id: 'MODERN_ACADEMY',
    name: 'Modern Academy',
    badge: 'Popular',
    desc: 'Bold hero photography, translucent stat counters, program grid, and sticky quick-action admissions bar.',
    previewBg: 'from-blue-600 to-indigo-900',
  },
  {
    id: 'CLASSIC_HERITAGE',
    name: 'Classic Heritage',
    badge: 'Traditional',
    desc: 'Traditional academic crest layout, serif typography, split-pane history, and headmaster letterhead.',
    previewBg: 'from-stone-800 to-amber-950',
  },
  {
    id: 'VIBRANT_CAMPUS',
    name: 'Vibrant Campus',
    badge: 'High Energy',
    desc: 'Dynamic section dividers, photo gallery filter tabs, student life showcase, and live events ticker.',
    previewBg: 'from-amber-500 via-rose-500 to-indigo-900',
  },
  {
    id: 'MINIMAL_EXCELLENCE',
    name: 'Minimal Excellence',
    badge: 'Clean & Modern',
    desc: 'Spacious typography, high-contrast monochrome with single color accent, and tabular curriculum streams.',
    previewBg: 'from-neutral-900 to-neutral-800',
  },
  {
    id: 'COMPREHENSIVE_COMMUNITY',
    name: 'Comprehensive Community',
    badge: 'Portal Hub',
    desc: 'Portal-style layout with live announcement banner, quick-links hub, 4-step admission roadmap, and calendar.',
    previewBg: 'from-emerald-900 to-teal-950',
  },
];

export default function WebsiteBuilderPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const schoolId = user?.schoolId || user?.tenantId;
  const schoolSlug = user?.tenant?.slug;

  const [activeTab, setActiveTab] = useState<'template' | 'sections' | 'content' | 'inquiries'>('template');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedTemplate, setSelectedTemplate] = useState('MODERN_ACADEMY');
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({
    hero: true,
    stats: true,
    about: true,
    programs: true,
    facilities: true,
    studentLife: true,
    faculty: true,
    news: true,
    events: true,
    gallery: true,
    testimonials: true,
    faq: true,
    contact: true,
  });
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'hero', 'stats', 'about', 'programs', 'facilities', 'studentLife', 'faculty', 'news', 'events', 'gallery', 'testimonials', 'faq', 'contact'
  ]);
  const [heroForm, setHeroForm] = useState({
    headline: '',
    subtitle: '',
    badgeText: '',
    ctaPrimaryText: '',
    bgImage: '',
  });
  const [aboutForm, setAboutForm] = useState({
    title: '',
    history: '',
    mission: '',
    vision: '',
    principalName: '',
    principalTitle: '',
    principalMessage: '',
  });
  const [selectedInquiryStatus, setSelectedInquiryStatus] = useState('ALL');

  // Load website config
  const { data: configData, isLoading: loadingConfig } = useQuery({
    queryKey: ['admin-website-config', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const res = await websiteApi.getAdminWebsiteConfig(schoolId);
      return res.data?.data;
    },
    enabled: !!schoolId,
  });

  // Load inquiries
  const { data: inquiriesData, refetch: refetchInquiries } = useQuery({
    queryKey: ['admin-inquiries', schoolId, selectedInquiryStatus],
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await websiteApi.listInquiries(schoolId, { status: selectedInquiryStatus });
      return res.data?.data || [];
    },
    enabled: !!schoolId && activeTab === 'inquiries',
  });

  useEffect(() => {
    if (configData?.config) {
      const cfg = configData.config;
      setSelectedTemplate(cfg.template || 'MODERN_ACADEMY');
      const content = cfg.draftContent || cfg.publishedContent || {};
      if (content.enabledSections) setEnabledSections(content.enabledSections);
      if (content.sectionOrder) setSectionOrder(content.sectionOrder);
      if (content.hero) setHeroForm({ ...heroForm, ...content.hero });
      if (content.about) setAboutForm({ ...aboutForm, ...content.about });
    }
  }, [configData]);

  // Save / Publish Mutation
  const saveMutation = useMutation({
    mutationFn: async ({ isPublished }: { isPublished: boolean }) => {
      if (!schoolId) throw new Error('Missing school identifier');
      const draftContent = {
        ...(configData?.config?.draftContent || {}),
        enabledSections,
        sectionOrder,
        hero: { ...(configData?.config?.draftContent?.hero || {}), ...heroForm },
        about: { ...(configData?.config?.draftContent?.about || {}), ...aboutForm },
      };
      return websiteApi.updateWebsiteConfig(schoolId, {
        template: selectedTemplate,
        isPublished,
        content: draftContent,
        draftContent,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-website-config'] });
      qc.invalidateQueries({ queryKey: ['school-website'] });
      toast.success(vars.isPublished ? 'Website published live successfully!' : 'Draft saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save website configuration.');
    },
  });

  // Inquiry update mutation
  const updateInquiryMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return websiteApi.updateInquiry(schoolId!, id, { status });
    },
    onSuccess: () => {
      refetchInquiries();
      toast.success('Inquiry status updated');
    },
  });

  const toggleSection = (key: string) => {
    setEnabledSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[idx];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setSectionOrder(newOrder);
  };

  return (
    <div className="space-y-6">
      {/* Header with Publish Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1.5">
              <Globe size={13} /> White-Label Website CMS
            </span>
            {configData?.config?.isPublished && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle size={13} /> Live Published
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">School Website Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">Customize your public landing page, select themes, reorder sections, and manage inquiries.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {schoolSlug && (
            <a
              href={`/school/${schoolSlug}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink size={14} /> View Live Website
            </a>
          )}
          <button
            onClick={() => saveMutation.mutate({ isPublished: false })}
            disabled={saveMutation.isPending}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Save size={14} /> Save Draft
          </button>
          <button
            onClick={() => saveMutation.mutate({ isPublished: true })}
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:brightness-105 active:scale-95 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--color-primary, #2563eb)' }}
          >
            <Globe size={14} /> {saveMutation.isPending ? 'Publishing...' : 'Publish Changes Live'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('template')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'template' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layout size={15} /> 1. Select Template (5 Available)
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'sections' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={15} /> 2. Section Manager & Order
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'content' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles size={15} /> 3. Edit Content & Headings
        </button>
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'inquiries' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare size={15} /> 4. Visitor Inquiries
        </button>
      </div>

      {/* TAB 1: TEMPLATE SWITCHER */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                    isSelected ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className={`h-24 rounded-xl bg-gradient-to-br ${tmpl.previewBg} p-3 flex flex-col justify-between text-white shadow-sm`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full w-max">
                        {tmpl.badge}
                      </span>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{tmpl.name}</span>
                        {isSelected && <CheckCircle size={16} className="text-white" />}
                      </div>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">{tmpl.name}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{tmpl.desc}</p>
                  </div>

                  <button
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ Active Template' : 'Choose Template'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-center justify-between">
            <span>Remember to click <strong>"Publish Changes Live"</strong> in the top bar to apply your selected template to your live school website.</span>
          </div>
        </div>
      )}

      {/* TAB 2: SECTION MANAGER & REORDER */}
      {activeTab === 'sections' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Section Visibility & Ordering</h3>
            <p className="text-xs text-slate-500">Toggle sections on or off, and arrange the visual sequence of your homepage.</p>

            <div className="space-y-2 pt-2">
              {sectionOrder.map((secKey, idx) => {
                const isEnabled = enabledSections[secKey] !== false;
                return (
                  <div key={secKey} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs font-mono font-bold text-slate-400">{idx + 1}</span>
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-800">{secKey}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveSection(idx, 'down')}
                        disabled={idx === sectionOrder.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => toggleSection(secKey)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                          isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Hidden'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6 space-y-4 bg-slate-50/50">
            <h3 className="font-extrabold text-slate-900 text-base">Website Structure Overview</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your homepage currently renders <strong>{Object.values(enabledSections).filter(Boolean).length}</strong> enabled sections. You can preview changes live in the viewport or view the site in a separate window.
            </p>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
              <p className="font-bold text-slate-800">Quick Tips:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Keep the <strong>Hero</strong> and <strong>Curriculum Programs</strong> near the top for maximum prospective parent engagement.</li>
                <li>Make sure the <strong>Contact Desk</strong> and <strong>Admissions FAQ</strong> are enabled so parents can reach out.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTENT & HEADINGS EDITOR */}
      {activeTab === 'content' && (
        <div className="card p-6 space-y-8">
          {/* Hero Form */}
          <div className="space-y-4 pb-6 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" /> Hero Banner Content
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Main Headline</label>
                <input
                  type="text"
                  value={heroForm.headline}
                  onChange={(e) => setHeroForm({ ...heroForm, headline: e.target.value })}
                  className="input"
                  placeholder="e.g. Nurturing Tomorrow's Global Leaders"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Subtitle / Description</label>
                <textarea
                  rows={2}
                  value={heroForm.subtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                  className="input"
                  placeholder="Supporting mission statement"
                />
              </div>
              <div>
                <label className="label">Announcement Badge Text</label>
                <input
                  type="text"
                  value={heroForm.badgeText}
                  onChange={(e) => setHeroForm({ ...heroForm, badgeText: e.target.value })}
                  className="input"
                  placeholder="e.g. Now Enrolling for 2026/2027 Session"
                />
              </div>
              <div>
                <label className="label">Hero Background Image URL</label>
                <input
                  type="text"
                  value={heroForm.bgImage}
                  onChange={(e) => setHeroForm({ ...heroForm, bgImage: e.target.value })}
                  className="input"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>

          {/* About & Leadership */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Building size={18} className="text-blue-600" /> About & Head of School Welcome
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Section Title</label>
                <input
                  type="text"
                  value={aboutForm.title}
                  onChange={(e) => setAboutForm({ ...aboutForm, title: e.target.value })}
                  className="input"
                  placeholder="e.g. A Heritage of Scholastic Excellence"
                />
              </div>
              <div>
                <label className="label">Principal / Head of School Name</label>
                <input
                  type="text"
                  value={aboutForm.principalName}
                  onChange={(e) => setAboutForm({ ...aboutForm, principalName: e.target.value })}
                  className="input"
                  placeholder="e.g. Dr. (Mrs.) Adebayo Adesina"
                />
              </div>
              <div>
                <label className="label">Principal Official Title</label>
                <input
                  type="text"
                  value={aboutForm.principalTitle}
                  onChange={(e) => setAboutForm({ ...aboutForm, principalTitle: e.target.value })}
                  className="input"
                  placeholder="e.g. Head of Institution & Principal"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Principal's Welcome Note</label>
                <textarea
                  rows={3}
                  value={aboutForm.principalMessage}
                  onChange={(e) => setAboutForm({ ...aboutForm, principalMessage: e.target.value })}
                  className="input"
                  placeholder="Personal welcome message to parents and scholars"
                />
              </div>
              <div>
                <label className="label">Institutional Mission</label>
                <textarea
                  rows={2}
                  value={aboutForm.mission}
                  onChange={(e) => setAboutForm({ ...aboutForm, mission: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Institutional Vision</label>
                <textarea
                  rows={2}
                  value={aboutForm.vision}
                  onChange={(e) => setAboutForm({ ...aboutForm, vision: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VISITOR INQUIRIES */}
      {activeTab === 'inquiries' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Public Website Inquiries</h3>
              <p className="text-xs text-slate-500">Messages and contact requests submitted through your school website.</p>
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'NEW', 'CONTACTED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedInquiryStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedInquiryStatus === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {inquiriesData?.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No inquiries found for this status.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inquiriesData?.map((inq: any) => (
                <div key={inq.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{inq.name}</span>
                      <span className="text-xs text-slate-400 ml-2">({inq.email} {inq.phone ? `• ${inq.phone}` : ''})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inq.status === 'NEW' ? 'bg-blue-50 text-blue-700' :
                        inq.status === 'CONTACTED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {inq.status}
                      </span>
                      <select
                        value={inq.status}
                        onChange={(e) => updateInquiryMutation.mutate({ id: inq.id, status: e.target.value })}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white font-medium"
                      >
                        <option value="NEW">Mark NEW</option>
                        <option value="CONTACTED">Mark CONTACTED</option>
                        <option value="CLOSED">Mark CLOSED</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Subject: {inq.subject || 'General Inquiry'}</p>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">{inq.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
