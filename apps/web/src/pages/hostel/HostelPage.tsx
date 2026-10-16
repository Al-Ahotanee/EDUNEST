import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Bed, Plus, Edit, Trash2, Users, Home, Building2, ChevronLeft, UserMinus, UserPlus } from 'lucide-react';
import { DataTable, Button, Modal, Input, Select, StatCard } from '../../components/ui';
import { api, studentsApi } from '../../services/api';
import { formatDate, cn } from '../../lib/utils';

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
  const [view, setView] = useState<View>('hostels');
  const [hostel, setHostel] = useState<any>(null);
  const [hostelModal, setHostelModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState<any>(null);
  const [roomModal, setRoomModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');
  const [vacateConfirm, setVacateConfirm] = useState<any>(null);
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
  const allocMut = useMutation({ mutationFn: (d: any) => hapi.allocate(d), onSuccess: () => { toast.success('Student allocated!'); qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }); setAllocModal(false); allocForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const vacateMut = useMutation({ mutationFn: (id: string) => hapi.vacate(id), onSuccess: () => { toast.success('Student vacated'); qc.invalidateQueries({ queryKey: ['allocations'] }); qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); qc.invalidateQueries({ queryKey: ['hostel-stats'] }); setVacateConfirm(null); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });

  const openEditHostel = (h: any) => { setEditingHostel(h); hostelForm.reset({ name: h.name, gender: h.gender, capacity: h.capacity, warden: h.warden || '' }); setHostelModal(true); };

  const allocCols = [
    { key: 'student', header: 'Student', render: (r: any) => <div><p className="font-semibold">{r.student?.firstName} {r.student?.lastName}</p><p className="text-xs font-mono text-slate-400">{r.student?.admissionNumber}</p></div> },
    { key: 'hostel', header: 'Hostel', render: (r: any) => <span>{r.room?.hostel?.name}</span> },
    { key: 'room', header: 'Room', render: (r: any) => <span className="badge-blue">Room {r.room?.number}</span> },
    { key: 'gender', header: 'Gender', render: (r: any) => <span className={r.student?.gender === 'MALE' ? 'badge-blue' : 'badge-purple'}>{r.student?.gender}</span> },
    { key: 'since', header: 'Since', render: (r: any) => <span className="text-sm text-slate-500">{formatDate(r.allocatedAt)}</span> },
    { key: 'actions', header: '', render: (r: any) => <button onClick={() => setVacateConfirm(r)} className="btn-danger btn-sm gap-1"><UserMinus size={13} />Vacate</button> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Hostel Management</h1><p className="page-subtitle">Rooms, allocations and boarding</p></div>
        <div className="flex gap-2">
          {view !== 'hostels' && <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => { setView('hostels'); setHostel(null); }}>Back to Hostels</Button>}
          {view === 'hostels' && <Button icon={<Plus size={16} />} onClick={() => { setEditingHostel(null); hostelForm.reset(); setHostelModal(true); }}>Add Hostel</Button>}
          {view === 'rooms' && hostel && <Button icon={<Plus size={16} />} onClick={() => { roomForm.reset(); setRoomModal(true); }}>Add Room</Button>}
          {view === 'allocations' && <Button icon={<UserPlus size={16} />} onClick={() => { allocForm.reset(); setAllocModal(true); }}>Allocate Student</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Hostels" value={stats?.totalHostels || 0} icon={<Building2 size={20} />} color="purple" />
        <StatCard title="Total Rooms" value={stats?.totalRooms || 0} icon={<Home size={20} />} color="blue" />
        <StatCard title="Capacity" value={stats?.totalCapacity || 0} icon={<Bed size={20} />} color="blue" />
        <StatCard title="Occupied" value={stats?.currentOccupants || 0} icon={<Users size={20} />} color="amber" />
        <StatCard title="Available" value={stats?.availableSpaces || 0} icon={<Bed size={20} />} color="green" />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['hostels', 'rooms', 'allocations'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {v === 'rooms' && hostel ? `Rooms — ${hostel.name}` : v}
          </button>
        ))}
      </div>

      {/* HOSTELS VIEW */}
      {view === 'hostels' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />) :
            (hostels || []).length === 0 ? (
              <div className="col-span-3 card p-12 text-center"><Building2 size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No hostels yet. Click "Add Hostel" to create one.</p></div>
            ) :
            (hostels || []).map((h: any) => (
              <div key={h.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-3 rounded-xl', h.gender === 'MALE' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600')}><Building2 size={22} /></div>
                  <span className={h.gender === 'MALE' ? 'badge-blue' : 'badge-purple'}>{h.gender}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{h.name}</h3>
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  <div className="flex justify-between"><span>Rooms:</span><span className="font-semibold text-slate-800">{h.totalRooms || h._count?.rooms || 0}</span></div>
                  <div className="flex justify-between"><span>Occupied:</span><span className={cn('font-semibold', h.occupied > 0 ? 'text-amber-600' : 'text-slate-800')}>{h.occupied || 0}</span></div>
                  {h.warden && <div className="flex justify-between"><span>Warden:</span><span className="font-semibold text-slate-800">{h.warden}</span></div>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { setHostel(h); setView('rooms'); }} className="btn-primary btn-sm flex-1 justify-center">View Rooms</button>
                  <button onClick={() => openEditHostel(h)} className="btn-secondary btn-sm px-2"><Edit size={13} /></button>
                </div>
              </div>
            ))
          }
          <button onClick={() => { setEditingHostel(null); hostelForm.reset(); setHostelModal(true); }} className="card p-6 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all min-h-[180px]">
            <Plus size={28} /><span className="text-sm font-medium">Add Hostel</span>
          </button>
        </div>
      )}

      {/* ROOMS VIEW */}
      {view === 'rooms' && (
        !hostel ? (
          <div className="card p-12 text-center"><Home size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Select a hostel to view its rooms</p></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {rLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />) :
              (rooms || []).length === 0 ? (
                <div className="col-span-4 card p-12 text-center"><Bed size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-500">No rooms yet. Click "Add Room" to create one.</p></div>
              ) :
              (rooms || []).map((room: any) => {
                const pct = room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0;
                return (
                  <div key={room.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-black text-2xl text-slate-900">Room {room.number}</span>
                      <span className={cn('text-xs font-bold', room.available === 0 ? 'text-red-500' : 'text-emerald-600')}>{room.available}/{room.capacity}</span>
                    </div>
                    {room.floor && <p className="text-xs text-slate-400 mb-2">Floor {room.floor}</p>}
                    <div className="space-y-1 mb-3">
                      {(room.allocations || []).map((a: any) => (
                        <div key={a.id} className="text-xs text-slate-600 truncate flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{a.student?.firstName} {a.student?.lastName}</div>
                      ))}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={cn('h-1.5 rounded-full transition-all', pct >= 100 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })
            }
            <button onClick={() => { roomForm.reset(); setRoomModal(true); }} className="card p-4 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-all min-h-[140px]">
              <Plus size={22} /><span className="text-xs font-medium">Add Room</span>
            </button>
          </div>
        )
      )}

      {/* ALLOCATIONS VIEW */}
      {view === 'allocations' && (
        <DataTable data={allocsData?.data || []} columns={allocCols} loading={aLoading}
          onSearch={q => { setSearch(q); setPage(1); }} searchPlaceholder="Search by student name or admission number..."
          pagination={allocsData?.meta ? { page: allocsData.meta.page, limit: allocsData.meta.limit, total: allocsData.meta.total, totalPages: allocsData.meta.totalPages, onPageChange: setPage } : undefined}
          emptyMessage="No active allocations." />
      )}

      {/* Hostel Modal */}
      <Modal open={hostelModal} onClose={() => { setHostelModal(false); setEditingHostel(null); hostelForm.reset(); }} title={editingHostel ? 'Edit Hostel' : 'Add New Hostel'} size="sm"
        footer={<><Button variant="secondary" onClick={() => { setHostelModal(false); setEditingHostel(null); hostelForm.reset(); }}>Cancel</Button><Button loading={hostelMut.isPending} onClick={hostelForm.handleSubmit(d => hostelMut.mutate(d))}>{editingHostel ? 'Update' : 'Create Hostel'}</Button></>}>
        <div className="space-y-4">
          <Input label="Hostel Name *" {...hostelForm.register('name', { required: true })} placeholder="e.g. Boys' Hostel Block A" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Gender *" {...hostelForm.register('gender')} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} />
            <Input label="Total Capacity" type="number" {...hostelForm.register('capacity', { valueAsNumber: true })} min={1} />
          </div>
          <Input label="Warden Name" {...hostelForm.register('warden')} placeholder="Warden's full name" />
        </div>
      </Modal>

      {/* Room Modal */}
      <Modal open={roomModal} onClose={() => { setRoomModal(false); roomForm.reset(); }} title={`Add Room — ${hostel?.name}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => { setRoomModal(false); roomForm.reset(); }}>Cancel</Button><Button loading={roomMut.isPending} onClick={roomForm.handleSubmit(d => roomMut.mutate(d))}>Add Room</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Room Number / Name *" {...roomForm.register('number', { required: true })} placeholder="e.g. 101, A1" />
            <Input label="Capacity (beds) *" type="number" {...roomForm.register('capacity', { valueAsNumber: true, required: true })} min={1} max={20} />
          </div>
          <Input label="Floor" {...roomForm.register('floor')} placeholder="e.g. 1, Ground, First" />
        </div>
      </Modal>

      {/* Allocate Modal */}
      <Modal open={allocModal} onClose={() => { setAllocModal(false); allocForm.reset(); }} title="Allocate Student to Room" size="sm"
        footer={<><Button variant="secondary" onClick={() => { setAllocModal(false); allocForm.reset(); }}>Cancel</Button><Button loading={allocMut.isPending} onClick={allocForm.handleSubmit(d => allocMut.mutate(d))}>Allocate</Button></>}>
        <div className="space-y-4">
          <Select
            label="Hostel *"
            value={activeHostelId}
            onChange={(e) => {
              setSelectedHostelId(e.target.value);
              allocForm.setValue('roomId', '');
            }}
            options={(hostels || []).map((h: any) => ({
              value: h.id,
              label: `${h.name} (${h.gender})`,
            }))}
            placeholder="Select Hostel"
          />

          <Select
            label="Student *"
            {...allocForm.register('studentId', { required: true })}
            options={(studentsList || []).map((s: any) => ({
              value: s.id,
              label: `${s.firstName} ${s.lastName} (${s.admissionNumber}) - ${s.gender}`,
            }))}
            placeholder="Select Student"
          />

          <Select
            label="Room *"
            {...allocForm.register('roomId', { required: true })}
            options={(allocRooms || []).map((rm: any) => ({
              value: rm.id,
              label: `Room ${rm.number} (Floor: ${rm.floor || 'G'}, ${rm.capacity} beds)`,
            }))}
            placeholder={activeHostelId ? "Select Room" : "Choose a hostel first"}
          />

          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
            ⚠️ Gender of student must match the hostel's gender setting. Existing allocation will be replaced.
          </p>
        </div>
      </Modal>

      {/* Vacate Confirm */}
      <Modal open={!!vacateConfirm} onClose={() => setVacateConfirm(null)} title="Vacate Student" size="sm"
        footer={<><Button variant="secondary" onClick={() => setVacateConfirm(null)}>Cancel</Button><Button variant="danger" loading={vacateMut.isPending} onClick={() => vacateMut.mutate(vacateConfirm.id)}>Confirm Vacate</Button></>}>
        <p>Remove <strong>{vacateConfirm?.student?.firstName} {vacateConfirm?.student?.lastName}</strong> from Room <strong>{vacateConfirm?.room?.number}</strong> in <strong>{vacateConfirm?.room?.hostel?.name}</strong>?</p>
      </Modal>
    </div>
  );
}
