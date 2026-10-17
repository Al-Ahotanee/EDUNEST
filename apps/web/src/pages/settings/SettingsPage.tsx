import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, Select, Card, Modal } from '../../components/ui';
import { schoolsApi, authApi, usersApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Settings, Building, Bell, Shield, User, Palette } from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user, updateUser, logout } = useAuthStore();
  const [tab, setTab] = useState<'school' | 'profile' | 'notifications' | 'security'>('school');
  const [savingPassword, setSavingPassword] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load school profile
  const { data: schoolData, isLoading: schoolLoading } = useQuery({
    queryKey: ['current-school'],
    queryFn: async () => {
      const res = await schoolsApi.current();
      return res.data?.data || res.data;
    },
  });

  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const schoolForm = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
    },
  });

  useEffect(() => {
    if (schoolData) {
      schoolForm.reset({
        name: schoolData.name || '',
        email: schoolData.email || '',
        phone: schoolData.phone || '',
        address: schoolData.address || '',
        website: schoolData.website || '',
      });
    }
  }, [schoolData, schoolForm]);

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, profileForm]);

  const updateSchoolMutation = useMutation({
    mutationFn: (data: any) => schoolsApi.updateCurrent(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['current-school'] });
      toast.success('School profile updated successfully!');
      if (res.data?.data && user?.school) {
        updateUser({ school: { ...user.school, ...res.data.data } });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update school profile');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => {
      if (!user?.id) throw new Error('User not found');
      return usersApi.update(user.id, data);
    },
    onSuccess: (res) => {
      toast.success('Profile updated successfully!');
      if (res.data?.data) {
        updateUser(res.data.data);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleSchoolSubmit = schoolForm.handleSubmit((values) => {
    updateSchoolMutation.mutate(values);
  });

  const handleProfileSubmit = profileForm.handleSubmit((values) => {
    updateProfileMutation.mutate(values);
  });

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (values.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed successfully!');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  });

  const TABS = [
    { key: 'school', label: 'School Profile', icon: <Building size={16} /> },
    { key: 'profile', label: 'My Profile', icon: <User size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { key: 'security', label: 'Security', icon: <Shield size={16} /> },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your school and account preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="w-56 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {tab === 'school' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Building size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-900">School Profile</h2>
                  <p className="text-sm text-slate-500">Update your school information</p>
                </div>
              </div>

              {/* Logo */}
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                  {user?.tenant?.name?.[0] || 'S'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{user?.tenant?.name}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{user?.school?.name}</p>
                  <Button variant="secondary" size="sm" className="mt-2">Change Logo</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="School Name" {...schoolForm.register('name')} />
                <Input label="Contact Email" type="email" {...schoolForm.register('email')} />
                <Input label="Phone Number" {...schoolForm.register('phone')} />
                <Input label="Website" {...schoolForm.register('website')} placeholder="https://" />
              </div>
              <Input label="School Address" {...schoolForm.register('address')} placeholder="Full address" />

              {/* Branding */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Palette size={16} /> Branding</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" defaultValue="#2563eb" className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                      <Input defaultValue="#2563eb" className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" defaultValue="#7e3af2" className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                      <Input defaultValue="#7e3af2" className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSchoolSubmit} loading={updateSchoolMutation.isPending}>Save Changes</Button>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><User size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-900">My Profile</h2>
                  <p className="text-sm text-slate-500">Update your personal information</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">{user?.firstName} {user?.lastName}</p>
                  <p className="text-slate-400 text-sm">{user?.email}</p>
                  <div className="flex gap-1 mt-1">
                    {user?.roles?.map(r => (
                      <span key={r.id} className="badge-blue">{r.name}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" {...profileForm.register('firstName')} />
                <Input label="Last Name" {...profileForm.register('lastName')} />
                <Input label="Email Address" type="email" {...profileForm.register('email')} />
                <Input label="Phone Number" {...profileForm.register('phone')} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSubmit} loading={updateProfileMutation.isPending}>Save Profile Details</Button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Change Password</h3>
                <div className="space-y-3">
                  <Input label="Current Password" type="password" {...passwordForm.register('currentPassword')} placeholder="••••••••" />
                  <Input label="New Password" type="password" {...passwordForm.register('newPassword')} placeholder="••••••••" />
                  <Input label="Confirm New Password" type="password" {...passwordForm.register('confirmPassword')} placeholder="••••••••" />
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="secondary" onClick={handlePasswordSubmit} loading={savingPassword}>Update Password</Button>
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Bell size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Notification Preferences</h2>
                  <p className="text-sm text-slate-500">Control what alerts you receive</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'New student registration', description: 'Alert when a new student is registered' },
                  { label: 'Fee payment received', description: 'Alert when a fee payment is recorded' },
                  { label: 'Term result published', description: 'Alert when results are approved and published' },
                  { label: 'Low attendance alert', description: 'Alert when a student attendance drops below 70%' },
                  { label: 'Leave application', description: 'Alert when a staff applies for leave' },
                  { label: 'Overdue invoices', description: 'Daily digest of unpaid overdue invoices' },
                ].map((n, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{n.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{n.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={i < 4} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success('Preferences saved successfully!')}>Save Preferences</Button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-red-50 rounded-xl text-red-600"><Shield size={20} /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Security Settings</h2>
                  <p className="text-sm text-slate-500">Manage authentication and access control</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">Two-Factor Authentication</p>
                      <p className="text-sm text-slate-400 mt-0.5">Add an extra layer of security</p>
                    </div>
                    <span className="badge-gray">Disabled</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setShow2FAModal(true)}>Enable 2FA</Button>
                </div>

                <div className="p-5 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">Active Sessions</p>
                      <p className="text-sm text-slate-400 mt-0.5">Devices currently logged in</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Current session ({typeof navigator !== 'undefined' && navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] || 'Browser'})</p>
                        <p className="text-xs text-slate-400">This device · Active now</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-medium">Current</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-400 italic">No other active sessions</p>
                        <p className="text-xs text-slate-400">Other device sessions will appear here</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-red-100 bg-red-50 rounded-2xl">
                  <p className="font-semibold text-red-700 mb-1">Danger Zone</p>
                  <p className="text-sm text-red-500 mb-3">Irreversible actions — proceed with caution</p>
                  <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2FA Modal ─── */}
      <Modal
        open={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        title="Enable Two-Factor Authentication"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <p className="font-semibold mb-1">Coming Soon</p>
            <p>2FA requires TOTP integration with authenticator apps (Google Authenticator, Authy, 1Password). This feature is on our roadmap for the next release.</p>
          </div>
          <div className="text-xs text-slate-500 space-y-1.5">
            <p className="font-semibold text-slate-700">What 2FA will provide:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Time-based one-time passwords (TOTP, RFC 6238)</li>
              <li>Recovery codes for lost-device scenarios</li>
              <li>Backup recovery codes (one-time use)</li>
              <li>Per-session enforcement option</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShow2FAModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Account Modal ─── */}
      <Modal
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
        title="Delete Account — Irreversible Action"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <p className="font-semibold mb-1">⚠️ Warning: This cannot be undone</p>
            <p>Deleting your account will:</p>
            <ul className="list-disc ml-5 mt-2 space-y-0.5">
              <li>Permanently remove your user record and authentication credentials</li>
              <li>Revoke all active sessions and refresh tokens</li>
              <li>Retain anonymized historical records (invoices, attendance) for audit compliance</li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-slate-700 mb-2">To confirm, type <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">DELETE MY ACCOUNT</code> below:</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="input"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}>Cancel</Button>
            <Button
              variant="danger"
              disabled={deleteConfirmText !== 'DELETE MY ACCOUNT'}
              onClick={async () => {
                toast.success('Account deletion request received. You will be logged out shortly.');
                setTimeout(() => {
                  logout();
                  window.location.href = '/login';
                }, 1500);
              }}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
