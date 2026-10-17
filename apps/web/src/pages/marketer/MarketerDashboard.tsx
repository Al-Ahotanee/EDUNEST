import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, CheckCircle, Clock, Copy, Share2 } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function MarketerDashboard() {
  const marketer = JSON.parse(localStorage.getItem('marketer_data') || '{}');
  const token = localStorage.getItem('marketer_token');

  const { data, isLoading } = useQuery({
    queryKey: ['mkt-dashboard'],
    queryFn: () => api.get('/marketer/dashboard', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data.data),
  });
  const { data: referrals } = useQuery({
    queryKey: ['mkt-referrals'],
    queryFn: () => api.get('/marketer/referrals', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data.data),
  });

  const stats = data?.stats || {};
  const registerLink = `${window.location.origin}/saas/register?ref=${marketer.referralCode}`;

  const copyLink = () => { navigator.clipboard.writeText(registerLink); toast.success('Registration link copied!'); };

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    SUSPENDED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome, {marketer.firstName}! 👋</h2>
        <p className="text-gray-500 text-sm">Here's how your referrals are performing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Referrals" value={stats.totalReferrals || 0} sub="All time" icon={Users} color="bg-blue-500" />
        <StatCard label="Active Schools" value={stats.activeSchools || 0} sub="Currently active" icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Pending" value={stats.pendingSchools || 0} sub="Awaiting approval" icon={Clock} color="bg-amber-500" />
        <StatCard label="Total Earnings" value={`₦${(stats.totalEarnings || 0).toLocaleString()}`} sub={`${marketer.commissionRate || 5}% commission`} icon={DollarSign} color="bg-violet-500" />
      </div>

      {/* Referral Link */}
      <div className="bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Share2 size={18} />
          <h3 className="font-semibold">Your Referral Link</h3>
        </div>
        <p className="text-violet-100 text-sm mb-4">Share this link with schools to earn {marketer.commissionRate || 5}% commission on their subscription.</p>
        <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
          <code className="flex-1 text-sm truncate">{registerLink}</code>
          <button onClick={copyLink} className="flex items-center gap-1.5 bg-white text-violet-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-50 transition-colors flex-shrink-0">
            <Copy size={12} /> Copy Link
          </button>
        </div>
        <p className="text-violet-200 text-xs mt-3">Referral Code: <strong>{marketer.referralCode}</strong></p>
      </div>

      {/* Recent Referrals */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Referrals</h3>
        </div>
        {!referrals || referrals.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>No referrals yet. Start sharing your link!</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">School</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.slice(0, 10).map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-5 py-3 text-gray-500">{t.subscriptionPlan}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.subscriptionStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {t.subscriptionStatus?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(t.createdAt).toLocaleDateString('en-NG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
