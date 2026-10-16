import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Bed, Plus, Edit, Trash2, Users, Home, Building2, ChevronLeft,
  UserMinus, UserPlus, Printer, Download, ShieldCheck,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { DataTable, Button, Modal, Input, Select, StatCard } from '../../components/ui';
import { api, studentsApi } from '../../services/api';
import { formatDate, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { EduNestIcon } from '../../components/common/EduNestLogo';

const hapi = {
  list: () => api.get('/hostel'),
  create: (d: any) => api.post('/hostel', d),
  update: (id: string, d: any) => api.put(`/hostel/${id}`, d),
  delete: (id: string) => api.delete(`/hostel/${id}`),
  rooms: (id: string) => api.get(`/hostel/${id}/rooms`),
  createRoom: (id: string, d: any) => api.post(`/hostel/${id}/rooms`, d),
  deleteRoom: (id: string) => api.delete(`/hostel/rooms/${id}`),
  allocations: (p?: any) => api.get('/hostel/allocations', { params: p }),
  allocate: (d: any) => api.post('/hostel/allocate', d),
  vacate: (id: string) => api.delete(`/hostel/allocations/${id}`),
  stats: () => api.get('/hostel/stats'),
};

type View = 'hostels' | 'rooms' | 'allocations';

export default function HostelPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const school = user?.tenant || user?.school || { name: 'EduNest International College' };

  const [view, setView] = useState<View>('hostels');
  const [hostel, setHostel] = useState<any>(null);
  const [hostelModal, setHostelModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState<any>(null);
  const [roomModal, setRoomModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');
  const [vacateConfirm, setVacateConfirm] = useState<any>(null);
  const [boardingSlip, setBoardingSlip] = useState<any>(null);
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'AVAILABLE' | 'FULL'>('ALL');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: hostels, isLoading: hLoading } = useQuery({ queryKey: ['hostels'], queryFn: () => hapi.list().then(r => r.data.data || []) });
  const { data: rooms, isLoading: rLoading } = useQuery({ queryKey: ['hostel-rooms', hostel?.id], queryFn: () => hapi.rooms(hostel!.id).then(r => r.data.data || []), enabled: !!hostel?.id });
  const { data: allocsData, isLoading: aLoading } = useQuery({ queryKey: ['allocations', page, search, hostel?.id], queryFn: () => hapi.allocations({ page, limit: 20, search, hostelId: hostel?.id }).then(r => r.data), placeholderData: (prev) => prev, enabled: view === 'allocations' });
  const { data: stats } = useQuery({ queryKey: ['hostel-stats'], queryFn: () => hapi.stats().then(r => r.data.data) });

  const activeHostelId = selectedHostelId || hostel?.id || hostels?.[0]?.id || '';
  const { data: studentsList } = useQuery({
    queryKey: ['students-for-hostel'],
    queryFn: () => studentsApi.list({ limit: 100 }).then(r => r.data.data || []),
    enabled: allocModal,
  });
  const { data: allocRooms } = useQuery({
    queryKey: ['hostel-alloc-rooms', activeHostelId],
    queryFn: () => hapi.rooms(activeHostelId).then(r => r.data.data || []),
    enabled: allocModal && !!activeHostelId,
  });

  const hostelForm = useForm({ defaultValues: { name: '', gender: 'MALE', capacity: 100, warden: '' } });
  const roomForm = useForm({ defaultValues: { number: '', capacity: 4, floor: '' } });
  const allocForm = useForm({ defaultValues: { studentId: '', roomId: '' } });

  const hostelMut = useMutation({ mutationFn: (d: any) => editingHostel ? hapi.update(editingHostel.id, d) : hapi.create(d), onSuccess: () => { toast.success(editingHostel ? 'Hostel updated' : 'Hostel created'); qc.invalidateQueries({ queryKey: ['hostels'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }); setHostelModal(false); setEditingHostel(null); hostelForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const roomMut = useMutation({ mutationFn: (d: any) => hapi.createRoom(hostel!.id, d), onSuccess: () => { toast.success('Room created'); qc.invalidateQueries({ queryKey: ['hostel-rooms', hostel?.id] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }); setRoomModal(false); roomForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const allocMut = useMutation({ mutationFn: (d: any) => hapi.allocate(d), onSuccess: (res) => { toast.success('Student allocated!'); qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); qc.invalidateQueries({ queryKey: ['hostels'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }); setAllocModal(false); allocForm.reset(); if (res?.data?.data) { setBoardingSlip(res.data.data); } }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const vacateMut = useMutation({ mutationFn: (id: string) => hapi.vacate(id), onSuccess: () => { toast.success('Student vacated'); qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); qc.invalidateQueries({ queryKey: ['hostels'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }); setVacateConfirm(null); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });

  const openEditHostel = (h: any) => { setEditingHostel(h); hostelForm.reset({ name: h.name, gender: h.gender, capacity: h.capacity, warden: h.warden || '' }); setHostelModal(true); };

  const handleExportAllocations = () => {
    const list = allocsData?.data || [];
    if (!list.length) { toast.error('No allocations to export'); return; }
    const headers = ['Student Name', 'Admission No', 'Gender', 'Hostel Block', 'Room Number', 'Allocated Date'];
    const rows = list.map((a: any) => [
      `"${a.student?.firstName || ''} ${a.student?.lastName || ''}"`,
      `"${a.student?.admissionNumber || ''}"`,
      `"${a.student?.gender || ''}"`,
      `"${a.room?.hostel?.name || ''}"`,
      `"${a.room?.number || ''}"`,
      `"${formatDate(a.allocatedAt)}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hostel_Allocations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Allocations exported as CSV');
  };

  const allocCols = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-semibold text-slate-900 leading-tight">{r.student?.firstName} {r.student?.lastName}</p><p className="text-xs font-mono text-slate-400">{r.student?.admissionNumber}</p></div> },
    { key: 'hostel', header: 'Hostel Block', render: (r: any) => <span className="font-medium text-slate-700">{r.room?.hostel?.name}</span> },
    { key: 'room', header: 'Room', render: (r: any) => <span className="badge-blue font-semibold">Room {r.room?.number}</span> },
    { key: 'gender', header: 'Gender', render: (r: any) => <span className={r.student?.gender === 'MALE' ? 'badge-blue' : 'badge-purple'}>{r.student?.gender}</span> },
    { key: 'since', header: 'Allocated Date', render: (r: any) => <span className="text-sm text-slate-500">{formatDate(r.allocatedAt)}</span> },
    { key: 'actions', header: 'Actions', render: (r: any) => <div className="flex items-center gap-1.5"><button onClick={() => setBoardingSlip(r)} className="btn-secondary btn-sm gap-1"><Printer size={13} />Slip</button><button onClick={() => setVacateConfirm(r)} className="btn-danger btn-sm gap-1"><UserMinus size={13} />Vacate</button></div> },
  ];

  const filteredHostels = (hostels || []).filter((h: any) => {
    if (genderFilter === 'ALL') return true;
    return h.gender === genderFilter;
  });

  const filteredRooms = (rooms || []).filter((r: any) => {
    if (roomFilter === 'ALL') return true;
    if (roomFilter === 'AVAILABLE') return r.available > 0;
    if (roomFilter === 'FULL') return r.available === 0;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hostel & Boarding Management</h1>
          <p className="page-subtitle">Halls of residence, room occupancy matrices, bed allocations, and boarding slips</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {view !== 'hostels' && (
            <Button
              variant="secondary"
              icon={<ChevronLeft size={16} />}
              onClick={() => { setView('hostels'); setHostel(null); }}
            >
              Back to Hostels
            </Button>
          )}
          {view === 'hostels' && (
            <Button
              icon={<Plus size={16} />}
              onClick={() => { setEditingHostel(null); hostelForm.reset(); setHostelModal(true); }}
            >
              Add Hostel Block
            </Button>
          )}
          {view === 'rooms' && hostel && (
            <Button
              icon={<Plus size={16} />}
              onClick={() => { roomForm.reset(); setRoomModal(true); }}
            >
              Add Room
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<UserPlus size={16} />}
            onClick={() => {
              allocForm.reset();
              if (hostel?.id) setSelectedHostelId(hostel.id);
              setAllocModal(true);
            }}
          >
            Allocate Student
          </Button>
          {view === 'allocations' && (
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={handleExportAllocations}
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Hostels" value={stats?.totalHostels || 0} icon={<Building2 size={20} />} color="purple" />
        <StatCard title="Total Rooms" value={stats?.totalRooms || 0} icon={<Home size={20} />} color="blue" />
        <StatCard title="Total Bed Capacity" value={stats?.totalCapacity || 0} icon={<Bed size={20} />} color="blue" />
        <StatCard title="Occupied Beds" value={stats?.currentOccupants || 0} subtitle={`${stats?.occupancyRate || 0}% occupancy`} icon={<Users size={20} />} color="amber" />
        <StatCard title="Vacant Beds" value={stats?.availableSpaces || 0} icon={<Bed size={20} />} color="green" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 pb-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['hostels', 'rooms', 'allocations'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all whitespace-nowrap',
                view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {v === 'rooms' && hostel ? `Rooms — ${hostel.name}` : v}
            </button>
          ))}
        </div>

        {view === 'hostels' && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'MALE', 'FEMALE'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  genderFilter === g ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {g === 'ALL' ? 'All Blocks' : g === 'MALE' ? 'Boys Blocks' : 'Girls Blocks'}
              </button>
            ))}
          </div>
        )}

        {view === 'rooms' && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'AVAILABLE', 'FULL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRoomFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  roomFilter === f ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {f === 'ALL' ? 'All Rooms' : f === 'AVAILABLE' ? 'Vacant Available' : 'Fully Occupied'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 1. HOSTELS VIEW ──────────────────────────────────────────────────────── */}
      {view === 'hostels' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)
          ) : filteredHostels.length === 0 ? (
            <div className="col-span-full card p-12 text-center">
              <Building2 size={48} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hostels found. Click "Add Hostel Block" to register one.</p>
            </div>
          ) : (
            filteredHostels.map((h: any) => {
              const occPct = h.totalBeds > 0 ? Math.round((h.occupied / h.totalBeds) * 100) : 0;
              return (
                <div key={h.id} className="card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('p-3 rounded-xl flex items-center justify-center', h.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600')}>
                        <Building2 size={24} />
                      </div>
                      <span className={h.gender === 'MALE' ? 'badge-blue' : 'badge-purple'}>
                        {h.gender === 'MALE' ? 'Boys Residence' : 'Girls Residence'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg">{h.name}</h3>
                    {h.warden && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="font-semibold text-slate-700">Warden:</span> {h.warden}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                      <div>
                        <p className="text-xs text-slate-400">Rooms</p>
                        <p className="text-base font-bold text-slate-800">{h.totalRooms || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Total Beds</p>
                        <p className="text-base font-bold text-blue-600">{h.totalBeds || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Occupied</p>
                        <p className={cn('text-base font-bold', occPct >= 90 ? 'text-red-500' : 'text-emerald-600')}>
                          {h.occupied || 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Occupancy Rate</span>
                        <span className="font-bold">{occPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={cn('h-full transition-all', occPct >= 100 ? 'bg-red-500' : occPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.min(occPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => { setHostel(h); setView('rooms'); }}
                      className="btn-primary btn-sm flex-1 justify-center"
                    >
                      View Rooms & Beds
                    </button>
                    <button
                      onClick={() => openEditHostel(h)}
                      className="btn-secondary btn-sm px-2.5"
                      title="Edit Block"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <button
            onClick={() => { setEditingHostel(null); hostelForm.reset(); setHostelModal(true); }}
            className="card p-6 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all min-h-[220px]"
          >
            <Plus size={32} />
            <span className="text-sm font-semibold">Add Hostel Block</span>
            <span className="text-xs text-slate-400">Create new hall or wing</span>
          </button>
        </div>
      )}

      {/* ─── 2. ROOMS VIEW ────────────────────────────────────────────────────────── */}
      {view === 'rooms' && (
        !hostel ? (
          <div className="card p-12 text-center">
            <Home size={48} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">Select a hostel block above to inspect rooms and beds</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-2xl flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{hostel.name}</h3>
                  <p className="text-xs text-slate-500">
                    {hostel.gender === 'MALE' ? "Boys' Residence" : "Girls' Residence"} • Warden: {hostel.warden || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => { roomForm.reset(); setRoomModal(true); }}
                >
                  Add Room
                </Button>
                <Button
                  size="sm"
                  icon={<UserPlus size={14} />}
                  onClick={() => {
                    allocForm.reset();
                    setSelectedHostelId(hostel.id);
                    setAllocModal(true);
                  }}
                >
                  Allocate Student
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rLoading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)
              ) : filteredRooms.length === 0 ? (
                <div className="col-span-full card p-12 text-center">
                  <Bed size={48} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No rooms match filter in {hostel.name}.</p>
                </div>
              ) : (
                filteredRooms.map((room: any) => {
                  const pct = room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0;
                  return (
                    <div key={room.id} className="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-black text-xl text-slate-900">Room {room.number}</span>
                            {room.floor && <p className="text-xs text-slate-400">Floor {room.floor}</p>}
                          </div>
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', room.available === 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                            {room.available === 0 ? 'FULL' : `${room.available} beds left`}
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                          <div
                            className={cn('h-full transition-all', pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <div className="space-y-1.5 my-3">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bed Roster ({room.occupied}/{room.capacity})</p>
                          {(room.allocations || []).map((a: any, idx: number) => (
                            <div key={a.id} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                  B{idx + 1}
                                </span>
                                <span className="font-medium text-slate-800 truncate">
                                  {a.student?.firstName} {a.student?.lastName}
                                </span>
                              </div>
                              <button
                                onClick={() => setBoardingSlip({ ...a, room: { ...room, hostel } })}
                                className="text-slate-400 hover:text-blue-600 p-0.5"
                                title="View Boarding Slip"
                              >
                                <Printer size={13} />
                              </button>
                            </div>
                          ))}

                          {Array.from({ length: Math.max(0, room.capacity - room.occupied) }).map((_, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                allocForm.reset();
                                setSelectedHostelId(hostel.id);
                                allocForm.setValue('roomId', room.id);
                                setAllocModal(true);
                              }}
                              className="flex items-center justify-between text-xs p-1.5 border border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-blue-300 hover:text-blue-600 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                                  B{room.occupied + i + 1}
                                </span>
                                <span>Vacant Slot</span>
                              </div>
                              <span className="text-[10px] font-bold">+ Assign</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>Total: {room.capacity} beds</span>
                        <span className="font-semibold text-slate-600">{room.occupied} occupied</span>
                      </div>
                    </div>
                  );
                })
              )}

              <button
                onClick={() => { roomForm.reset(); setRoomModal(true); }}
                className="card p-4 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-all min-h-[160px]"
              >
                <Plus size={24} />
                <span className="text-xs font-semibold">Add Room to {hostel.name}</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* ─── 3. ALLOCATIONS VIEW ─────────────────────────────────────────────────── */}
      {view === 'allocations' && (
        <DataTable
          data={allocsData?.data || []}
          columns={allocCols}
          loading={aLoading}
          onSearch={q => { setSearch(q); setPage(1); }}
          searchPlaceholder="Search by student name or admission number..."
          pagination={allocsData?.meta ? {
            page: allocsData.meta.page,
            limit: allocsData.meta.limit,
            total: allocsData.meta.total,
            totalPages: allocsData.meta.totalPages,
            onPageChange: setPage,
          } : undefined}
          emptyMessage="No active student boarding allocations found."
        />
      )}

      {/* ─── MODAL: ADD / EDIT HOSTEL ────────────────────────────────────────────── */}
      <Modal
        open={hostelModal}
        onClose={() => { setHostelModal(false); setEditingHostel(null); hostelForm.reset(); }}
        title={editingHostel ? 'Edit Hostel Block' : 'Add New Hostel Block'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setHostelModal(false); setEditingHostel(null); hostelForm.reset(); }}>
              Cancel
            </Button>
            <Button
              loading={hostelMut.isPending}
              onClick={hostelForm.handleSubmit(d => hostelMut.mutate(d))}
            >
              {editingHostel ? 'Update Block' : 'Create Block'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Hostel Block Name *"
            {...hostelForm.register('name', { required: true })}
            placeholder="e.g. Mandela Hall (Block A)"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Designated Gender *"
              {...hostelForm.register('gender')}
              options={[
                { value: 'MALE', label: 'Male (Boys Wing)' },
                { value: 'FEMALE', label: 'Female (Girls Wing)' },
              ]}
            />
            <Input
              label="Target Capacity (Beds)"
              type="number"
              {...hostelForm.register('capacity', { valueAsNumber: true })}
              min={1}
            />
          </div>
          <Input
            label="House Warden / Master"
            {...hostelForm.register('warden')}
            placeholder="e.g. Mr. Okonjo Paul"
          />
        </div>
      </Modal>

      {/* ─── MODAL: ADD ROOM ──────────────────────────────────────────────────────── */}
      <Modal
        open={roomModal}
        onClose={() => { setRoomModal(false); roomForm.reset(); }}
        title={`Add Room to ${hostel?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRoomModal(false); roomForm.reset(); }}>
              Cancel
            </Button>
            <Button loading={roomMut.isPending} onClick={roomForm.handleSubmit(d => roomMut.mutate(d))}>
              Add Room
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room Number / Identifier *"
              {...roomForm.register('number', { required: true })}
              placeholder="e.g. 101, A2"
            />
            <Input
              label="Bed Capacity *"
              type="number"
              {...roomForm.register('capacity', { valueAsNumber: true, required: true })}
              min={1}
              max={20}
            />
          </div>
          <Input
            label="Floor / Level"
            {...roomForm.register('floor')}
            placeholder="e.g. Ground, First Floor"
          />
        </div>
      </Modal>

      {/* ─── MODAL: ALLOCATE STUDENT ──────────────────────────────────────────────── */}
      <Modal
        open={allocModal}
        onClose={() => { setAllocModal(false); allocForm.reset(); }}
        title="Allocate Student to Boarding Room"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAllocModal(false); allocForm.reset(); }}>
              Cancel
            </Button>
            <Button loading={allocMut.isPending} onClick={allocForm.handleSubmit(d => allocMut.mutate(d))}>
              Allocate & Generate Slip
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Hostel Block *"
            value={activeHostelId}
            onChange={(e) => {
              setSelectedHostelId(e.target.value);
              allocForm.setValue('roomId', '');
            }}
            options={(hostels || []).map((h: any) => ({
              value: h.id,
              label: `${h.name} (${h.gender === 'MALE' ? 'Boys' : 'Girls'})`,
            }))}
            placeholder="Select Hostel Block"
          />

          <Select
            label="Student to Allocate *"
            {...allocForm.register('studentId', { required: true })}
            options={(studentsList || []).map((s: any) => ({
              value: s.id,
              label: `${s.firstName} ${s.lastName} (${s.admissionNumber}) — ${s.gender}`,
            }))}
            placeholder="Search & Select Student"
          />

          <Select
            label="Target Room *"
            {...allocForm.register('roomId', { required: true })}
            options={(allocRooms || []).map((rm: any) => ({
              value: rm.id,
              label: `Room ${rm.number} (Floor: ${rm.floor || 'G'}, ${rm.available || rm.capacity} vacant of ${rm.capacity})`,
            }))}
            placeholder={activeHostelId ? "Select Room with Vacancy" : "Choose a hostel first"}
          />

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
            <ShieldCheck size={16} className="flex-shrink-0 mt-0.5 text-blue-600" />
            <p>
              The system automatically validates gender segregation and replaces any previous active room assignment for the student.
            </p>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL: OFFICIAL BOARDING PASS SLIP ───────────────────────────────────── */}
      <Modal
        open={!!boardingSlip}
        onClose={() => setBoardingSlip(null)}
        title="Student Boarding Pass & Room Allocation Slip"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">Formal Institutional Boarding Record</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setBoardingSlip(null)}>Close</Button>
              <Button icon={<Printer size={16} />} onClick={() => window.print()}>
                Print Boarding Pass
              </Button>
            </div>
          </div>
        }
      >
        {boardingSlip && (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Slip Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                {school.logo ? (
                  <img src={school.logo} alt="School Logo" className="w-14 h-14 object-contain rounded-xl" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <EduNestIcon size={32} />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{school.name}</h2>
                  <p className="text-xs text-slate-500">{school.address || 'Boarding & Hostel Services Division'}</p>
                  <p className="text-xs text-slate-500">{school.phone && `Tel: ${school.phone}`} {school.email && `| Email: ${school.email}`}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full uppercase">
                  Boarding Pass
                </span>
                <p className="text-[11px] font-mono text-slate-400 mt-1">PASS-{boardingSlip.id?.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Official Student Room Allocation Slip
              </h3>
            </div>

            {/* Student & Room Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Particulars</p>
                <div className="flex justify-between"><span className="text-slate-500">Full Name:</span><span className="font-bold text-slate-900">{boardingSlip.student?.firstName} {boardingSlip.student?.lastName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Admission No:</span><span className="font-mono font-bold text-blue-600">{boardingSlip.student?.admissionNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Gender:</span><span className="font-semibold text-slate-800">{boardingSlip.student?.gender}</span></div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hostel & Room Assignment</p>
                <div className="flex justify-between"><span className="text-slate-500">Hostel Hall:</span><span className="font-bold text-slate-900">{boardingSlip.room?.hostel?.name || hostel?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Room Number:</span><span className="font-black text-blue-700">Room {boardingSlip.room?.number}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Floor:</span><span className="font-semibold text-slate-800">{boardingSlip.room?.floor || 'Ground'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Allocated Date:</span><span className="font-semibold text-slate-800">{formatDate(boardingSlip.allocatedAt)}</span></div>
              </div>
            </div>

            {/* House Rules */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5"><AlertCircle size={14} /> Boarding House Regulations:</p>
              <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5">
                <li>Students must be in their designated room by mandatory lights-out at 21:30.</li>
                <li>Rooms must be kept clean and inspected daily by the House Warden.</li>
                <li>Unauthorized room changes or guests are strictly prohibited.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200">
              <div className="text-center">
                <div className="border-b border-slate-400 h-10 mb-1" />
                <p className="text-xs font-bold text-slate-800">House Master / Warden</p>
                <p className="text-[10px] text-slate-400">Signature & Date</p>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-400 h-10 mb-1" />
                <p className="text-xs font-bold text-slate-800">Student / Boarder</p>
                <p className="text-[10px] text-slate-400">Signature of Acceptance</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: VACATE CONFIRMATION ─────────────────────────────────────────── */}
      <Modal
        open={!!vacateConfirm}
        onClose={() => setVacateConfirm(null)}
        title="Confirm Boarding Bed Vacate"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVacateConfirm(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={vacateMut.isPending}
              onClick={() => vacateMut.mutate(vacateConfirm.id)}
            >
              Confirm Vacate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Remove <strong>{vacateConfirm?.student?.firstName} {vacateConfirm?.student?.lastName}</strong> ({vacateConfirm?.student?.admissionNumber}) from Room <strong>{vacateConfirm?.room?.number}</strong> in <strong>{vacateConfirm?.room?.hostel?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
