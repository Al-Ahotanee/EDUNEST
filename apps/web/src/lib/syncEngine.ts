/**
 * SchoolOS Offline Sync Engine
 * Uses IndexedDB (via Dexie) for local storage + background sync to API
 */

import Dexie, { Table } from 'dexie';

// ─── Local DB Schema ─────────────────────────────────────────────────────────

export interface LocalStudent {
  id: string;
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  status: string;
  _syncStatus: 'synced' | 'pending' | 'failed';
  _updatedAt: number;
}

export interface LocalAttendance {
  id: string;
  studentId: string;
  termId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
  _syncStatus: 'synced' | 'pending' | 'failed';
  _updatedAt: number;
}

export interface LocalResult {
  id: string;
  studentId: string;
  subjectId: string;
  termId: string;
  ca1Score: number;
  ca2Score: number;
  examScore: number;
  totalScore: number;
  grade: string;
  _syncStatus: 'synced' | 'pending' | 'failed';
  _updatedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: number;
}

// ─── Dexie Database ───────────────────────────────────────────────────────────

class SchoolERPLocalDB extends Dexie {
  students!: Table<LocalStudent>;
  attendance!: Table<LocalAttendance>;
  results!: Table<LocalResult>;
  syncQueue!: Table<SyncQueueItem>;
  sessions!: Table<any>;
  classes!: Table<any>;
  subjects!: Table<any>;
  notifications!: Table<any>;
  drafts!: Table<any>;

  constructor() {
    super('SchoolERPLocalDB');
    this.version(1).stores({
      students: 'id, schoolId, admissionNumber, status, _syncStatus',
      attendance: 'id, studentId, termId, date, _syncStatus',
      results: 'id, studentId, subjectId, termId, _syncStatus',
      syncQueue: '++id, entityType, status, createdAt',
      sessions: 'id, schoolId, isCurrent',
      classes: 'id, schoolId',
      subjects: 'id, schoolId',
      notifications: 'id, userId, isRead',
      drafts: 'id, type, createdAt',
    });
  }
}

export const localDB = new SchoolERPLocalDB();

// ─── Connectivity Detection ───────────────────────────────────────────────────

class ConnectivityManager {
  private _isOnline = navigator.onLine;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  get isOnline() { return this._isOnline; }

  private setOnline(status: boolean) {
    this._isOnline = status;
    this.listeners.forEach(fn => fn(status));
    if (status) {
      console.log('🌐 Online — triggering sync');
      syncEngine.syncAll();
    } else {
      console.log('📴 Offline — using local storage');
    }
  }

  onChange(fn: (online: boolean) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }
}

export const connectivity = new ConnectivityManager();

// ─── Sync Engine ─────────────────────────────────────────────────────────────

class SyncEngine {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  constructor() {
    // Auto-sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (connectivity.isOnline) this.syncAll();
    }, 30_000);
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // ─── Queue Operation ───────────────────────────────────────────────────────

  async queueOperation(entityType: string, entityId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) {
    await localDB.syncQueue.add({
      entityType,
      entityId,
      operation,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    });

    if (connectivity.isOnline) {
      this.syncAll();
    }
  }

  // ─── Sync All Pending ──────────────────────────────────────────────────────

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = await localDB.syncQueue
        .where('status').equals('pending')
        .toArray();

      if (pending.length === 0) return;

      console.log(`🔄 Syncing ${pending.length} pending operations...`);

      for (const item of pending) {
        await this.processQueueItem(item);
      }

      const remaining = await localDB.syncQueue.where('status').equals('pending').count();
      if (remaining === 0) {
        console.log('✅ All operations synced successfully');
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processQueueItem(item: SyncQueueItem) {
    await localDB.syncQueue.update(item.id!, { status: 'processing' });

    try {
      const endpoint = this.getEndpoint(item.entityType, item.entityId, item.operation);
      const method = this.getMethod(item.operation);

      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method,
        headers: this.getAuthHeaders(),
        body: method !== 'DELETE' ? JSON.stringify(item.payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      await localDB.syncQueue.update(item.id!, { status: 'completed' });

      // Update local record sync status
      await this.markLocalRecordSynced(item.entityType, item.entityId);

    } catch (err: any) {
      const newRetryCount = item.retryCount + 1;
      const shouldFail = newRetryCount >= 5;

      await localDB.syncQueue.update(item.id!, {
        status: shouldFail ? 'failed' : 'pending',
        retryCount: newRetryCount,
        lastError: err.message,
      });

      if (!shouldFail) {
        console.warn(`Sync retry ${newRetryCount}/5 for ${item.entityType} ${item.entityId}`);
      } else {
        console.error(`Sync permanently failed for ${item.entityType} ${item.entityId}:`, err.message);
      }
    }
  }

  private getEndpoint(entityType: string, entityId: string, operation: string): string {
    const endpoints: Record<string, Record<string, string>> = {
      attendance: {
        CREATE: '/attendance',
        UPDATE: `/attendance/${entityId}`,
        DELETE: `/attendance/${entityId}`,
      },
      result: {
        CREATE: '/results/score',
        UPDATE: `/results/${entityId}`,
        DELETE: `/results/${entityId}`,
      },
      student: {
        CREATE: '/students',
        UPDATE: `/students/${entityId}`,
        DELETE: `/students/${entityId}`,
      },
    };

    return endpoints[entityType]?.[operation] || `/${entityType}s/${entityId}`;
  }

  private getMethod(operation: string): string {
    return { CREATE: 'POST', UPDATE: 'PUT', DELETE: 'DELETE' }[operation] || 'POST';
  }

  private async markLocalRecordSynced(entityType: string, entityId: string) {
    const tables: Record<string, any> = {
      attendance: localDB.attendance,
      result: localDB.results,
      student: localDB.students,
    };
    const table = tables[entityType];
    if (table) {
      await table.update(entityId, { _syncStatus: 'synced' });
    }
  }

  // ─── Attendance Offline ────────────────────────────────────────────────────

  async saveAttendanceOffline(data: Omit<LocalAttendance, '_syncStatus' | '_updatedAt'>) {
    const record: LocalAttendance = {
      ...data,
      _syncStatus: 'pending',
      _updatedAt: Date.now(),
    };

    await localDB.attendance.put(record);
    await this.queueOperation('attendance', data.id, 'CREATE', data);

    return record;
  }

  async saveBulkAttendanceOffline(records: Omit<LocalAttendance, '_syncStatus' | '_updatedAt'>[]) {
    const localRecords = records.map(r => ({
      ...r,
      _syncStatus: 'pending' as const,
      _updatedAt: Date.now(),
    }));

    await localDB.attendance.bulkPut(localRecords);

    for (const record of localRecords) {
      await this.queueOperation('attendance', record.id, 'CREATE', record);
    }

    return localRecords;
  }

  // ─── Results Offline ──────────────────────────────────────────────────────

  async saveResultOffline(data: Omit<LocalResult, '_syncStatus' | '_updatedAt'>) {
    const record: LocalResult = {
      ...data,
      _syncStatus: 'pending',
      _updatedAt: Date.now(),
    };

    await localDB.results.put(record);
    await this.queueOperation('result', data.id, 'CREATE', data);

    return record;
  }

  // ─── Student Offline ──────────────────────────────────────────────────────

  async cacheStudents(students: LocalStudent[]) {
    await localDB.students.bulkPut(
      students.map(s => ({ ...s, _syncStatus: 'synced' as const, _updatedAt: Date.now() }))
    );
  }

  async getLocalStudents(schoolId: string): Promise<LocalStudent[]> {
    return localDB.students.where('schoolId').equals(schoolId).toArray();
  }

  // ─── Sync Status ──────────────────────────────────────────────────────────

  async getSyncStatus() {
    const [pending, failed, completed] = await Promise.all([
      localDB.syncQueue.where('status').equals('pending').count(),
      localDB.syncQueue.where('status').equals('failed').count(),
      localDB.syncQueue.where('status').equals('completed').count(),
    ]);

    return { pending, failed, completed, total: pending + failed + completed };
  }

  async retryFailed() {
    await localDB.syncQueue.where('status').equals('failed').modify({ status: 'pending', retryCount: 0 });
    this.syncAll();
  }

  async clearCompleted() {
    await localDB.syncQueue.where('status').equals('completed').delete();
  }

  destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
  }
}

export const syncEngine = new SyncEngine();

// ─── React Hook for Sync Status ───────────────────────────────────────────────

export function useSyncStatus() {
  const [status, setStatus] = React.useState({
    isOnline: connectivity.isOnline,
    pending: 0,
    failed: 0,
    isSyncing: false,
  });

  React.useEffect(() => {
    const updateStatus = async () => {
      const syncStats = await syncEngine.getSyncStatus();
      setStatus(prev => ({ ...prev, ...syncStats, isOnline: connectivity.isOnline }));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    const unsubscribe = connectivity.onChange(online => {
      setStatus(prev => ({ ...prev, isOnline: online }));
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return status;
}

// Needed for the hook
import React from 'react';
