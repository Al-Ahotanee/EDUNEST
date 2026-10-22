import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, FileText, Trash2, Download, Upload, Eye, Folder, Award,
  Briefcase, CreditCard, GraduationCap, Shield, AlertCircle, RefreshCw,
} from 'lucide-react';
import { DataTable, Button, Modal, Input, Select, Badge, PageLoader, StatCard, Card } from '../../components/ui';
import { hrApi, api } from '../../services/api';
import { formatDate, cn } from '../../lib/utils';

const DOC_CATEGORIES = [
  'Appointment Letter', 'Employment Contract', 'CV / Resume',
  'Academic Certificate', 'Professional Certification', 'Identity Document',
  'Training Record', 'Disciplinary Record', 'Leave Document',
  'Performance Appraisal', 'Other HR Document',
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Appointment Letter': <Briefcase size={15} />,
  'Employment Contract': <FileText size={15} />,
  'CV / Resume': <FileText size={15} />,
  'Academic Certificate': <GraduationCap size={15} />,
  'Professional Certification': <Award size={15} />,
  'Identity Document': <CreditCard size={15} />,
  'Training Record': <Folder size={15} />,
  'Disciplinary Record': <Shield size={15} />,
  'Leave Document': <FileText size={15} />,
  'Performance Appraisal': <Award size={15} />,
  'Other HR Document': <FileText size={15} />,
};

export default function StaffDocumentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<any>(null);

  const uploadForm = useForm({
    defaultValues: { staffId: '', category: '', title: '', referenceNumber: '', issueDate: '', expiryDate: '' },
  });

  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-for-docs', 1],
    queryFn: () => hrApi.list({ page: 1, limit: 100 }).then(r => r.data),
  });

  // Fetch staff documents (stored as part of staff record or separate — using notifications as fallback)
  // Since there's no dedicated documents table, we store documents as metadata in the staff's profile
  // For now, we use a simple approach: documents are stored as JSON in a field or as uploaded files
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({ name: file.name, type: file.type, size: file.size, data: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const staffId = data.staffId;
      const fileUrl = filePreview?.data || 'data:application/pdf;base64,placeholder';
      return hrApi.addDocument(staffId, {
        title: data.title,
        fileUrl,
        fileType: filePreview?.type || 'application/pdf',
        fileSize: filePreview?.size || 0,
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-for-docs'] });
      setUploadModal(false);
      uploadForm.reset();
      setFilePreview(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to upload document'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async ({ staffId, docId }: { staffId: string; docId: string }) => {
      return hrApi.deleteDocument(staffId, docId);
    },
    onSuccess: () => {
      toast.success('Document removed');
      queryClient.invalidateQueries({ queryKey: ['staff-for-docs'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete document'),
  });

  // Flatten all documents from all staff for the table
  const allDocuments: any[] = [];
  (staffData?.data || []).forEach((staff: any) => {
    const docs = Array.isArray(staff.documents) ? staff.documents : [];
    docs.forEach((doc: any) => {
      allDocuments.push({
        ...doc,
        staffName: `${staff.firstName} ${staff.lastName}`,
        staffId: staff.id,
        staffIdNumber: staff.staffId,
      });
    });
  });

  const filteredDocs = allDocuments.filter(d => {
    if (categoryFilter && d.category !== categoryFilter) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) && !d.staffName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns = [
    {
      key: 'title',
      header: 'Document',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-500">{CATEGORY_ICONS[r.category] || <FileText size={15} />}</div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{r.title}</p>
            <p className="text-xs text-slate-400">{r.category}</p>
          </div>
        </div>
      ),
    },
    { key: 'staffName', header: 'Staff Member', render: (r: any) => (
      <div><p className="text-sm font-medium">{r.staffName}</p><p className="text-xs text-slate-400">{r.staffIdNumber}</p></div>
    )},
    { key: 'reference', header: 'Reference No', render: (r: any) => <span className="text-sm font-mono">{r.referenceNumber || '—'}</span> },
    { key: 'issueDate', header: 'Issue Date', render: (r: any) => <span className="text-sm">{formatDate(r.issueDate)}</span> },
    { key: 'expiry', header: 'Expiry', render: (r: any) => r.expiryDate ? (
      <span className={cn('text-sm', new Date(r.expiryDate) < new Date() ? 'text-red-600 font-semibold' : '')}>{formatDate(r.expiryDate)}</span>
    ) : <span className="text-sm text-slate-400">—</span> },
    {
      key: 'actions', header: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-1">
          {r.fileData && (
            <button onClick={() => {
              const a = document.createElement('a');
              a.href = r.fileData;
              a.download = r.fileName || 'document';
              a.click();
            }} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50" title="Download">
              <Download size={15} />
            </button>
          )}
          <button onClick={() => deleteDocMutation.mutate({ staffId: r.staffId, docId: r.id })}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Folder size={24} /> Staff Document Vault</h1>
          <p className="page-subtitle">Upload, manage, and retrieve staff documents — contracts, certificates, ID copies, and more</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setUploadModal(true)}>Upload Document</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={allDocuments.length} icon={<FileText size={20} />} color="blue" />
        <StatCard title="Staff with Docs" value={new Set(allDocuments.map(d => d.staffId)).size} icon={<Briefcase size={20} />} color="green" />
        <StatCard title="Categories" value={DOC_CATEGORIES.length} icon={<Folder size={20} />} color="purple" />
        <StatCard title="Expiring Soon" value={allDocuments.filter(d => d.expiryDate && new Date(d.expiryDate) < new Date(Date.now() + 30*24*60*60*1000)).length} icon={<AlertCircle size={20} />} color="red" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-56 py-2 text-sm">
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Documents Table */}
      <DataTable
        data={filteredDocs}
        columns={columns}
        onSearch={setSearch}
        searchPlaceholder="Search by document title or staff name..."
        emptyMessage="No documents uploaded yet. Click 'Upload Document' to add staff documents."
      />

      {/* Upload Modal */}
      <Modal open={uploadModal} onClose={() => { setUploadModal(false); setFilePreview(null); }}
        title="Upload Staff Document" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setUploadModal(false); setFilePreview(null); }}>Cancel</Button>
            <Button loading={uploadMutation.isPending}
              onClick={uploadForm.handleSubmit(d => uploadMutation.mutate({ ...d, staffId: selectedStaff }))}>
              Upload Document
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Select label="Staff Member *" {...uploadForm.register('staffId')}
            options={(staffData?.data || []).map((s: any) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.staffId})` }))}
            placeholder="Select staff member" />
          <Select label="Document Category *" {...uploadForm.register('category')}
            options={DOC_CATEGORIES.map(c => ({ value: c, label: c }))}
            placeholder="Select category" />
          <Input label="Document Title *" {...uploadForm.register('title')} placeholder="e.g. Employment Contract 2026" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Reference Number" {...uploadForm.register('referenceNumber')} placeholder="e.g. REF/2026/001" />
            <Input label="Issue Date" type="date" {...uploadForm.register('issueDate')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expiry Date (if applicable)" type="date" {...uploadForm.register('expiryDate')} />
          </div>
          {/* File Upload */}
          <div className="form-group">
            <label className="label">Document File</label>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            <Button type="button" variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>
              {filePreview ? 'Change File' : 'Select File'}
            </Button>
            {filePreview && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                <FileText size={20} className="text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{filePreview.name}</p>
                  <p className="text-xs text-slate-400">{(filePreview.size / 1024).toFixed(0)} KB • {filePreview.type}</p>
                </div>
                <button type="button" onClick={() => setFilePreview(null)} className="ml-auto text-xs text-red-500">Remove</button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">PDF, DOC, or image. Max 5MB.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
