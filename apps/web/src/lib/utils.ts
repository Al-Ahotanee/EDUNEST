import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, fmt = 'MMM dd, yyyy'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green',
    INACTIVE: 'badge-gray',
    PENDING: 'badge-yellow',
    PAID: 'badge-green',
    UNPAID: 'badge-red',
    PARTIAL: 'badge-yellow',
    OVERDUE: 'badge-red',
    APPROVED: 'badge-green',
    REJECTED: 'badge-red',
    PRESENT: 'badge-green',
    ABSENT: 'badge-red',
    LATE: 'badge-yellow',
    EXCUSED: 'badge-blue',
    MALE: 'badge-blue',
    FEMALE: 'badge-purple',
  };
  return map[status] || 'badge-gray';
}

export function truncate(str: string, len = 40): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function getGradeColor(grade: string): string {
  const map: Record<string, string> = {
    'A+': 'text-emerald-600', A: 'text-emerald-500', B: 'text-blue-500',
    C: 'text-amber-500', D: 'text-orange-500', F: 'text-red-500',
  };
  return map[grade] || 'text-slate-600';
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
