import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Megaphone, Send, ShieldCheck, AlertCircle, Building2, 
  Layers, BellRing, CheckCircle2, Eye, FileText
} from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function SABroadcastPage() {
  const [form, setForm] = useState({ title: '', message: '', plan: '' });
  const [isUrgent, setIsUrgent] = useState(false);

  const sendMut = useMutation({
    mutationFn: (d: any) => api.post('/super-admin/broadcast', d),
    onSuccess: (res) => {
      toast.success(`Official directive dispatched to ${res.data.data.sent} institutional administrators!`);
      setForm({ title: '', message: '', plan: '' });
      setIsUrgent(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to dispatch broadcast'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { 
      toast.error('Title and message body are mandatory fields'); 
      return; 
    }
    sendMut.mutate(form);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Institutional Banner Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              <Megaphone size={13} /> Central Dispatch
            </span>
            <span className="text-xs text-slate-500 font-medium">
              National Institutional Directive & Circular Transmission
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Circulars & Network Broadcasts
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Dispatch regulatory directives, maintenance advisories, and policy announcements across tenant institutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            In-App Notification Dispatch
          </span>
        </div>
      </div>

      {/* Main Grid: Form on Left, Live Memo Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formal Circular Dispatch Form */}
        <form 
          onSubmit={handleSubmit} 
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
        >
          {/* SECTION 1: TARGETING & AUDIENCE */}
          <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-blue-600" /> SECTION 1: TARGET RECIPIENT AUDIENCE
            </legend>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Target Institutional Licensing Tier <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                value={form.plan} 
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              >
                <option value="">All Accredited Schools (Universal Platform Broadcast)</option>
                <option value="BASIC">Basic Licensing Tier Only</option>
                <option value="STANDARD">Standard Licensing Tier Only</option>
                <option value="PREMIUM">Premium Licensing Tier Only</option>
                <option value="ENTERPRISE">Enterprise Licensing Tier Only</option>
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                Notifications will appear instantaneously in the dashboard topbar for matching school administrators.
              </span>
            </div>
          </fieldset>

          {/* SECTION 2: DIRECTIVE CONTENT */}
          <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
            <legend className="px-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-600" /> SECTION 2: CIRCULAR MEMORANDUM SPECIFICATION
            </legend>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Official Circular Title / Subject <span className="text-rose-500">*</span>
              </label>
              <input
                required 
                type="text"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                placeholder="e.g. Mandatory End-of-Term Examination Archive Notice"
                value={form.title} 
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Official Directive Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                required 
                rows={5}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none font-medium leading-relaxed"
                placeholder="Detail the statutory advisory, scheduled server window, or platform policy directive..."
                value={form.message} 
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </div>
          </fieldset>

          {/* Statutory Advisory Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Statutory Authority Confirmation</p>
              <p className="text-blue-700 mt-0.5">
                This notice will be transmitted with the verified cryptographic watermark of the Platform SuperAdministrator.
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={sendMut.isPending}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              <Send size={15} /> 
              {sendMut.isPending ? 'Transmitting Directive...' : 'Transmit Official Directive'}
            </button>
          </div>
        </form>

        {/* Live Circular Preview Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <Eye size={15} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipient In-App Preview
              </h3>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  PLATFORM DIRECTIVE
                </span>
                <span className="text-slate-400 font-medium">Just now</span>
              </div>

              <h4 className="text-sm font-bold text-slate-900">
                {form.title.trim() || 'Notice Subject Placeholder'}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {form.message.trim() || 'Official announcement and directives will be displayed here as formatted above.'}
              </p>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>Audience: {form.plan || 'All Schools'}</span>
                <span>Signed: SuperAdmin</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-900">Delivery Channels</p>
            <p>1. Institutional Topbar Notification Drawer</p>
            <p>2. Audit Event Log in Tenant Database</p>
            <p>3. Direct Admin Broadcast Banner</p>
          </div>
        </div>
      </div>
    </div>
  );
}
