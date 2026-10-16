import React, { forwardRef, useState } from 'react';
import { cn, getStatusBadge } from '../../lib/utils';
import { X, Eye, EyeOff, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Search, Filter, Download } from 'lucide-react';

// ─── BUTTON ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
    };
    const sizes = { sm: 'btn-sm', md: '', lg: 'px-6 py-3 text-base rounded-xl' };

    return (
      <button
        ref={ref}
        className={cn(variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

// ─── INPUT ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, type, className, ...props }, ref) => {
    const [showPass, setShowPass] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className="form-group">
        {label && <label className="label">{label}</label>}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
          )}
          <input
            ref={ref}
            type={isPassword && showPass ? 'text' : type}
            className={cn('input', icon && 'pl-10', error && 'input-error', isPassword && 'pr-10', className)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ─── SELECT ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <select
        ref={ref}
        className={cn('input appearance-none cursor-pointer', error && 'input-error', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  ),
);
Select.displayName = 'Select';

// ─── TEXTAREA ─────────────────────────────────────────────────────────────────

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ label, error, className, ...props }, ref) => (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        rows={3}
        className={cn('input resize-none', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';

// ─── BADGE ────────────────────────────────────────────────────────────────────

export const Badge = ({ status, label }: { status: string; label?: string }) => (
  <span className={getStatusBadge(status)}>{label || status}</span>
);

// ─── SPINNER ──────────────────────────────────────────────────────────────────

export const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <svg className={cn('animate-spin text-blue-600', sizes[size])} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size="lg" />
  </div>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }: ModalProps) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className={cn('modal-content animate-slide-in', sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ─── DATA TABLE ───────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  emptyMessage?: string;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, any>>({
  data, columns, loading, pagination, onSearch, searchPlaceholder = 'Search...', actions, emptyMessage = 'No records found', onSort,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  const handleSearch = debounceSearch((q: string) => {
    setSearch(q);
    onSearch?.(q);
  });

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      {(onSearch || actions) && (
        <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-100">
          {onSearch && (
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 py-2 text-sm"
                placeholder={searchPlaceholder}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : {}}>
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <button onClick={() => handleSort(col.key)} className="text-slate-400 hover:text-slate-600">
                        {sortKey === col.key
                          ? sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          : <ChevronUp size={14} className="opacity-30" />
                        }
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-400">{emptyMessage}</td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key] ?? '—'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => pagination.onPageChange(1)} disabled={pagination.page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ChevronsLeft size={16} />
            </button>
            <button onClick={() => pagination.onPageChange(pagination.page - 1)} disabled={pagination.page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const start = Math.max(1, pagination.page - 2);
              const p = start + i;
              if (p > pagination.totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p)}
                  className={cn('w-8 h-8 rounded-lg text-sm font-medium', p === pagination.page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100')}
                >
                  {p}
                </button>
              );
            })}
            <button onClick={() => pagination.onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => pagination.onPageChange(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function debounceSearch(fn: (q: string) => void) {
  let timer: any;
  return (q: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(q), 350);
  };
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'cyan';
  trend?: { value: number; label: string };
}

export const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend }: StatCardProps) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <div className="stat-card">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-2', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
      <div className={cn('p-3 rounded-xl', colors[color])}>{icon}</div>
    </div>
  );
};

// ─── CARD ─────────────────────────────────────────────────────────────────────

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card', className)} {...props}>{children}</div>
);

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  danger?: boolean;
}

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, loading, danger }: ConfirmProps) => (
  <Modal open={open} onClose={onClose} title={title} size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>Confirm</Button>
      </>
    }
  >
    <p className="text-slate-600">{message}</p>
  </Modal>
);

// ─── AVATAR ───────────────────────────────────────────────────────────────────

export const Avatar = ({ name, photo, size = 'md' }: { name: string; photo?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  if (photo) return <img src={photo} alt={name} className={cn('rounded-full object-cover', sizes[size])} />;
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold text-white', sizes[size], color)}>
      {initials}
    </div>
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

export const EmptyState = ({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-slate-300 mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-slate-500 mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);
