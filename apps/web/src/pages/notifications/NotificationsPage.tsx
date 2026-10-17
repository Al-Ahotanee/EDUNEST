import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Send, Users, BellOff, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button, StatCard, Badge } from '../../components/ui';
import { api } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const notifApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  send: (data: any) => api.post('/notifications/send', data),
  stats: () => api.get('/notifications/stats'),
};

const TYPE_ICONS: Record<string, { icon: React.ReactNode; cls: string }> = {
  INFO:    { icon: <Info size={16} />,          cls: 'bg-blue-50 text-blue-600'    },
  WARNING: { icon: <AlertTriangle size={16} />, cls: 'bg-amber-50 text-amber-600'  },
  SUCCESS: { icon: <CheckCircle size={16} />,   cls: 'bg-emerald-50 text-emerald-600' },
  ERROR:   { icon: <XCircle size={16} />,       cls: 'bg-red-50 text-red-600'      },
  SYSTEM:  { icon: <Bell size={16} />,          cls: 'bg-purple-50 text-purple-600' },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [composeModal, setComposeModal] = useState(false);

  const { data: notifsData, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notifApi.list({ limit: 50, unread: filter === 'unread' ? true : undefined }).then(r => r.data.data || []),
    refetchInterval: 30000,
  });

  const { data: statsData } = useQuery({ queryKey: ['notif-stats'], queryFn: () => notifApi.stats().then(r => r.data.data) });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notifApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notifApi.markAllRead(),
    onSuccess: () => { toast.success('All notifications marked as read'); queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notif-stats'] }); },
  });

  const sendForm = useForm({ defaultValues: { title: '', message: '', type: 'INFO', targetRole: '' } });
  const sendMutation = useMutation({
    mutationFn: (d: any) => notifApi.send(d),
    onSuccess: () => { toast.success('Notification sent!'); setComposeModal(false); sendForm.reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const notifications: any[] = notifsData || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">System alerts and announcements</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" icon={<CheckCheck size={16} />} onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
              Mark All Read
            </Button>
          )}
          <Button icon={<Send size={16} />} onClick={() => setComposeModal(true)}>Send Notification</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={statsData?.total || 0} icon={<Bell size={20} />} color="blue" />
        <StatCard title="Unread" value={statsData?.unread || 0} icon={<Bell size={20} />} color="amber" />
        <StatCard title="Today" value={statsData?.today || 0} icon={<Bell size={20} />} color="green" />
        <StatCard title="System" value={statsData?.system || 0} icon={<Bell size={20} />} color="purple" />
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {f === 'unread' ? `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` : 'All'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : !notifications.length ? (
          <div className="p-16 text-center">
            <BellOff size={48} className="text-slate-200 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-600">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n: any) => {
              const typeConfig = TYPE_ICONS[n.type] || TYPE_ICONS.INFO;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer ${!n.isRead ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeConfig.cls}`}>
                    {typeConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`font-semibold text-slate-900 ${!n.isRead ? 'font-bold' : ''}`}>{n.title}</p>
                      <span className="text-xs text-slate-400 flex-shrink-0">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {composeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Send Notification</h2>
              <button onClick={() => setComposeModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input {...sendForm.register('title', { required: true })} className="input" placeholder="Notification title" />
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea {...sendForm.register('message', { required: true })} rows={3} className="input resize-none" placeholder="Enter your message..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select {...sendForm.register('type')} className="input">
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="SUCCESS">Success</option>
                    <option value="ERROR">Error</option>
                    <option value="SYSTEM">System</option>
                  </select>
                </div>
                <div>
                  <label className="label">Target Role</label>
                  <select {...sendForm.register('targetRole')} className="input">
                    <option value="">All Users</option>
                    <option value="Teacher">Teachers</option>
                    <option value="Parent">Parents</option>
                    <option value="Student">Students</option>
                    <option value="Accountant">Accountants</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setComposeModal(false)}>Cancel</Button>
              <Button loading={sendMutation.isPending} icon={<Send size={16} />}
                onClick={sendForm.handleSubmit(d => sendMutation.mutate(d))}>
                Send Notification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
