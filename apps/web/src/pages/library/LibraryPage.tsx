import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Library, Plus, Edit, Trash2, ArrowRightCircle, ArrowLeftCircle, BookOpen, AlertTriangle } from 'lucide-react';
import { DataTable, Button, Modal, Input, Select, StatCard } from '../../components/ui';
import { api } from '../../services/api';
import { formatDate, cn } from '../../lib/utils';

const lapi = {
  books: (p?: any) => api.get('/library/books', { params: p }),
  create: (d: any) => api.post('/library/books', d),
  update: (id: string, d: any) => api.put(`/library/books/${id}`, d),
  delete: (id: string) => api.delete(`/library/books/${id}`),
  categories: () => api.get('/library/books/categories'),
  borrow: (d: any) => api.post('/library/borrow', d),
  return: (id: string) => api.patch(`/library/borrowings/${id}/return`),
  borrowings: (p?: any) => api.get('/library/borrowings', { params: p }),
  stats: () => api.get('/library/stats'),
};

const CATEGORIES = ['Textbooks', 'Reference', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'Language Arts', 'Religious Studies', 'Others'];

export default function LibraryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'books' | 'borrowings'>('books');
  const [bookModal, setBookModal] = useState(false);
  const [borrowModal, setBorrowModal] = useState<any>(null); // book object
  const [returnConfirm, setReturnConfirm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [bPage, setBPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: booksData, isLoading } = useQuery({ queryKey: ['lib-books', page, search, catFilter], queryFn: () => lapi.books({ page, limit: 20, search, category: catFilter }).then(r => r.data), placeholderData: (prev) => prev, enabled: tab === 'books' });
  const { data: borrowingsData, isLoading: bLoading } = useQuery({ queryKey: ['borrowings', bPage, statusFilter], queryFn: () => lapi.borrowings({ page: bPage, limit: 20, status: statusFilter }).then(r => r.data), placeholderData: (prev) => prev, enabled: tab === 'borrowings' });
  const { data: stats } = useQuery({ queryKey: ['lib-stats'], queryFn: () => lapi.stats().then(r => r.data.data) });
  const { data: catsData } = useQuery({ queryKey: ['lib-cats'], queryFn: () => lapi.categories().then(r => r.data.data || []) });

  const bookForm = useForm({ defaultValues: { title: '', author: '', isbn: '', category: '', publisher: '', year: new Date().getFullYear(), copies: 1, shelfNumber: '' } });
  const borrowForm = useForm({ defaultValues: { bookId: '', borrowerType: 'STUDENT', borrowerId: '', dueDate: '' } });

  const bookMut = useMutation({ mutationFn: (d: any) => editing ? lapi.update(editing.id, d) : lapi.create(d), onSuccess: () => { toast.success(editing ? 'Book updated' : 'Book added'); qc.invalidateQueries({ queryKey: ['lib-books'] }); qc.invalidateQueries({ queryKey: ['lib-stats'] }); setBookModal(false); setEditing(null); bookForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const deleteMut = useMutation({ mutationFn: (id: string) => lapi.delete(id), onSuccess: () => { toast.success('Book deleted'); qc.invalidateQueries({ queryKey: ['lib-books'] }); qc.invalidateQueries({ queryKey: ['lib-stats'] }); setDeleteConfirm(null); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const borrowMut = useMutation({ mutationFn: (d: any) => lapi.borrow(d), onSuccess: () => { toast.success('Book issued!'); qc.invalidateQueries({ queryKey: ['lib-books'] }); qc.invalidateQueries({ queryKey: ['borrowings'] }); qc.invalidateQueries({ queryKey: ['lib-stats'] }); setBorrowModal(null); borrowForm.reset(); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const returnMut = useMutation({ mutationFn: (id: string) => lapi.return(id), onSuccess: (res) => { toast.success(res.data.message); qc.invalidateQueries({ queryKey: ['lib-books'] }); qc.invalidateQueries({ queryKey: ['borrowings'] }); qc.invalidateQueries({ queryKey: ['lib-stats'] }); setReturnConfirm(null); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });

  const openEdit = (b: any) => { setEditing(b); bookForm.reset({ title: b.title, author: b.author, isbn: b.isbn || '', category: b.category || '', publisher: b.publisher || '', year: b.year || new Date().getFullYear(), copies: b.copies, shelfNumber: b.shelfNumber || '' }); setBookModal(true); };
  const openBorrow = (book: any) => { setBorrowModal(book); borrowForm.reset({ bookId: book.id, borrowerType: 'STUDENT', borrowerId: '', dueDate: '' }); };

  const bookCols = [
    { key: 'title', header: 'Book', render: (r: any) => <div><p className="font-semibold text-slate-900">{r.title}</p><p className="text-xs text-slate-400">{r.author}</p></div> },
    { key: 'category', header: 'Category', render: (r: any) => r.category ? <span className="badge-blue">{r.category}</span> : <span className="text-slate-400">—</span> },
    { key: 'isbn', header: 'ISBN', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.isbn || '—'}</span> },
    { key: 'shelf', header: 'Shelf', render: (r: any) => <span className="text-sm">{r.shelfNumber || '—'}</span> },
    { key: 'copies', header: 'Total', render: (r: any) => <span className="font-bold">{r.copies}</span> },
    { key: 'available', header: 'Available', render: (r: any) => <span className={cn('font-bold text-lg', r.available === 0 ? 'text-red-500' : 'text-emerald-600')}>{r.available}</span> },
    { key: 'actions', header: '', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={() => openBorrow(r)} disabled={r.available === 0} title="Issue Book" className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 disabled:opacity-30"><ArrowRightCircle size={14} /></button>
        <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50"><Edit size={14} /></button>
        <button onClick={() => setDeleteConfirm(r)} title="Delete" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
      </div>
    ) },
  ];

  const borrowCols = [
    { key: 'book', header: 'Book', render: (r: any) => <div><p className="font-semibold">{r.book?.title}</p><p className="text-xs text-slate-400">{r.book?.author}</p></div> },
    { key: 'borrower', header: 'Borrower', render: (r: any) => <div><p className="text-sm font-medium">{r.borrowerType}</p><p className="text-xs font-mono text-slate-400">{r.borrowerId}</p></div> },
    { key: 'borrowDate', header: 'Issued', render: (r: any) => <span className="text-sm">{formatDate(r.borrowDate)}</span> },
    { key: 'dueDate', header: 'Due Date', render: (r: any) => { const overdue = new Date(r.dueDate) < new Date() && r.status !== 'RETURNED'; return <span className={cn('text-sm', overdue && 'text-red-500 font-bold')}>{formatDate(r.dueDate)}{overdue && ' ⚠️'}</span>; } },
    { key: 'returnDate', header: 'Returned', render: (r: any) => r.returnDate ? <span className="text-sm text-emerald-600">{formatDate(r.returnDate)}</span> : <span className="text-slate-400">—</span> },
    { key: 'fine', header: 'Fine', render: (r: any) => r.fine > 0 ? <span className="text-red-500 font-bold text-sm">₦{r.fine}</span> : <span className="text-slate-400">—</span> },
    { key: 'status', header: 'Status', render: (r: any) => <span className={r.status === 'RETURNED' ? 'badge-green' : r.status === 'OVERDUE' ? 'badge-red' : 'badge-yellow'}>{r.status}</span> },
    { key: 'actions', header: '', render: (r: any) => (r.status === 'BORROWED' || r.status === 'OVERDUE') ? <button onClick={() => setReturnConfirm(r)} className="btn-secondary btn-sm gap-1"><ArrowLeftCircle size={13} />Return</button> : null },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Library Management</h1><p className="page-subtitle">Books catalogue, borrowing and returns</p></div>
        <div className="flex gap-2">
          {tab === 'books' && <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); bookForm.reset(); setBookModal(true); }}>Add Book</Button>}
          {tab === 'borrowings' && <Button icon={<ArrowRightCircle size={16} />} onClick={() => { setBorrowModal({}); borrowForm.reset(); }}>Issue Book</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Books" value={stats?.totalBooks || 0} icon={<BookOpen size={20} />} color="blue" />
        <StatCard title="Total Copies" value={stats?.totalCopies || 0} icon={<Library size={20} />} color="purple" />
        <StatCard title="Available" value={stats?.availableCopies || 0} icon={<BookOpen size={20} />} color="green" />
        <StatCard title="Borrowed" value={stats?.borrowedBooks || 0} icon={<ArrowRightCircle size={20} />} color="amber" />
        <StatCard title="Overdue" value={stats?.overdueBooks || 0} icon={<AlertTriangle size={20} />} color="red" />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['books', 'borrowings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'books' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} className="input w-44 py-2 text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <DataTable data={booksData?.data || []} columns={bookCols} loading={isLoading} onSearch={q => { setSearch(q); setPage(1); }} searchPlaceholder="Search by title, author, ISBN..."
            pagination={booksData?.meta ? { page: booksData.meta.page, limit: booksData.meta.limit, total: booksData.meta.total, totalPages: booksData.meta.totalPages, onPageChange: setPage } : undefined}
            emptyMessage="No books in the library yet." />
        </>
      )}

      {tab === 'borrowings' && (
        <>
          <div className="flex gap-3">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setBPage(1); }} className="input w-36 py-2 text-sm">
              <option value="">All Status</option>
              <option value="BORROWED">Borrowed</option>
              <option value="OVERDUE">Overdue</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
          <DataTable data={borrowingsData?.data || []} columns={borrowCols} loading={bLoading}
            pagination={borrowingsData?.meta ? { page: borrowingsData.meta.page, limit: borrowingsData.meta.limit, total: borrowingsData.meta.total, totalPages: borrowingsData.meta.totalPages, onPageChange: setBPage } : undefined}
            emptyMessage="No borrowing records." />
        </>
      )}

      {/* Add/Edit Book Modal */}
      <Modal open={bookModal} onClose={() => { setBookModal(false); setEditing(null); bookForm.reset(); }} title={editing ? 'Edit Book' : 'Add Book to Library'} size="lg"
        footer={<><Button variant="secondary" onClick={() => { setBookModal(false); setEditing(null); bookForm.reset(); }}>Cancel</Button><Button loading={bookMut.isPending} onClick={bookForm.handleSubmit(d => bookMut.mutate(d))}>{editing ? 'Update Book' : 'Add Book'}</Button></>}>
        <div className="space-y-4">
          <Input label="Book Title *" {...bookForm.register('title', { required: true })} placeholder="e.g. New General Mathematics" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Author *" {...bookForm.register('author', { required: true })} placeholder="Author name" />
            <Input label="ISBN" {...bookForm.register('isbn')} placeholder="ISBN number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" {...bookForm.register('category')} options={[{ value: '', label: '— Select category —' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
            <Input label="Publisher" {...bookForm.register('publisher')} placeholder="Publisher name" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Year Published" type="number" {...bookForm.register('year', { valueAsNumber: true })} />
            <Input label="Number of Copies *" type="number" {...bookForm.register('copies', { valueAsNumber: true, required: true })} min={1} />
            <Input label="Shelf Number" {...bookForm.register('shelfNumber')} placeholder="e.g. A-12, Shelf 3" />
          </div>
        </div>
      </Modal>

      {/* Issue Book Modal */}
      <Modal open={!!borrowModal} onClose={() => { setBorrowModal(null); borrowForm.reset(); }} title="Issue Book to Borrower" size="sm"
        footer={<><Button variant="secondary" onClick={() => { setBorrowModal(null); borrowForm.reset(); }}>Cancel</Button><Button loading={borrowMut.isPending} onClick={borrowForm.handleSubmit(d => borrowMut.mutate(d))}>Issue Book</Button></>}>
        <div className="space-y-4">
          {borrowModal?.id ? (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm"><span className="font-bold text-blue-800">{borrowModal.title}</span><span className="text-blue-600"> ({borrowModal.available} copies available)</span></div>
          ) : (
            <Select label="Book *" {...borrowForm.register('bookId', { required: true })} options={[{ value: '', label: '— Select book —' }, ...(booksData?.data || []).filter((b: any) => b.available > 0).map((b: any) => ({ value: b.id, label: `${b.title} (${b.available} available)` }))]} />
          )}
          <Select label="Borrower Type" {...borrowForm.register('borrowerType')} options={[{ value: 'STUDENT', label: 'Student' }, { value: 'STAFF', label: 'Staff' }]} />
          <Input label="Admission / Staff Number *" {...borrowForm.register('borrowerId', { required: true })} placeholder="Enter ID number" />
          <Input label="Due Date *" type="date" {...borrowForm.register('dueDate', { required: true })} min={new Date().toISOString().split('T')[0]} />
        </div>
      </Modal>

      {/* Return Confirm */}
      <Modal open={!!returnConfirm} onClose={() => setReturnConfirm(null)} title="Return Book" size="sm"
        footer={<><Button variant="secondary" onClick={() => setReturnConfirm(null)}>Cancel</Button><Button loading={returnMut.isPending} onClick={() => returnMut.mutate(returnConfirm.id)}>Confirm Return</Button></>}>
        <div className="space-y-3">
          <p>Confirm return of <strong>"{returnConfirm?.book?.title}"</strong> by borrower <strong>{returnConfirm?.borrowerId}</strong>?</p>
          {returnConfirm && new Date(returnConfirm.dueDate) < new Date() && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-sm text-red-700">
              <AlertTriangle size={14} className="inline mr-1" />
              This book is overdue. A fine of <strong>₦50/day</strong> will be calculated automatically.
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Book" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteConfirm.id)}>Delete</Button></>}>
        <p>Delete <strong>"{deleteConfirm?.title}"</strong>? Books with active borrowings cannot be deleted.</p>
      </Modal>
    </div>
  );
}
