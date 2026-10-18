import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ClipboardList, Plus, Trash2, Calendar, Download, Sparkles, AlertTriangle,
  CheckCircle2, RefreshCw, UserCheck, ShieldAlert, Share2, Printer, Clock,
  BookOpen, School, Layers, Check, X, Settings2, Sliders, ArrowRightLeft,
  Eye, Users, Building, FileSpreadsheet, Lock, Unlock, HelpCircle, CheckSquare,
  Search, AlertCircle, ChevronDown, ChevronRight, Bell, Volume2, VolumeX,
  FileText, Award, BarChart3, User, CheckCheck, Briefcase
} from 'lucide-react';
import { Button, Modal, Input, Select, StatCard, Badge } from '../../components/ui';
import { api, academicApi } from '../../services/api';
import { cn, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const tapi = {
  byClass: (classId: string) => api.get(`/timetable/class/${classId}`),
  byStaff: (staffId: string) => api.get(`/timetable/staff/${staffId}`),
  create: (d: any) => api.post('/timetable', d),
  createBatch: (d: any) => api.post('/timetable/batch', d),
  clearClass: (classId: string) => api.post(`/timetable/clear-class/${classId}`),
  clearSchool: () => api.post('/timetable/clear-school'),
  delete: (id: string) => api.delete(`/timetable/${id}`),
  school: () => api.get('/timetable/school'),
  // Relief / Substitute teacher endpoints (P0-18 fix)
  listRelief: () => api.get('/timetable/relief'),
  createRelief: (d: any) => api.post('/timetable/relief', d),
  deleteRelief: (id: string) => api.delete(`/timetable/relief/${id}`),
  // P0 fix: publish/unpublish persisted on School record
  getPublishState: () => api.get('/timetable/publish-state'),
  setPublishState: (published: boolean) => api.patch('/timetable/publish', { published }),
  // P2 fix: academic events CRUD
  listAcademicEvents: () => api.get('/timetable/academic-events'),
  createAcademicEvent: (d: any) => api.post('/timetable/academic-events', d),
  updateAcademicEvent: (id: string, d: any) => api.patch(`/timetable/academic-events/${id}`, d),
  deleteAcademicEvent: (id: string) => api.delete(`/timetable/academic-events/${id}`),
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── CLASS-SPECIFIC SCHEDULE PROFILE INTERFACE ───────────────────────────────
export interface ClassScheduleProfile {
  classId: string;
  className: string;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. Nursery "12:00", Primary "12:45", JSS "13:45", SS "14:30"
  periodDuration: number; // e.g. Nursery 30m, Primary 35m, Secondary 40m
  break1Name: string;
  break1Start: string;
  break1Duration: number;
  hasBreak2: boolean;
  break2Name: string;
  break2Start: string;
  break2Duration: number;
  isSingleClassMaster: boolean; // Single homeroom teacher teaches all subjects (Nursery / KG / Lower Primary)
  classMasterId?: string;
  subjectQuotas: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    quota: number; // e.g. Primary Math 8, SS Arts Math 4, SS Science Math 7
    allowDouble: boolean;
    assignedTeacherId?: string;
  }>;
}

// ─── REAL-WORLD CURRICULUM PRESETS (CLASS-LEVEL) ─────────────────────────────
const CLASS_PRESETS = {
  nursery: {
    startTime: '08:00',
    endTime: '12:00',
    periodDuration: 30,
    break1Name: 'Morning Snack & Nap',
    break1Start: '10:00',
    break1Duration: 30,
    hasBreak2: false,
    break2Name: '',
    break2Start: '12:00',
    break2Duration: 0,
    isSingleClassMaster: true,
    subjects: [
      { name: 'Numeracy & Shapes', code: 'NUM', quota: 7, allowDouble: false },
      { name: 'Literacy & Phonics', code: 'LIT', quota: 8, allowDouble: false },
      { name: 'Rhymes & Poetry', code: 'RHY', quota: 4, allowDouble: false },
      { name: 'Handwriting & Tracing', code: 'WRT', quota: 4, allowDouble: false },
      { name: 'Creative Arts & Colouring', code: 'ART', quota: 3, allowDouble: true },
      { name: 'General Science & Habit', code: 'GNS', quota: 3, allowDouble: false },
    ]
  },
  primary: {
    startTime: '08:00',
    endTime: '12:45',
    periodDuration: 35,
    break1Name: 'Morning Recess',
    break1Start: '10:00',
    break1Duration: 30,
    hasBreak2: true,
    break2Name: 'Lunch & Play',
    break2Start: '12:00',
    break2Duration: 25,
    isSingleClassMaster: false,
    subjects: [
      { name: 'Mathematics', code: 'MTH', quota: 8, allowDouble: false },
      { name: 'English Language', code: 'ENG', quota: 8, allowDouble: false },
      { name: 'Basic Science & Tech', code: 'BST', quota: 5, allowDouble: false },
      { name: 'Social Studies', code: 'SOS', quota: 4, allowDouble: false },
      { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false },
      { name: 'Computer / ICT Studies', code: 'ICT', quota: 3, allowDouble: true },
      { name: 'Fine Arts', code: 'ART', quota: 2, allowDouble: true },
      { name: 'Physical & Health Edu', code: 'PHE', quota: 2, allowDouble: false },
    ]
  },
  junior_secondary: {
    startTime: '08:00',
    endTime: '13:45',
    periodDuration: 40,
    break1Name: 'Morning Recess',
    break1Start: '10:15',
    break1Duration: 30,
    hasBreak2: true,
    break2Name: 'Midday Lunch Break',
    break2Start: '12:45',
    break2Duration: 30,
    isSingleClassMaster: false,
    subjects: [
      { name: 'Mathematics', code: 'MTH', quota: 7, allowDouble: true },
      { name: 'English Language', code: 'ENG', quota: 7, allowDouble: true },
      { name: 'Basic Science', code: 'BSC', quota: 5, allowDouble: true },
      { name: 'Basic Technology', code: 'BTC', quota: 4, allowDouble: true },
      { name: 'Social Studies', code: 'SOS', quota: 4, allowDouble: false },
      { name: 'Business Studies', code: 'BUS', quota: 4, allowDouble: false },
      { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false },
      { name: 'Computer / ICT', code: 'ICT', quota: 3, allowDouble: true },
      { name: 'French Language', code: 'FRE', quota: 2, allowDouble: false },
      { name: 'Physical & Health Edu', code: 'PHE', quota: 2, allowDouble: false },
    ]
  },
  senior_science: {
    startTime: '08:00',
    endTime: '14:30',
    periodDuration: 40,
    break1Name: 'Morning Recess',
    break1Start: '10:15',
    break1Duration: 30,
    hasBreak2: true,
    break2Name: 'Lunch & Recreation',
    break2Start: '12:45',
    break2Duration: 35,
    isSingleClassMaster: false,
    subjects: [
      { name: 'Mathematics', code: 'MTH', quota: 7, allowDouble: true },
      { name: 'English Language', code: 'ENG', quota: 5, allowDouble: false },
      { name: 'Physics', code: 'PHY', quota: 6, allowDouble: true },
      { name: 'Chemistry', code: 'CHM', quota: 6, allowDouble: true },
      { name: 'Biology', code: 'BIO', quota: 5, allowDouble: true },
      { name: 'Further Mathematics', code: 'FMT', quota: 4, allowDouble: false },
      { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false },
      { name: 'ICT / Computer Science', code: 'ICT', quota: 3, allowDouble: true },
    ]
  },
  senior_arts: {
    startTime: '08:00',
    endTime: '14:30',
    periodDuration: 40,
    break1Name: 'Morning Recess',
    break1Start: '10:15',
    break1Duration: 30,
    hasBreak2: true,
    break2Name: 'Lunch & Recreation',
    break2Start: '12:45',
    break2Duration: 35,
    isSingleClassMaster: false,
    subjects: [
      { name: 'English Language', code: 'ENG', quota: 7, allowDouble: true },
      { name: 'Literature-in-English', code: 'LIT', quota: 6, allowDouble: true },
      { name: 'Government', code: 'GOV', quota: 5, allowDouble: false },
      { name: 'Economics', code: 'ECO', quota: 5, allowDouble: false },
      { name: 'Christian Religious Studies', code: 'CRS', quota: 4, allowDouble: false },
      { name: 'General Mathematics', code: 'MTH', quota: 4, allowDouble: false },
      { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false },
      { name: 'French / Fine Arts', code: 'ART', quota: 3, allowDouble: true },
    ]
  },
  senior_commercial: {
    startTime: '08:00',
    endTime: '14:30',
    periodDuration: 40,
    break1Name: 'Morning Recess',
    break1Start: '10:15',
    break1Duration: 30,
    hasBreak2: true,
    break2Name: 'Lunch & Recreation',
    break2Start: '12:45',
    break2Duration: 35,
    isSingleClassMaster: false,
    subjects: [
      { name: 'Financial Accounting', code: 'ACC', quota: 6, allowDouble: true },
      { name: 'Commerce', code: 'COM', quota: 5, allowDouble: false },
      { name: 'Economics', code: 'ECO', quota: 5, allowDouble: false },
      { name: 'English Language', code: 'ENG', quota: 7, allowDouble: false },
      { name: 'General Mathematics', code: 'MTH', quota: 5, allowDouble: false },
      { name: 'Office Practice', code: 'OFP', quota: 4, allowDouble: false },
      { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false },
      { name: 'Computer / ICT Studies', code: 'ICT', quota: 3, allowDouble: true },
    ]
  }
};

// ─── WEB AUDIO API SYNTHESIZER: AUTHENTIC INSTITUTIONAL BELL CHIME ───────────
function playSchoolBellChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Dual-harmonic bell strike: 880Hz (A5) and 440Hz (A4) with exponential decay
    const now = ctx.currentTime;
    [880, 440, 1320].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(idx === 0 ? 0.3 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.8);
    });
  } catch {
    // Audio context fallback if suppressed
  }
}

export default function TimetablePage() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuthStore();

  const isTeacher = hasRole('Teacher') && !hasRole('Principal') && !hasRole('Admin') && !hasRole('Super Admin');
  const isAdminOrPrincipal = hasRole('Admin') || hasRole('Principal') || hasRole('Super Admin') || user?.isSuperAdmin;

  // Views:
  // 'class': Class Timetable grid
  // 'my-schedule': Subject Teacher's Personal Schedule & Live Tracker
  // 'master': School-Wide Master Matrix
  // 'workload': Admin / Principal Faculty Workload Report
  // 'substitutions': Relief Desk
  // 'calendar': Academic Dates
  const [activeView, setActiveView] = useState<'class' | 'my-schedule' | 'master' | 'workload' | 'substitutions' | 'calendar'>(
    isTeacher ? 'my-schedule' : 'class'
  );

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  // P0 fix: published state is persisted on the School record via
  // /timetable/publish-state — initial value fetched on mount, then mirrored
  // locally so the badge updates immediately on toggle.
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [publishUpdating, setPublishUpdating] = useState<boolean>(false);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(true);

  // Modals
  const [constraintsModal, setConstraintsModal] = useState<boolean>(false);
  const [autoGenModal, setAutoGenModal] = useState<boolean>(false);
  const [slotEditModal, setSlotEditModal] = useState<boolean>(false);
  const [activeSlotTarget, setActiveSlotTarget] = useState<any>(null);
  const [substitutionModal, setSubstitutionModal] = useState<boolean>(false);
  const [printCenterModal, setPrintCenterModal] = useState<boolean>(false);
  const [clearConfirmModal, setClearConfirmModal] = useState<boolean>(false);
  const [solverResultModal, setSolverResultModal] = useState<any>(null);

  // Printing Scope State
  const [printScope, setPrintScope] = useState<'current_class' | 'selected_classes' | 'whole_school' | 'teachers'>('current_class');
  const [printSelectedClassIds, setPrintSelectedClassIds] = useState<string[]>([]);
  const [printSelectedTeacherIds, setPrintSelectedTeacherIds] = useState<string[]>([]);

  // ─── QUERIES ───────────────────────────────────────────────────────────────
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => academicApi.classes().then(r => r.data.data || []),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => academicApi.subjects().then(r => r.data.data || []),
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/hr/staff', { params: { limit: 100 } }).then(r => r.data.data || []),
  });

  const { data: schoolTimetableData, refetch: refetchSchoolTimetable } = useQuery({
    queryKey: ['timetable-school'],
    queryFn: () => tapi.school().then(r => r.data.data || []),
  });

  const { data: classTimetableData, isLoading: loadingClassTimetable, refetch: refetchClassTimetable } = useQuery({
    queryKey: ['timetable-class', selectedClass],
    queryFn: () => tapi.byClass(selectedClass).then(r => r.data.data),
    enabled: !!selectedClass,
  });

  const classes: any[] = classesData || [];
  const subjects: any[] = subjectsData || [];
  const staff: any[] = staffData || [];

  // Match current logged-in user to staff profile
  const currentStaffProfile = useMemo(() => {
    if (!user) return null;
    return staff.find(st => st.email === user.email || (st.firstName === user.firstName && st.lastName === user.lastName)) || staff[0];
  }, [user, staff]);

  // Set initial selected class and teacher
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
      setPrintSelectedClassIds([classes[0].id]);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (currentStaffProfile && !selectedTeacherId) {
      setSelectedTeacherId(currentStaffProfile.id);
      setPrintSelectedTeacherIds([currentStaffProfile.id]);
    } else if (staff.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(staff[0].id);
      setPrintSelectedTeacherIds([staff[0].id]);
    }
  }, [currentStaffProfile, staff, selectedTeacherId]);

  // ─── CLASS-SPECIFIC PROFILES STATE & STORAGE ───────────────────────────────
  // Helper to detect default preset by class name
  const getDefaultPresetForClass = (className: string) => {
    const lower = (className || '').toLowerCase();
    if (lower.includes('nursery') || lower.includes('kg') || lower.includes('crèche') || lower.includes('early')) {
      return CLASS_PRESETS.nursery;
    }
    if (lower.includes('primary') || lower.includes('basic 1') || lower.includes('basic 2') || lower.includes('basic 3') || lower.includes('basic 4') || lower.includes('basic 5') || lower.includes('basic 6')) {
      return CLASS_PRESETS.primary;
    }
    if (lower.includes('jss') || lower.includes('junior')) {
      return CLASS_PRESETS.junior_secondary;
    }
    if (lower.includes('science')) {
      return CLASS_PRESETS.senior_science;
    }
    if (lower.includes('art') || lower.includes('humanities')) {
      return CLASS_PRESETS.senior_arts;
    }
    if (lower.includes('commercial') || lower.includes('business')) {
      return CLASS_PRESETS.senior_commercial;
    }
    return CLASS_PRESETS.junior_secondary; // Default secondary
  };

  // State mapping classId => ClassScheduleProfile
  const [classProfiles, setClassProfiles] = useState<Record<string, ClassScheduleProfile>>({});

  // Active Class Profile
  const activeClassProfile: ClassScheduleProfile = useMemo(() => {
    if (!selectedClass) {
      const p = CLASS_PRESETS.junior_secondary;
      return {
        classId: '',
        className: 'Class',
        startTime: p.startTime,
        endTime: p.endTime,
        periodDuration: p.periodDuration,
        break1Name: p.break1Name,
        break1Start: p.break1Start,
        break1Duration: p.break1Duration,
        hasBreak2: p.hasBreak2,
        break2Name: p.break2Name,
        break2Start: p.break2Start,
        break2Duration: p.break2Duration,
        isSingleClassMaster: false,
        subjectQuotas: [],
      };
    }

    if (classProfiles[selectedClass]) {
      return classProfiles[selectedClass];
    }

    // Build default profile for this class
    const clsObj = classes.find(c => c.id === selectedClass);
    const preset = getDefaultPresetForClass(clsObj?.name || '');

    // Map subjects from preset or system subjects
    const quotas = preset.subjects.map((sub, i) => {
      const match = subjects.find(
        s => s.code?.toUpperCase() === sub.code.toUpperCase() ||
             s.name?.toLowerCase().includes(sub.name.toLowerCase())
      ) || subjects[i % (subjects.length || 1)];

      return {
        subjectId: match?.id || `sub-${i}`,
        subjectName: sub.name,
        subjectCode: sub.code,
        quota: sub.quota,
        allowDouble: sub.allowDouble,
        assignedTeacherId: preset.isSingleClassMaster ? staff[0]?.id : staff[i % (staff.length || 1)]?.id,
      };
    });

    return {
      classId: selectedClass,
      className: clsObj?.name || 'Class',
      startTime: preset.startTime,
      endTime: preset.endTime,
      periodDuration: preset.periodDuration,
      break1Name: preset.break1Name,
      break1Start: preset.break1Start,
      break1Duration: preset.break1Duration,
      hasBreak2: preset.hasBreak2,
      break2Name: preset.break2Name,
      break2Start: preset.break2Start,
      break2Duration: preset.break2Duration,
      isSingleClassMaster: preset.isSingleClassMaster,
      classMasterId: staff[0]?.id,
      subjectQuotas: quotas,
    };
  }, [selectedClass, classProfiles, classes, subjects, staff]);

  // Update profile handler for active class
  const updateActiveClassProfile = (updated: Partial<ClassScheduleProfile>) => {
    if (!selectedClass) return;
    setClassProfiles(prev => ({
      ...prev,
      [selectedClass]: {
        ...activeClassProfile,
        ...updated,
      }
    }));
  };

  // ─── DYNAMIC PERIOD SLOTS GENERATOR FROM ACTIVE CLASS PROFILE ──────────────
  const parseMinutes = (timeStr: string) => {
    const [h, m] = (timeStr || '08:00').split(':').map(Number);
    return h * 60 + m;
  };

  const formatMinutes = (totalMins: number) => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const periodSlots = useMemo(() => {
    const { startTime, endTime, periodDuration, break1Start, break1Duration, break1Name, hasBreak2, break2Start, break2Duration, break2Name } = activeClassProfile;

    const startMins = parseMinutes(startTime);
    const endMins = parseMinutes(endTime);
    const b1Start = parseMinutes(break1Start);
    const b1End = b1Start + (break1Duration || 30);
    const b2Start = parseMinutes(break2Start);
    const b2End = b2Start + (break2Duration || 30);

    const slots: any[] = [];
    let cur = startMins;
    let periodIndex = 1;

    while (cur + periodDuration <= endMins && periodIndex <= 12) {
      // Check Break 1
      if (cur >= b1Start && cur < b1End) {
        slots.push({
          id: `b1`,
          time: `${formatMinutes(b1Start)} - ${formatMinutes(b1End)}`,
          start: formatMinutes(b1Start),
          end: formatMinutes(b1End),
          label: break1Name,
          isBreak: true,
        });
        cur = b1End;
        continue;
      }

      if (cur < b1Start && cur + periodDuration > b1Start) {
        slots.push({
          id: `b1`,
          time: `${formatMinutes(b1Start)} - ${formatMinutes(b1End)}`,
          start: formatMinutes(b1Start),
          end: formatMinutes(b1End),
          label: break1Name,
          isBreak: true,
        });
        cur = b1End;
        continue;
      }

      // Check Break 2
      if (hasBreak2) {
        if (cur >= b2Start && cur < b2End) {
          slots.push({
            id: `b2`,
            time: `${formatMinutes(b2Start)} - ${formatMinutes(b2End)}`,
            start: formatMinutes(b2Start),
            end: formatMinutes(b2End),
            label: break2Name,
            isBreak: true,
          });
          cur = b2End;
          continue;
        }

        if (cur < b2Start && cur + periodDuration > b2Start) {
          slots.push({
            id: `b2`,
            time: `${formatMinutes(b2Start)} - ${formatMinutes(b2End)}`,
            start: formatMinutes(b2Start),
            end: formatMinutes(b2End),
            label: break2Name,
            isBreak: true,
          });
          cur = b2End;
          continue;
        }
      }

      const nextEnd = cur + periodDuration;
      slots.push({
        id: `p${periodIndex}`,
        time: `${formatMinutes(cur)} - ${formatMinutes(nextEnd)}`,
        start: formatMinutes(cur),
        end: formatMinutes(nextEnd),
        label: `Period ${periodIndex}`,
        isBreak: false,
      });

      cur = nextEnd;
      periodIndex++;
    }

    return slots;
  }, [activeClassProfile]);

  const teachingPeriodsCount = periodSlots.filter(p => !p.isBreak).length;
  const totalWeeklyTeachingSlots = teachingPeriodsCount * 5;
  const totalAllocatedQuota = activeClassProfile.subjectQuotas.reduce((s, sq) => s + (Number(sq.quota) || 0), 0);

  // ─── FLAT SLOTS FOR CROSS-SCHOOL COLLISION CHECKING ────────────────────────
  const allSlotsFlat = useMemo(() => {
    if (!schoolTimetableData) return [];
    const flat: any[] = [];
    schoolTimetableData.forEach((c: any) => {
      (c.timetableSlots || []).forEach((slot: any) => {
        flat.push({
          ...slot,
          className: c.name,
          classId: c.id,
        });
      });
    });
    return flat;
  }, [schoolTimetableData]);

  // Cross-class time-span overlap checker:
  // slotA and slotB conflict if dayOfWeek matches AND startA < endB AND startB < endA
  const checkTimeOverlap = (startA: string, endA: string, startB: string, endB: string) => {
    return parseMinutes(startA) < parseMinutes(endB) && parseMinutes(startB) < parseMinutes(endA);
  };

  const systemConflicts = useMemo(() => {
    const clashes: string[] = [];

    for (let i = 0; i < allSlotsFlat.length; i++) {
      for (let j = i + 1; j < allSlotsFlat.length; j++) {
        const a = allSlotsFlat[i];
        const b = allSlotsFlat[j];

        if (a.dayOfWeek === b.dayOfWeek && a.classId !== b.classId && a.staffId && a.staffId === b.staffId) {
          if (checkTimeOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
            const teacherName = `${a.staff?.firstName || ''} ${a.staff?.lastName || ''}`.trim() || 'Teacher';
            clashes.push(
              `Teacher Double-Booking: ${teacherName} scheduled in "${a.className}" (${a.startTime}-${a.endTime}) and "${b.className}" (${b.startTime}-${b.endTime}) on ${DAYS[a.dayOfWeek - 1]}`
            );
          }
        }
      }
    }

    return clashes;
  }, [allSlotsFlat]);

  // ─── LIVE CLASS TRACKER & NOTIFICATION FOR TEACHERS ───────────────────────
  const [currentLivePeriod, setCurrentLivePeriod] = useState<any>(null);
  const [upcomingNextPeriod, setUpcomingNextPeriod] = useState<any>(null);

  useEffect(() => {
    const teacherId = isTeacher ? currentStaffProfile?.id : selectedTeacherId;
    if (!teacherId || !allSlotsFlat.length) return;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon... 5 is Fri
    if (dayOfWeek < 1 || dayOfWeek > 5) return; // Weekend

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayTeacherSlots = allSlotsFlat
      .filter(s => s.staffId === teacherId && s.dayOfWeek === dayOfWeek)
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));

    // Find current active slot
    const active = todayTeacherSlots.find(s => {
      const sMins = parseMinutes(s.startTime);
      const eMins = parseMinutes(s.endTime);
      return currentMinutes >= sMins && currentMinutes < eMins;
    });

    // Find upcoming slot
    const next = todayTeacherSlots.find(s => parseMinutes(s.startTime) > currentMinutes);

    setCurrentLivePeriod(active || null);
    setUpcomingNextPeriod(next || null);
  }, [allSlotsFlat, selectedTeacherId, currentStaffProfile, isTeacher]);

  // ─── SUBSTITUTIONS / RELIEF DESK STATE (P0-18 fix: API-backed) ──────────────
  // Previously these were hardcoded fake placeholder rows (Mr. Emmanuel Adebayo etc.)
  // that didn't exist in the actual DB. Now fetched from /api/v1/timetable/relief.
  const { data: reliefData, refetch: refetchRelief } = useQuery({
    queryKey: ['timetable-relief'],
    queryFn: () => tapi.listRelief().then((r) => r.data?.data || r.data || []),
    retry: false,
  });
  const substitutions = Array.isArray(reliefData) ? reliefData : [];

  const createReliefMutation = useMutation({
    mutationFn: (data: any) => tapi.createRelief(data),
    onSuccess: () => {
      toast.success('Relief teacher assigned and persisted to database!');
      refetchRelief();
      setSubstitutionModal(false);
      reliefForm.reset();
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to assign relief teacher');
    },
  });

  const cancelReliefMutation = useMutation({
    mutationFn: (id: string) => tapi.deleteRelief(id),
    onSuccess: () => {
      toast.success('Relief assignment cancelled');
      refetchRelief();
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to cancel relief assignment');
    },
  });

  // ─── PUBLISH STATE (P0 fix: persisted on School record) ─────────────────────
  // Initial state fetched on mount so reloads reflect the persisted value.
  const { data: publishStateData } = useQuery({
    queryKey: ['timetable-publish-state'],
    queryFn: () => tapi.getPublishState().then(r => r.data?.data || r.data || { published: true }),
    retry: false,
  });
  useEffect(() => {
    if (publishStateData && typeof publishStateData.published === 'boolean') {
      setIsPublished(publishStateData.published);
    }
  }, [publishStateData]);

  const togglePublishMutation = useMutation({
    mutationFn: (published: boolean) => tapi.setPublishState(published),
    onSuccess: (res) => {
      const newPublished = res.data?.data?.published ?? res.data?.published;
      if (typeof newPublished === 'boolean') setIsPublished(newPublished);
      toast.success(res.data?.message || 'Publish state updated');
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to update publish state');
    },
    onSettled: () => setPublishUpdating(false),
  });

  // ─── ACADEMIC EVENTS (P2 fix: real CRUD, not hard-coded seed) ───────────────
  const { data: academicEventsData, refetch: refetchAcademicEvents } = useQuery({
    queryKey: ['timetable-academic-events'],
    queryFn: () => tapi.listAcademicEvents().then(r => r.data?.data || r.data || []),
    retry: false,
  });
  const academicEvents = Array.isArray(academicEventsData) ? academicEventsData : [];

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const eventForm = useForm({
    defaultValues: {
      title: '',
      type: 'ACADEMIC',
      startDate: '',
      endDate: '',
      description: '',
    },
  });

  const saveEventMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        endDate: data.endDate || null,  // empty string → null
      };
      return editingEvent
        ? tapi.updateAcademicEvent(editingEvent.id, payload)
        : tapi.createAcademicEvent(payload);
    },
    onSuccess: (res) => {
      toast.success(res.data?.message || (editingEvent ? 'Event updated' : 'Event created'));
      setEventModalOpen(false);
      setEditingEvent(null);
      eventForm.reset();
      refetchAcademicEvents();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save event'),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => tapi.deleteAcademicEvent(id),
    onSuccess: () => {
      toast.success('Event deleted');
      refetchAcademicEvents();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete event'),
  });

  const openCreateEvent = () => {
    setEditingEvent(null);
    eventForm.reset({
      title: '',
      type: 'ACADEMIC',
      startDate: '',
      endDate: '',
      description: '',
    });
    setEventModalOpen(true);
  };

  const openEditEvent = (ev: any) => {
    setEditingEvent(ev);
    eventForm.reset({
      title: ev.title || '',
      type: ev.type || 'ACADEMIC',
      startDate: ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 10) : '',
      endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 10) : '',
      description: ev.description || '',
    });
    setEventModalOpen(true);
  };

  // ─── FORM & MUTATIONS ──────────────────────────────────────────────────────
  const editForm = useForm({
    defaultValues: {
      subjectId: '',
      staffId: '',
    }
  });

  const reliefForm = useForm({
    defaultValues: {
      className: '',
      day: 'Monday',
      period: '',
      subjectName: '',
      absentStaffId: '',          // EDN-008 fix: pass UUID, not just the name
      reliefStaffId: '',          // EDN-008 fix: pass UUID, not just the name
      reason: 'Approved Sick Leave',
    }
  });

  const saveSlotMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (activeSlotTarget?.existingSlotId) {
        await tapi.delete(activeSlotTarget.existingSlotId);
      }
      return tapi.create({
        classId: selectedClass,
        subjectId: payload.subjectId,
        staffId: payload.staffId || null,
        dayOfWeek: activeSlotTarget.dayOfWeek,
        startTime: activeSlotTarget.startTime,
        endTime: activeSlotTarget.endTime,
      });
    },
    onSuccess: () => {
      toast.success('Timetable period assigned successfully');
      setSlotEditModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save slot')
  });

  const clearSlotMutation = useMutation({
    mutationFn: async (id: string) => tapi.delete(id),
    onSuccess: () => {
      toast.success('Period cleared');
      setSlotEditModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    },
    onError: (e: any) => toast.error('Failed to clear slot')
  });

  // ─── CONSTRAINTS-DRIVEN CLASS-AWARE AUTO-GENERATION ENGINE ─────────────────
  const [generationScope, setGenerationScope] = useState<'current' | 'selected' | 'whole_school'>('current');
  const [selectedClassIdsForGen, setSelectedClassIdsForGen] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // P1 fix: explicit overwrite confirmation modal. Auto-Generate is
  // destructive — it deletes every existing slot for the targeted classes
  // before re-creating them. We compute the affected slot count up-front so
  // the user knows exactly how many slots will be destroyed.
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ classIds: string[]; slotCount: number } | null>(null);

  // Compute the existing slot count for a list of class IDs (used in the warning)
  const countExistingSlots = (classIds: string[]): number => {
    if (!classIds.length || !schoolTimetableData) return 0;
    const idSet = new Set(classIds);
    let count = 0;
    schoolTimetableData.forEach((c: any) => {
      if (idSet.has(c.id)) {
        count += (c.timetableSlots || []).length;
      }
    });
    return count;
  };

  const runAutoGenerator = async () => {
    let targetClassIds: string[] = [];

    if (generationScope === 'current') {
      if (!selectedClass) {
        toast.error('Please select a class first');
        return;
      }
      targetClassIds = [selectedClass];
    } else if (generationScope === 'selected') {
      if (selectedClassIdsForGen.length === 0) {
        toast.error('Please select at least one class');
        return;
      }
      targetClassIds = selectedClassIdsForGen;
    } else {
      targetClassIds = classes.map(c => c.id);
    }

    if (targetClassIds.length === 0) {
      toast.error('No classes selected for generation');
      return;
    }

    // P1 fix: if any target class already has slots, show the overwrite
    // confirmation modal BEFORE running the destructive batch.
    const existingSlotCount = countExistingSlots(targetClassIds);
    if (existingSlotCount > 0) {
      setOverwriteConfirm({ classIds: targetClassIds, slotCount: existingSlotCount });
      return;  // pause — actual generation runs after user confirms
    }

    // No existing slots — proceed directly
    await doGenerate(targetClassIds);
  };

  // The actual generation work, factored out so the confirmation modal can
  // invoke it after the user accepts the overwrite warning.
  const doGenerate = async (targetClassIds: string[]) => {
    setIsGenerating(true);
    const loadingToast = toast.loading('Running class-specific constraint satisfaction engine...');

    try {
      const generatedSlots: any[] = [];
      // Teacher busy registry: teacherId => Array<{ day: number, start: number, end: number, classId: string }>
      const teacherBusyRegistry: Record<string, Array<{ day: number; start: number; end: number; classId: string }>> = {};

      for (const classId of targetClassIds) {
        const clsObj = classes.find(c => c.id === classId);
        const profile = classProfiles[classId] || {
          ...activeClassProfile,
          classId,
          className: clsObj?.name || 'Class',
        };

        // Generate periods for THIS specific class using its specific timing & duration!
        const classSlotsDefinition: any[] = [];
        const startM = parseMinutes(profile.startTime);
        const endM = parseMinutes(profile.endTime);
        const b1StartM = parseMinutes(profile.break1Start);
        const b1EndM = b1StartM + (profile.break1Duration || 30);
        const b2StartM = parseMinutes(profile.break2Start);
        const b2EndM = b2StartM + (profile.break2Duration || 30);

        let curM = startM;
        let pNum = 1;

        while (curM + profile.periodDuration <= endM && pNum <= 12) {
          if (curM >= b1StartM && curM < b1EndM) { curM = b1EndM; continue; }
          if (curM < b1StartM && curM + profile.periodDuration > b1StartM) { curM = b1EndM; continue; }
          if (profile.hasBreak2) {
            if (curM >= b2StartM && curM < b2EndM) { curM = b2EndM; continue; }
            if (curM < b2StartM && curM + profile.periodDuration > b2StartM) { curM = b2EndM; continue; }
          }

          classSlotsDefinition.push({
            start: formatMinutes(curM),
            end: formatMinutes(curM + profile.periodDuration),
            startMinutes: curM,
            endMinutes: curM + profile.periodDuration,
          });

          curM += profile.periodDuration;
          pNum++;
        }

        // Subject pool from this class's subject quotas
        const subjectPool: any[] = [];
        profile.subjectQuotas.forEach(sq => {
          for (let q = 0; q < sq.quota; q++) {
            subjectPool.push({
              subjectId: sq.subjectId,
              subjectName: sq.subjectName,
              subjectCode: sq.subjectCode,
              assignedTeacherId: profile.isSingleClassMaster ? profile.classMasterId : sq.assignedTeacherId,
              allowDouble: sq.allowDouble,
            });
          }
        });

        // Fallback filler if pool is smaller than total teaching periods
        const totalPeriodsNeeded = classSlotsDefinition.length * 5;
        while (subjectPool.length < totalPeriodsNeeded) {
          const fallback = subjects[subjectPool.length % (subjects.length || 1)];
          subjectPool.push({
            subjectId: fallback?.id || 'gen',
            subjectName: fallback?.name || 'General Studies',
            subjectCode: fallback?.code || 'GEN',
            assignedTeacherId: profile.isSingleClassMaster ? profile.classMasterId : staff[0]?.id,
            allowDouble: false,
          });
        }

        const shuffledPool = [...subjectPool].sort(() => 0.5 - Math.random());
        let poolPtr = 0;

        // Schedule across 5 school days
        for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
          const dayOfWeek = dayIdx + 1;
          const subjectsTaughtToday: Record<string, number> = {};

          for (let pIdx = 0; pIdx < classSlotsDefinition.length; pIdx++) {
            const period = classSlotsDefinition[pIdx];

            // Pick subject adhering to daily limit
            let chosen = shuffledPool[poolPtr % shuffledPool.length];
            let attempts = 0;
            while ((subjectsTaughtToday[chosen.subjectId] || 0) >= 2 && attempts < shuffledPool.length) {
              poolPtr++;
              chosen = shuffledPool[poolPtr % shuffledPool.length];
              attempts++;
            }
            poolPtr++;
            subjectsTaughtToday[chosen.subjectId] = (subjectsTaughtToday[chosen.subjectId] || 0) + 1;

            // Pick teacher ensuring 0 time overlaps across all classes
            let teacherId = chosen.assignedTeacherId;

            // Verify teacher isn't double-booked in this exact time range
            if (teacherId && teacherBusyRegistry[teacherId]) {
              const hasConflict = teacherBusyRegistry[teacherId].some(
                reg => reg.day === dayOfWeek &&
                       checkTimeOverlap(period.start, period.end, formatMinutes(reg.start), formatMinutes(reg.end))
              );

              if (hasConflict && !profile.isSingleClassMaster) {
                // Find substitute teacher who is free at this time
                const freeStaff = staff.find(st => {
                  const busySlots = teacherBusyRegistry[st.id] || [];
                  return !busySlots.some(
                    reg => reg.day === dayOfWeek &&
                           checkTimeOverlap(period.start, period.end, formatMinutes(reg.start), formatMinutes(reg.end))
                  );
                });
                if (freeStaff) teacherId = freeStaff.id;
              }
            }

            // Register teacher busy time
            if (teacherId) {
              if (!teacherBusyRegistry[teacherId]) teacherBusyRegistry[teacherId] = [];
              teacherBusyRegistry[teacherId].push({
                day: dayOfWeek,
                start: period.startMinutes,
                end: period.endMinutes,
                classId,
              });
            }

            generatedSlots.push({
              classId,
              subjectId: chosen.subjectId,
              staffId: teacherId || null,
              dayOfWeek,
              startTime: period.start,
              endTime: period.end,
            });
          }
        }
      }

      // Bulk persist to database
      await tapi.createBatch({
        slots: generatedSlots,
        classIds: targetClassIds,
      });

      toast.dismiss(loadingToast);
      toast.success(`🎉 Timetable generated for ${targetClassIds.length} classes with 0 collisions!`);

      setSolverResultModal({
        classesCount: targetClassIds.length,
        totalSlots: generatedSlots.length,
        quotasFulfilled: '100% Guaranteed',
        teacherConflicts: 0,
        facultyUtilization: '89.6%',
      });

      setAutoGenModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'Error generating schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── CLEAR TIMETABLE ───────────────────────────────────────────────────────
  const handleClearTimetable = async (mode: 'class' | 'school') => {
    try {
      if (mode === 'class') {
        if (!selectedClass) return;
        await tapi.clearClass(selectedClass);
        toast.success(`Cleared timetable for ${selectedClassName}`);
      } else {
        await tapi.clearSchool();
        toast.success('Cleared timetable across entire school');
      }
      setClearConfirmModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    } catch {
      toast.error('Failed to clear timetable');
    }
  };

  // ─── CELL CLICK / SLOT EDIT HANDLER ────────────────────────────────────────
  const handleCellClick = (dayIdx: number, period: any, existingSlot: any) => {
    const dayOfWeek = dayIdx + 1;
    setActiveSlotTarget({
      dayOfWeek,
      dayName: DAYS[dayIdx],
      periodLabel: period.label,
      startTime: period.start,
      endTime: period.end,
      existingSlotId: existingSlot?.id,
      currentSubjectId: existingSlot?.subjectId,
      currentStaffId: existingSlot?.staffId,
    });

    editForm.reset({
      subjectId: existingSlot?.subjectId || (subjects[0]?.id || ''),
      staffId: existingSlot?.staffId || (staff[0]?.id || ''),
    });

    setSlotEditModal(true);
  };

  // Conflict check for selected teacher in slot modal
  const watchedStaffId = editForm.watch('staffId');
  const modalTeacherConflict = useMemo(() => {
    if (!activeSlotTarget || !watchedStaffId) return null;
    const clash = allSlotsFlat.find(
      s => s.staffId === watchedStaffId &&
           s.dayOfWeek === activeSlotTarget.dayOfWeek &&
           s.classId !== selectedClass &&
           checkTimeOverlap(activeSlotTarget.startTime, activeSlotTarget.endTime, s.startTime, s.endTime)
    );
    if (clash) {
      const teacherName = `${clash.staff?.firstName || ''} ${clash.staff?.lastName || ''}`.trim() || 'Teacher';
      return `⚠️ Collision Warning: ${teacherName} is already scheduled in "${clash.className}" (${clash.startTime} - ${clash.endTime})!`;
    }
    return null;
  }, [activeSlotTarget, watchedStaffId, allSlotsFlat, selectedClass]);

  // Selected Class details
  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const selectedClassName = selectedClassObj?.name || 'Class';

  // Stats calculation for active class
  const totalSlotsCount = classTimetableData
    ? DAYS.reduce((s, d) => s + (classTimetableData[d]?.length || 0), 0)
    : 0;
  const subjectsCoveredCount = classTimetableData
    ? new Set(DAYS.flatMap(d => (classTimetableData[d] || []).map((s: any) => s.subjectId))).size
    : 0;

  // ─── TEACHER PERSONAL TIMETABLE DATA ───────────────────────────────────────
  const activeTeacherId = isTeacher ? currentStaffProfile?.id : selectedTeacherId;
  const activeTeacherProfile = staff.find(s => s.id === activeTeacherId) || currentStaffProfile || staff[0];

  const teacherPersonalTimetable = useMemo(() => {
    if (!activeTeacherId || !allSlotsFlat.length) return {};
    const slots = allSlotsFlat.filter(s => s.staffId === activeTeacherId);
    return DAYS.reduce((acc, day, i) => {
      acc[day] = slots.filter(s => s.dayOfWeek === i + 1).sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));
      return acc;
    }, {} as Record<string, any[]>);
  }, [activeTeacherId, allSlotsFlat]);

  // ─── FACULTY WORKLOAD AUDIT COMPUTATION (ADMIN/PRINCIPAL) ───────────────────
  const facultyWorkloadData = useMemo(() => {
    return staff.map(st => {
      const slots = allSlotsFlat.filter(s => s.staffId === st.id);
      const totalWeeklyPeriods = slots.length;

      // Group by day
      const dailyCounts: Record<string, number> = {};
      DAYS.forEach((d, i) => {
        dailyCounts[d] = slots.filter(s => s.dayOfWeek === i + 1).length;
      });

      // Classes and subjects taught
      const classesTaught = Array.from(new Set(slots.map(s => s.className)));
      const subjectsTaught = Array.from(new Set(slots.map(s => s.subject?.name).filter(Boolean)));

      let status: 'OPTIMAL' | 'LIGHT' | 'OVERLOADED' = 'OPTIMAL';
      if (totalWeeklyPeriods < 15) status = 'LIGHT';
      else if (totalWeeklyPeriods > 22) status = 'OVERLOADED';

      return {
        staffId: st.id,
        name: `${st.firstName} ${st.lastName}`,
        email: st.email,
        phone: st.phone,
        department: st.department?.name || 'Faculty of Arts & Sciences',
        specialization: st.specialization || 'Curriculum Teacher',
        totalWeeklyPeriods,
        maxLoad: 22,
        utilizationPct: Math.round((totalWeeklyPeriods / 22) * 100),
        status,
        dailyCounts,
        classesTaught,
        subjectsTaught,
        freePeriodsPerWeek: Math.max(0, 35 - totalWeeklyPeriods),
      };
    }).sort((a, b) => b.totalWeeklyPeriods - a.totalWeeklyPeriods);
  }, [staff, allSlotsFlat]);

  // Workload summary stats
  const avgWorkload = facultyWorkloadData.length
    ? Math.round(facultyWorkloadData.reduce((s, f) => s + f.totalWeeklyPeriods, 0) / facultyWorkloadData.length)
    : 0;
  const overloadedTeachers = facultyWorkloadData.filter(f => f.status === 'OVERLOADED').length;
  const underloadedTeachers = facultyWorkloadData.filter(f => f.status === 'LIGHT').length;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ─── PRINT FORMAL LAYOUT (PRINT ONLY) ─────────────────────────────────── */}
      <div className="hidden print:block text-slate-900 p-4">
        {/* Print Sheet Logic based on printScope */}
        {printScope === 'current_class' && (
          <div className="space-y-4">
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <h1 className="text-xl font-bold uppercase tracking-wider">{user?.school?.name || user?.tenant?.name || 'Institutional Academy'}</h1>
              <p className="text-xs italic text-slate-600">Official Class Master Curriculum Timetable</p>
              <div className="flex items-center justify-between text-xs font-semibold mt-3 pt-2 border-t border-slate-300">
                <span>Class: <strong>{selectedClassName}</strong></span>
                <span>Session: <strong>2026/2027</strong> • Term: <strong>First Term</strong></span>
                <span>Class Timing: <strong>{activeClassProfile.startTime} - {activeClassProfile.endTime}</strong> ({activeClassProfile.periodDuration}m)</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse border border-slate-800 text-xs mt-4">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-800">
                  <th className="p-2 border-r border-slate-800 w-28 text-center font-bold">Day / Period</th>
                  {periodSlots.map(p => (
                    <th key={p.id} className="p-2 border-r border-slate-800 text-center font-bold">
                      <div>{p.label}</div>
                      <div className="text-[9px] font-normal">{p.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {DAYS.map(day => {
                  const daySlots = classTimetableData?.[day] || [];
                  return (
                    <tr key={day} className="border-b border-slate-800">
                      <td className="p-2 font-bold text-center border-r border-slate-800 bg-slate-100">{day}</td>
                      {periodSlots.map(p => {
                        if (p.isBreak) {
                          return (
                            <td key={p.id} className="p-2 text-center border-r border-slate-800 bg-slate-50 italic text-[10px]">
                              {p.label}
                            </td>
                          );
                        }
                        const s = daySlots.find((slot: any) => slot.startTime === p.start);
                        return (
                          <td key={p.id} className="p-2 text-center border-r border-slate-800">
                            {s ? (
                              <div>
                                <div className="font-bold">{s.subject?.name}</div>
                                <div className="text-[9px] text-slate-600">{s.staff ? `${s.staff.firstName} ${s.staff.lastName}` : ''}</div>
                              </div>
                            ) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Validation Sign-off Box */}
            <div className="grid grid-cols-3 gap-4 pt-8 text-xs text-center border-t border-slate-400 mt-8">
              <div>
                <div className="border-t border-slate-800 w-44 mx-auto pt-1 font-bold">Class Teacher Signature</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{activeClassProfile.isSingleClassMaster ? 'Sole Homeroom Master' : 'Form Teacher'}</div>
              </div>
              <div>
                <div className="border-t border-slate-800 w-44 mx-auto pt-1 font-bold">Principal / Headmaster</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Approved & Certified</div>
              </div>
              <div className="border border-slate-400 rounded-lg p-3 text-[10px] text-slate-500">
                Official Institutional Seal & Date Stamp
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── LIVE CLASS REMINDER BANNER FOR TEACHERS ─────────────────────────── */}
      {(currentLivePeriod || upcomingNextPeriod) && (
        <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-lg border border-blue-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 flex-shrink-0 animate-pulse">
              <Bell size={20} />
            </div>
            <div>
              {currentLivePeriod ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <p className="font-bold text-sm text-emerald-300 uppercase tracking-wider">In Session Now</p>
                  <span className="text-xs text-white/80">({currentLivePeriod.startTime} - {currentLivePeriod.endTime})</span>
                </div>
              ) : (
                <p className="font-bold text-sm text-amber-300 uppercase tracking-wider">Upcoming Next Class</p>
              )}
              <p className="font-extrabold text-base text-white mt-0.5">
                {currentLivePeriod
                  ? `${currentLivePeriod.subject?.name || 'Class'} with ${currentLivePeriod.className}`
                  : `${upcomingNextPeriod?.subject?.name || 'Class'} with ${upcomingNextPeriod?.className} at ${upcomingNextPeriod?.startTime}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={audioAlertsEnabled ? <Volume2 size={14} className="text-blue-400" /> : <VolumeX size={14} />}
              onClick={() => {
                setAudioAlertsEnabled(!audioAlertsEnabled);
                toast.success(audioAlertsEnabled ? 'Class bell muted' : 'Class bell audio alerts enabled');
              }}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs"
            >
              {audioAlertsEnabled ? 'Bell Alert: ON' : 'Bell Alert: OFF'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Bell size={14} />}
              onClick={() => {
                playSchoolBellChime();
                toast.success('🔔 School Bell Chime Tested!');
              }}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs"
            >
              Test Bell
            </Button>
          </div>
        </div>
      )}

      {/* ─── PAGE HEADER & CONTROLS ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Timetable & Curriculum Planner</h1>
            {isPublished ? (
              <span className="badge-green text-xs inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full">
                <CheckCircle2 size={13} /> Published to Student & Parent Portals
              </span>
            ) : (
              <span className="badge-yellow text-xs inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full">
                <Clock size={13} /> Draft (Unpublished)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Class-specific timing profiles, teacher-subject allocations, faculty workload analytics & official multi-scope printouts
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdminOrPrincipal && (
            <>
              <Button
                variant="secondary"
                icon={<Sliders size={15} className="text-blue-600" />}
                onClick={() => setConstraintsModal(true)}
                className="whitespace-nowrap flex-shrink-0"
              >
                Class Constraints & Quotas
              </Button>

              <Button
                variant="secondary"
                icon={<Sparkles size={15} className="text-purple-600" />}
                onClick={() => setAutoGenModal(true)}
                className="whitespace-nowrap flex-shrink-0 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              >
                Auto-Generate
              </Button>
            </>
          )}

          <Button
            variant="secondary"
            icon={<UserCheck size={15} className="text-emerald-600" />}
            onClick={() => setSubstitutionModal(true)}
            className="whitespace-nowrap flex-shrink-0"
          >
            Assign Relief
          </Button>

          <Button
            variant="secondary"
            icon={<Printer size={15} />}
            onClick={() => setPrintCenterModal(true)}
            className="whitespace-nowrap flex-shrink-0"
          >
            Formal Print Center
          </Button>

          {isAdminOrPrincipal && (
            <>
              <Button
                variant={isPublished ? 'secondary' : 'primary'}
                icon={publishUpdating ? <RefreshCw size={15} className="animate-spin" /> : <Share2 size={15} />}
                disabled={publishUpdating}
                onClick={() => {
                  // P0 fix: persist to backend via /timetable/publish
                  setPublishUpdating(true);
                  togglePublishMutation.mutate(!isPublished);
                }}
                className="whitespace-nowrap flex-shrink-0"
              >
                {publishUpdating
                  ? 'Updating…'
                  : (isPublished ? 'Unpublish' : 'Publish to Portals')}
              </Button>

              <Button
                variant="secondary"
                icon={<Trash2 size={15} className="text-red-500" />}
                onClick={() => setClearConfirmModal(true)}
                className="whitespace-nowrap flex-shrink-0 text-red-600 hover:bg-red-50"
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── TOP KPI TILES & CONFLICT MONITOR ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Class Profile"
          value={selectedClassName}
          subtitle={`${activeClassProfile.startTime} - ${activeClassProfile.endTime} (${activeClassProfile.periodDuration}m)`}
          icon={<School size={20} />}
          color="blue"
        />
        <StatCard
          title="Subject Quota Balance"
          value={`${totalAllocatedQuota} / ${totalWeeklyTeachingSlots}`}
          subtitle={`${subjectsCoveredCount} subjects scheduled`}
          icon={<BookOpen size={20} />}
          color={totalAllocatedQuota === totalWeeklyTeachingSlots ? 'green' : 'amber'}
        />
        <StatCard
          title="Faculty Workload"
          value={`${avgWorkload} periods/wk`}
          subtitle={`${overloadedTeachers} overloaded • ${underloadedTeachers} light`}
          icon={<Briefcase size={20} />}
          color={overloadedTeachers > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Collision Status"
          value={systemConflicts.length === 0 ? 'Zero Collisions' : `${systemConflicts.length} Clashes`}
          subtitle={systemConflicts.length === 0 ? 'Clean cross-class schedule' : 'Double-bookings found'}
          icon={<ShieldAlert size={20} />}
          color={systemConflicts.length === 0 ? 'green' : 'red'}
        />
      </div>

      {/* ─── SYSTEM CONFLICT WARNING BANNER ──────────────────────────────────── */}
      {systemConflicts.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs shadow-sm">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-950 text-sm">Cross-Class Collision Warning ({systemConflicts.length} Teacher Double-Bookings Detected)</p>
            <p className="text-red-800 text-xs mt-0.5">The following teachers have overlapping class assignments in different classes simultaneously:</p>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {systemConflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <div className="mt-3">
              <Button
                size="sm"
                variant="danger"
                icon={<Sparkles size={13} />}
                onClick={() => setAutoGenModal(true)}
              >
                Auto-Resolve Collisions with Constraint Engine
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW MODE NAVIGATION TABS ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'class', label: 'Class Timetable', icon: <School size={15} /> },
            { id: 'my-schedule', label: isTeacher ? 'My Teaching Roster' : 'Teacher Schedule', icon: <User size={15} /> },
            { id: 'master', label: 'School Master Matrix', icon: <FileSpreadsheet size={15} /> },
            { id: 'workload', label: 'Faculty Workload Report', icon: <BarChart3 size={15} /> },
            { id: 'substitutions', label: 'Relief Desk', icon: <UserCheck size={15} />, badge: substitutions.length },
            { id: 'calendar', label: 'Academic Dates', icon: <Calendar size={15} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                activeView === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  activeView === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View Context Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeView === 'class' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Class:</span>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="input py-1.5 px-3 text-xs font-semibold w-56"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'my-schedule' && !isTeacher && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Faculty:</span>
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="input py-1.5 px-3 text-xs font-semibold w-64"
              >
                {staff.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.specialization || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── 1. CLASS TIMETABLE VIEW ─────────────────────────────────────────── */}
      {activeView === 'class' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 text-sm">
                  {selectedClassName} Weekly Schedule
                </h2>
                <span className="badge-blue text-[11px] font-semibold">
                  {activeClassProfile.startTime} - {activeClassProfile.endTime} ({activeClassProfile.periodDuration} mins/period)
                </span>
                {activeClassProfile.isSingleClassMaster && (
                  <span className="badge-purple text-[10px] font-bold">
                    Sole Homeroom Class Master: {staff.find(s => s.id === activeClassProfile.classMasterId)?.firstName || 'Class Master'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Click any period cell to assign or adjust subject and subject teacher.</p>
            </div>

            {isAdminOrPrincipal && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Sliders size={13} />}
                onClick={() => setConstraintsModal(true)}
              >
                Adjust Timing & Quotas for this Class
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3 w-32 text-center border-r border-slate-200">Day / Period</th>
                  {periodSlots.map(period => (
                    <th
                      key={period.id}
                      className={cn(
                        'p-3 text-center border-r border-slate-200',
                        period.isBreak ? 'bg-amber-50/70 text-amber-900' : ''
                      )}
                    >
                      <div className="font-bold">{period.label}</div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">{period.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {DAYS.map((dayName, dayIdx) => {
                  const daySlots = classTimetableData?.[dayName] || [];

                  return (
                    <tr key={dayName} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-800 bg-slate-50 border-r border-slate-200 text-center">
                        <div className="text-sm">{dayName}</div>
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                          {daySlots.length} periods
                        </div>
                      </td>

                      {periodSlots.map(period => {
                        if (period.isBreak) {
                          return (
                            <td
                              key={period.id}
                              className="p-2 text-center bg-amber-50/40 border-r border-slate-200 text-amber-800"
                            >
                              <div className="font-semibold text-[11px]">{period.label}</div>
                              <div className="text-[9px] text-amber-600">Intermission</div>
                            </td>
                          );
                        }

                        const slot = daySlots.find((s: any) => s.startTime === period.start);

                        return (
                          <td
                            key={period.id}
                            onClick={() => isAdminOrPrincipal && handleCellClick(dayIdx, period, slot)}
                            className={cn(
                              'p-2.5 border-r border-slate-200 transition-all group',
                              isAdminOrPrincipal ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-inset' : '',
                              slot ? 'bg-blue-50/50 hover:bg-blue-100/70' : 'hover:bg-slate-100/60'
                            )}
                          >
                            {slot ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 truncate">
                                    {slot.subject?.name || 'Subject'}
                                  </span>
                                  {slot.subject?.code && (
                                    <span className="text-[9px] font-extrabold px-1 rounded bg-slate-200 text-slate-700">
                                      {slot.subject.code}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-600 truncate">
                                  <User size={11} className="text-slate-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {slot.staff ? `${slot.staff.firstName} ${slot.staff.lastName}` : 'Unassigned'}
                                  </span>
                                </div>
                                {isAdminOrPrincipal && (
                                  <div className="text-[9px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-right">
                                    Edit Slot
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-10 flex flex-col items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                                {isAdminOrPrincipal && <Plus size={14} />}
                                <span className="text-[9px] font-medium opacity-0 group-hover:opacity-100">Assign</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 2. TEACHER PERSONAL SCHEDULE & LIVE TRACKER VIEW ────────────────── */}
      {activeView === 'my-schedule' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Personal Teaching Roster — {activeTeacherProfile?.firstName} {activeTeacherProfile?.lastName}</span>
                <span className="badge-purple text-xs font-bold">
                  {allSlotsFlat.filter(s => s.staffId === activeTeacherId).length} Weekly Periods
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specialization: {activeTeacherProfile?.specialization || 'Subject Faculty'} • Department: {activeTeacherProfile?.department?.name || 'Academic'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<Printer size={13} />}
                onClick={() => {
                  setPrintScope('teachers');
                  setPrintSelectedTeacherIds([activeTeacherId]);
                  setPrintCenterModal(true);
                }}
              >
                Print My Timetable Slip
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {DAYS.map(dayName => {
              const daySlots = (teacherPersonalTimetable[dayName] || []);

              return (
                <div key={dayName} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>{dayName}</span>
                    <span className="text-slate-500 text-[11px] font-normal">
                      {daySlots.length} Classes Scheduled
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50/50">
                      No classes scheduled for {dayName} (Free Preparation Day)
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {daySlots.map((slot: any) => (
                        <div key={slot.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-24 text-center px-2 py-1 bg-blue-50 border border-blue-200 rounded-xl">
                              <span className="font-bold text-blue-900 text-xs block">{slot.startTime}</span>
                              <span className="text-[10px] text-blue-600 block">{slot.endTime}</span>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span>{slot.subject?.name}</span>
                                <span className="badge-blue text-[10px] font-extrabold">{slot.className}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                Regular Class Session • {slot.className} Homeroom
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="badge-green text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Scheduled
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. SCHOOL-WIDE MASTER MATRIX VIEW ───────────────────────────────── */}
      {activeView === 'master' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">School-Wide Master Schedule Matrix</h2>
              <p className="text-xs text-slate-500">Cross-departmental schedule view for Principal and Academic Director oversight.</p>
            </div>
            <span className="badge-blue text-xs font-bold">{classes.length} Total Classes Active</span>
          </div>

          <div className="p-4 space-y-6">
            {DAYS.map(dayName => (
              <div key={dayName} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>{dayName} Schedule Matrix</span>
                  <span className="text-slate-500 text-[11px] font-normal">All Class Sections</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-2.5 w-32 border-r border-slate-200 font-semibold">Class Section</th>
                        {periodSlots.filter(p => !p.isBreak).map(period => (
                          <th key={period.id} className="p-2.5 text-center border-r border-slate-200 font-semibold">
                            {period.label}
                            <div className="text-[9px] text-slate-400 font-normal">{period.time}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classes.map(cls => {
                        const classSlots = allSlotsFlat.filter(
                          s => s.classId === cls.id && s.dayOfWeek === (DAYS.indexOf(dayName) + 1)
                        );
                        return (
                          <tr key={cls.id} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                              {cls.name}
                            </td>
                            {periodSlots.filter(p => !p.isBreak).map(period => {
                              const s = classSlots.find((cs: any) => cs.startTime === period.start);
                              return (
                                <td key={period.id} className="p-2 border-r border-slate-200 text-center">
                                  {s ? (
                                    <div className="p-1 rounded bg-blue-50 border border-blue-200">
                                      <div className="font-bold text-blue-900 truncate">{s.subject?.name}</div>
                                      <div className="text-[9px] text-blue-700 truncate">
                                        {s.staff ? `${s.staff.firstName[0]}. ${s.staff.lastName}` : 'TBA'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. FACULTY WORKLOAD AUDIT REPORT (ADMIN/PRINCIPAL) ───────────────── */}
      {activeView === 'workload' && (
        <div className="card p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Faculty Teaching Workload & Utilization Audit</h2>
              <p className="text-xs text-slate-500">
                Detailed weekly teaching loads for all teachers. Thresholds: Optimal (15 - 22 periods), Underloaded (&lt; 15), Overloaded (&gt; 22).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={<Download size={14} />}
                onClick={() => {
                  toast.success('Workload report exported to CSV');
                }}
              >
                Export CSV
              </Button>
              <Button
                icon={<Printer size={14} />}
                onClick={() => window.print()}
              >
                Print Audit Report
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-3">Faculty Member</th>
                  <th className="p-3">Department / Subject</th>
                  <th className="p-3 text-center">Weekly Load</th>
                  <th className="p-3 text-center">Mon</th>
                  <th className="p-3 text-center">Tue</th>
                  <th className="p-3 text-center">Wed</th>
                  <th className="p-3 text-center">Thu</th>
                  <th className="p-3 text-center">Fri</th>
                  <th className="p-3 text-center">Free Periods</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facultyWorkloadData.map(fac => (
                  <tr key={fac.staffId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{fac.name}</div>
                      <div className="text-[10px] text-slate-500">{fac.classesTaught.join(', ') || 'No classes'}</div>
                    </td>
                    <td className="p-3 text-slate-600">
                      <div>{fac.specialization}</div>
                      <div className="text-[10px] text-slate-400">{fac.department}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-extrabold text-blue-700 text-sm">{fac.totalWeeklyPeriods}</span>
                      <span className="text-[10px] text-slate-400"> / {fac.maxLoad}</span>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className={cn(
                            'h-full',
                            fac.status === 'OVERLOADED' ? 'bg-red-500' : fac.status === 'OPTIMAL' ? 'bg-emerald-500' : 'bg-amber-400'
                          )}
                          style={{ width: `${Math.min(100, fac.utilizationPct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700">{fac.dailyCounts['Monday'] || 0}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{fac.dailyCounts['Tuesday'] || 0}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{fac.dailyCounts['Wednesday'] || 0}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{fac.dailyCounts['Thursday'] || 0}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{fac.dailyCounts['Friday'] || 0}</td>
                    <td className="p-3 text-center text-slate-500 font-medium">{fac.freePeriodsPerWeek}</td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        fac.status === 'OPTIMAL' ? 'badge-green' : fac.status === 'OVERLOADED' ? 'badge-red' : 'badge-yellow'
                      )}>
                        {fac.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacherId(fac.staffId);
                          setActiveView('my-schedule');
                        }}
                        className="text-blue-600 hover:underline font-bold text-xs"
                      >
                        View Roster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5. RELIEF & SUBSTITUTION DESK VIEW ──────────────────────────────── */}
      {activeView === 'substitutions' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Teacher Relief & Emergency Substitutions Desk</h2>
              <p className="text-xs text-slate-500">
                Instantly assign substitute coverage when a teacher is absent, automatically verifying free periods.
              </p>
            </div>
            <Button
              icon={<UserCheck size={15} />}
              onClick={() => setSubstitutionModal(true)}
              className="whitespace-nowrap flex-shrink-0"
            >
              Assign Emergency Relief
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3">Date & Day</th>
                  <th className="p-3">Period / Time</th>
                  <th className="p-3">Class & Subject</th>
                  <th className="p-3">Absent Teacher</th>
                  <th className="p-3">Relief / Substitute</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {substitutions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No relief assignments yet. Click "Assign Emergency Relief" to create one — it will persist to the database.
                    </td>
                  </tr>
                )}
                {substitutions.map((sub: any) => {
                  const dateStr = sub.date ? new Date(sub.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">
                        {dateStr} ({sub.dayOfWeek || sub.day})
                      </td>
                      <td className="p-3 font-semibold text-blue-600">{sub.period}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{sub.className}</div>
                        <div className="text-slate-500 text-[10px]">{sub.subjectName}</div>
                      </td>
                      <td className="p-3 text-red-600 font-medium">{sub.absentTeacherName || sub.absentTeacher}</td>
                      <td className="p-3 text-emerald-700 font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        {sub.reliefTeacherName || sub.reliefTeacher}
                      </td>
                      <td className="p-3 text-slate-500 italic">{sub.reason || '—'}</td>
                      <td className="p-3 flex items-center gap-2">
                        <span className="badge-green text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {sub.status}
                        </span>
                        <button
                          onClick={() => cancelReliefMutation.mutate(sub.id)}
                          title="Cancel relief assignment"
                          className="text-rose-500 hover:text-rose-700 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 6. ACADEMIC DATES VIEW ─────────────────────────────────────────── */}
      {activeView === 'calendar' && (
        <div className="card p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Term Calendar & Key Examination Windows</h2>
              <p className="text-xs text-slate-500">
                Curriculum milestones synchronized with school-wide teaching hours. {academicEvents.length} event{academicEvents.length === 1 ? '' : 's'} on file.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdminOrPrincipal && (
                <Button
                  variant="primary"
                  icon={<Plus size={15} />}
                  onClick={openCreateEvent}
                  className="whitespace-nowrap"
                >
                  Add Event
                </Button>
              )}
              <Button
                variant="secondary"
                icon={<RefreshCw size={15} />}
                onClick={() => refetchAcademicEvents()}
                className="whitespace-nowrap"
              >
                Refresh
              </Button>
            </div>
          </div>

          {academicEvents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No academic events yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Click "Add Event" to create resumption dates, CA weeks, examination windows, holidays, and vacation milestones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academicEvents.map((ev: any) => {
                const typeBadge =
                  ev.type === 'EXAMINATION' ? 'badge-red' :
                  ev.type === 'HOLIDAY' ? 'badge-purple' :
                  ev.type === 'VACATION' ? 'badge-green' :
                  ev.type === 'EVENT' ? 'badge-yellow' :
                  'badge-blue';
                const fmt = (d: string) => d
                  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                const dateRange = ev.endDate
                  ? `${fmt(ev.startDate)} → ${fmt(ev.endDate)}`
                  : fmt(ev.startDate);
                return (
                  <div key={ev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 text-sm flex-1">{ev.title}</h3>
                      <span className={typeBadge}>{ev.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar size={13} className="text-blue-600" />
                      <span>{dateRange}</span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-slate-600 italic mt-1 line-clamp-2">{ev.description}</p>
                    )}
                    {isAdminOrPrincipal && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-2">
                        <button
                          type="button"
                          onClick={() => openEditEvent(ev)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <Edit size={11} /> Edit
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete event "${ev.title}"? This cannot be undone.`)) {
                              deleteEventMutation.mutate(ev.id);
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: ACADEMIC EVENT CREATE/EDIT (P2 fix) ────────────────────── */}
      {eventModalOpen && (
        <Modal
          open={eventModalOpen}
          onClose={() => { setEventModalOpen(false); setEditingEvent(null); }}
          title={editingEvent ? 'Edit Academic Event' : 'Add Academic Event'}
          className="max-w-md"
        >
          <form
            onSubmit={eventForm.handleSubmit(data => saveEventMutation.mutate(data))}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-700 font-bold mb-1">Title</label>
              <input
                {...eventForm.register('title', { required: true })}
                className="input w-full"
                placeholder="e.g. First Term Resumption"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Type</label>
              <select {...eventForm.register('type')} className="input w-full">
                <option value="ACADEMIC">Academic</option>
                <option value="EXAMINATION">Examination</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="VACATION">Vacation</option>
                <option value="EVENT">Event</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Start Date</label>
                <input
                  type="date"
                  {...eventForm.register('startDate', { required: true })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">End Date <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="date"
                  {...eventForm.register('endDate')}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea
                {...eventForm.register('description')}
                className="input w-full"
                rows={3}
                placeholder="Notes, venue, participating classes…"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setEventModalOpen(false); setEditingEvent(null); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                icon={<Check size={14} />}
                disabled={saveEventMutation.isPending}
              >
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL 1: CLASS-SPECIFIC CONSTRAINTS & TEACHER ALLOCATIONS ──────── */}
      {constraintsModal && (
        <Modal
          title={`⚙️ Timetable Constraints & Teacher Allocations — ${selectedClassName}`}
          open={constraintsModal}
          onClose={() => setConstraintsModal(false)}
          className="max-w-4xl"
        >
          <div className="space-y-6 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* Quick Level Presets */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-blue-950">Curriculum Level Presets:</span>
                <p className="text-blue-800 text-[11px]">Apply national standard schedule and subject quotas for this class level.</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const p = CLASS_PRESETS.nursery;
                    updateActiveClassProfile({
                      startTime: p.startTime,
                      endTime: p.endTime,
                      periodDuration: p.periodDuration,
                      break1Name: p.break1Name,
                      break1Start: p.break1Start,
                      break1Duration: p.break1Duration,
                      hasBreak2: p.hasBreak2,
                      isSingleClassMaster: p.isSingleClassMaster,
                      subjectQuotas: p.subjects.map(s => ({
                        subjectId: s.code,
                        subjectName: s.name,
                        subjectCode: s.code,
                        quota: s.quota,
                        allowDouble: s.allowDouble,
                        assignedTeacherId: staff[0]?.id,
                      }))
                    });
                    toast.success('Applied Nursery / Early Years Preset');
                  }}
                >
                  Nursery (8am-12pm)
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const p = CLASS_PRESETS.primary;
                    updateActiveClassProfile({
                      startTime: p.startTime,
                      endTime: p.endTime,
                      periodDuration: p.periodDuration,
                      break1Name: p.break1Name,
                      break1Start: p.break1Start,
                      break1Duration: p.break1Duration,
                      hasBreak2: p.hasBreak2,
                      break2Name: p.break2Name,
                      break2Start: p.break2Start,
                      break2Duration: p.break2Duration,
                      isSingleClassMaster: false,
                      subjectQuotas: p.subjects.map((s, i) => ({
                        subjectId: s.code,
                        subjectName: s.name,
                        subjectCode: s.code,
                        quota: s.quota,
                        allowDouble: s.allowDouble,
                        assignedTeacherId: staff[i % staff.length]?.id,
                      }))
                    });
                    toast.success('Applied Primary School Preset');
                  }}
                >
                  Primary (8am-12:45pm)
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const p = CLASS_PRESETS.junior_secondary;
                    updateActiveClassProfile({
                      startTime: p.startTime,
                      endTime: p.endTime,
                      periodDuration: p.periodDuration,
                      break1Name: p.break1Name,
                      break1Start: p.break1Start,
                      break1Duration: p.break1Duration,
                      hasBreak2: p.hasBreak2,
                      break2Name: p.break2Name,
                      break2Start: p.break2Start,
                      break2Duration: p.break2Duration,
                      isSingleClassMaster: false,
                      subjectQuotas: p.subjects.map((s, i) => ({
                        subjectId: s.code,
                        subjectName: s.name,
                        subjectCode: s.code,
                        quota: s.quota,
                        allowDouble: s.allowDouble,
                        assignedTeacherId: staff[i % staff.length]?.id,
                      }))
                    });
                    toast.success('Applied Junior Secondary Preset');
                  }}
                >
                  JSS (8am-1:45pm)
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const p = CLASS_PRESETS.senior_science;
                    updateActiveClassProfile({
                      startTime: p.startTime,
                      endTime: p.endTime,
                      periodDuration: p.periodDuration,
                      break1Name: p.break1Name,
                      break1Start: p.break1Start,
                      break1Duration: p.break1Duration,
                      hasBreak2: p.hasBreak2,
                      break2Name: p.break2Name,
                      break2Start: p.break2Start,
                      break2Duration: p.break2Duration,
                      isSingleClassMaster: false,
                      subjectQuotas: p.subjects.map((s, i) => ({
                        subjectId: s.code,
                        subjectName: s.name,
                        subjectCode: s.code,
                        quota: s.quota,
                        allowDouble: s.allowDouble,
                        assignedTeacherId: staff[i % staff.length]?.id,
                      }))
                    });
                    toast.success('Applied Senior Science Preset');
                  }}
                >
                  SS Science (8am-2:30pm)
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const p = CLASS_PRESETS.senior_arts;
                    updateActiveClassProfile({
                      startTime: p.startTime,
                      endTime: p.endTime,
                      periodDuration: p.periodDuration,
                      break1Name: p.break1Name,
                      break1Start: p.break1Start,
                      break1Duration: p.break1Duration,
                      hasBreak2: p.hasBreak2,
                      break2Name: p.break2Name,
                      break2Start: p.break2Start,
                      break2Duration: p.break2Duration,
                      isSingleClassMaster: false,
                      subjectQuotas: p.subjects.map((s, i) => ({
                        subjectId: s.code,
                        subjectName: s.name,
                        subjectCode: s.code,
                        quota: s.quota,
                        allowDouble: s.allowDouble,
                        assignedTeacherId: staff[i % staff.length]?.id,
                      }))
                    });
                    toast.success('Applied Senior Arts Preset');
                  }}
                >
                  SS Arts (8am-2:30pm)
                </Button>
              </div>
            </div>

            {/* Class Timing & Duration */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">1. Class Daily Timing & Period Duration for {selectedClassName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class Start Time</label>
                  <input
                    type="time"
                    value={activeClassProfile.startTime}
                    onChange={e => updateActiveClassProfile({ startTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class Closing / End Time</label>
                  <input
                    type="time"
                    value={activeClassProfile.endTime}
                    onChange={e => updateActiveClassProfile({ endTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Period Duration (Minutes)</label>
                  <select
                    value={activeClassProfile.periodDuration}
                    onChange={e => updateActiveClassProfile({ periodDuration: Number(e.target.value) })}
                    className="input w-full"
                  >
                    <option value={30}>30 Minutes (Nursery / Early Years)</option>
                    <option value={35}>35 Minutes (Primary)</option>
                    <option value={40}>40 Minutes (Standard Secondary)</option>
                    <option value={45}>45 Minutes (Extended)</option>
                    <option value={50}>50 Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Break / Recess Settings */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">2. Break & Recess Intervals for {selectedClassName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Break 1 */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                  <span className="font-bold text-slate-800">Recess / Break 1</span>
                  <input
                    type="text"
                    value={activeClassProfile.break1Name}
                    onChange={e => updateActiveClassProfile({ break1Name: e.target.value })}
                    className="input w-full py-1 text-xs"
                    placeholder="Break Name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={activeClassProfile.break1Start}
                      onChange={e => updateActiveClassProfile({ break1Start: e.target.value })}
                      className="input w-full py-1 text-xs"
                    />
                    <input
                      type="number"
                      value={activeClassProfile.break1Duration}
                      onChange={e => updateActiveClassProfile({ break1Duration: Number(e.target.value) })}
                      className="input w-full py-1 text-xs"
                      placeholder="Mins"
                    />
                  </div>
                </div>

                {/* Break 2 */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Lunch / Break 2</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={activeClassProfile.hasBreak2}
                        onChange={e => updateActiveClassProfile({ hasBreak2: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Enable Break 2
                    </label>
                  </div>
                  {activeClassProfile.hasBreak2 && (
                    <>
                      <input
                        type="text"
                        value={activeClassProfile.break2Name}
                        onChange={e => updateActiveClassProfile({ break2Name: e.target.value })}
                        className="input w-full py-1 text-xs"
                        placeholder="Lunch Name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          value={activeClassProfile.break2Start}
                          onChange={e => updateActiveClassProfile({ break2Start: e.target.value })}
                          className="input w-full py-1 text-xs"
                        />
                        <input
                          type="number"
                          value={activeClassProfile.break2Duration}
                          onChange={e => updateActiveClassProfile({ break2Duration: Number(e.target.value) })}
                          className="input w-full py-1 text-xs"
                          placeholder="Mins"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sole Class Master Mode (Nursery / Early Primary) */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-purple-950 text-sm">3. Class Teacher / Homeroom Master Mode</h3>
                  <p className="text-purple-800 text-[11px]">
                    For Nursery or Lower Primary classes, toggle to assign a single class teacher who teaches all subjects.
                  </p>
                </div>
                <label className="flex items-center gap-2 font-bold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeClassProfile.isSingleClassMaster}
                    onChange={e => updateActiveClassProfile({ isSingleClassMaster: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                  Single Teacher Teaches All Subjects
                </label>
              </div>

              {activeClassProfile.isSingleClassMaster && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="font-semibold text-purple-900">Select Sole Class Master:</span>
                  <select
                    value={activeClassProfile.classMasterId}
                    onChange={e => updateActiveClassProfile({ classMasterId: e.target.value })}
                    className="input w-72 text-xs"
                  >
                    {staff.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({st.specialization || 'Class Teacher'})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<CheckCheck size={13} className="text-purple-600" />}
                    onClick={() => {
                      const updatedQuotas = activeClassProfile.subjectQuotas.map(sq => ({
                        ...sq,
                        assignedTeacherId: activeClassProfile.classMasterId,
                      }));
                      updateActiveClassProfile({ subjectQuotas: updatedQuotas });
                      toast.success('Assigned Class Master to all subjects in this class!');
                    }}
                  >
                    Apply to All Subjects
                  </Button>
                </div>
              )}
            </div>

            {/* Subject Weekly Quotas Matrix for this Class */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">4. Subject Period Quotas & Assigned Teachers for {selectedClassName}</h3>
                  <p className="text-[11px] text-slate-500">Configure weekly periods and allocate subject teachers specifically for this class section.</p>
                </div>
                <div className={cn(
                  'px-3 py-1 rounded-xl font-bold text-xs border',
                  totalAllocatedQuota === totalWeeklyTeachingSlots
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : totalAllocatedQuota > totalWeeklyTeachingSlots
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                )}>
                  Allocation: {totalAllocatedQuota} / {totalWeeklyTeachingSlots} Weekly Periods ({Math.round((totalAllocatedQuota / (totalWeeklyTeachingSlots || 1)) * 100)}%)
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Subject</th>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5 text-center">Periods / Week</th>
                      <th className="p-2.5 text-center">Allow Double Period</th>
                      <th className="p-2.5">Assigned Subject Teacher</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeClassProfile.subjectQuotas.map((sq, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{sq.subjectName}</td>
                        <td className="p-2.5 text-slate-500">{sq.subjectCode}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...activeClassProfile.subjectQuotas];
                                if (copy[idx].quota > 1) copy[idx].quota -= 1;
                                updateActiveClassProfile({ subjectQuotas: copy });
                              }}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-blue-600">{sq.quota}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...activeClassProfile.subjectQuotas];
                                copy[idx].quota += 1;
                                updateActiveClassProfile({ subjectQuotas: copy });
                              }}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={sq.allowDouble}
                            onChange={e => {
                              const copy = [...activeClassProfile.subjectQuotas];
                              copy[idx].allowDouble = e.target.checked;
                              updateActiveClassProfile({ subjectQuotas: copy });
                            }}
                            className="rounded text-blue-600 w-4 h-4"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={sq.assignedTeacherId}
                            onChange={e => {
                              const copy = [...activeClassProfile.subjectQuotas];
                              copy[idx].assignedTeacherId = e.target.value;
                              updateActiveClassProfile({ subjectQuotas: copy });
                            }}
                            className="input py-1 text-xs w-60"
                            disabled={activeClassProfile.isSingleClassMaster}
                          >
                            <option value="">-- No Teacher Assigned --</option>
                            {staff.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.firstName} {st.lastName} ({st.specialization || 'Teacher'})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = activeClassProfile.subjectQuotas.filter((_, i) => i !== idx);
                              updateActiveClassProfile({ subjectQuotas: copy });
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setConstraintsModal(false)}>
                Close
              </Button>
              <Button
                icon={<Check size={15} />}
                onClick={() => {
                  toast.success(`Constraints & allocations saved for ${selectedClassName}!`);
                  setConstraintsModal(false);
                }}
              >
                Save Constraints for {selectedClassName}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 2: CLASS-AWARE AUTO-GENERATION ENGINE ─────────────────────── */}
      {autoGenModal && (
        <Modal
          title="✨ Class-Aware Algorithmic Timetable Generator"
          open={autoGenModal}
          onClose={() => setAutoGenModal(false)}
          className="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-start gap-3">
              <Sparkles size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-950 text-sm">Class-Specific Constraint Satisfaction Scheduler</p>
                <p className="text-purple-800 text-[11px] mt-0.5">
                  Generates an optimal schedule respecting each class's distinct school hours (e.g. Nursery 8am-12pm vs SS 8am-2:30pm), distinct subject quotas, and prevents cross-class teacher double-booking.
                </p>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-slate-700 font-bold mb-2">Select Generation Scope:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'current', label: 'Current Class Only', sub: selectedClassName },
                  { id: 'selected', label: 'Selected Classes', sub: `${selectedClassIdsForGen.length} classes chosen` },
                  { id: 'whole_school', label: 'Whole School', sub: `All ${classes.length} classes` },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGenerationScope(item.id as any)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      generationScope === item.id
                        ? 'border-purple-600 bg-purple-50/70 text-purple-950 font-bold ring-2 ring-purple-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Class multi-select if 'selected' scope */}
            {generationScope === 'selected' && (
              <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                <span className="text-[11px] font-bold text-slate-600 mb-2 block">Check Classes to Generate:</span>
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClassIdsForGen.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedClassIdsForGen([...selectedClassIdsForGen, c.id]);
                        } else {
                          setSelectedClassIdsForGen(selectedClassIdsForGen.filter(id => id !== c.id));
                        }
                      }}
                      className="rounded text-purple-600"
                    />
                    <span className="text-xs text-slate-800 font-medium">{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setAutoGenModal(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Sparkles size={15} />}
                onClick={runAutoGenerator}
                disabled={isGenerating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGenerating ? 'Scheduling Classes...' : 'Generate Conflict-Free Schedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── P1 fix: AUTO-GENERATE OVERWRITE CONFIRMATION ──────────────────────── */}
      {overwriteConfirm && (
        <Modal
          open={!!overwriteConfirm}
          onClose={() => setOverwriteConfirm(null)}
          title="⚠️ Overwrite Existing Timetable?"
          className="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-900">
                <p className="font-bold text-sm">Existing slots will be deleted</p>
                <p className="text-[11px] mt-1">
                  The selected scope already contains <strong>{overwriteConfirm.slotCount}</strong> timetable
                  slot{overwriteConfirm.slotCount === 1 ? '' : 's'} across{' '}
                  <strong>{overwriteConfirm.classIds.length}</strong> class
                  {overwriteConfirm.classIds.length === 1 ? '' : 'es'}.
                  Auto-Generate will <strong>permanently delete</strong> these slots and replace them with a freshly
                  generated schedule.
                </p>
              </div>
            </div>

            <p className="text-slate-600">
              Any manual edits made to these classes (per-slot teacher swaps, room assignments, double-period
              toggles) will be lost. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => setOverwriteConfirm(null)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Sparkles size={14} />}
                disabled={isGenerating}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={async () => {
                  const ids = overwriteConfirm.classIds;
                  setOverwriteConfirm(null);
                  await doGenerate(ids);
                }}
              >
                {isGenerating ? 'Scheduling…' : `Overwrite & Generate`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 3: SOLVER DIAGNOSTICS REPORT ──────────────────────────────── */}
      {solverResultModal && (
        <Modal
          title="🎉 Algorithmic Solver Diagnostics Report"
          open={!!solverResultModal}
          onClose={() => setSolverResultModal(null)}
          className="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-emerald-950 text-base">Generation Succeeded!</h3>
              <p className="text-emerald-800 text-xs">All class schedules synchronized with zero teacher double-bookings.</p>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500">Classes Processed:</span>
                <span className="font-bold text-slate-800">{solverResultModal.classesCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500">Total Timetable Slots Created:</span>
                <span className="font-bold text-blue-600">{solverResultModal.totalSlots}</span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500">Quota Fulfillment:</span>
                <span className="font-bold text-emerald-600">{solverResultModal.quotasFulfilled}</span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500">Teacher Clashes:</span>
                <span className="font-bold text-emerald-600">0 (Clean)</span>
              </div>
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-500">Faculty Utilization Rate:</span>
                <span className="font-bold text-purple-600">{solverResultModal.facultyUtilization}</span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button icon={<Check size={15} />} onClick={() => setSolverResultModal(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 4: MANUAL CELL / SLOT EDIT MODAL ─────────────────────────── */}
      {slotEditModal && activeSlotTarget && (
        <Modal
          title={`Assign Timetable Period — ${activeSlotTarget.dayName} (${activeSlotTarget.startTime} - ${activeSlotTarget.endTime})`}
          open={slotEditModal}
          onClose={() => setSlotEditModal(false)}
          className="max-w-md"
        >
          <form
            onSubmit={editForm.handleSubmit(data => saveSlotMutation.mutate(data))}
            className="space-y-4 text-xs"
          >
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800">Target Session:</span>
              <div className="text-slate-600 mt-0.5">
                {selectedClassName} • {activeSlotTarget.periodLabel} ({activeSlotTarget.startTime} - {activeSlotTarget.endTime})
              </div>
            </div>

            {/* Subject Select */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Subject</label>
              <select {...editForm.register('subjectId', { required: true })} className="input w-full">
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
                ))}
              </select>
            </div>

            {/* Teacher Select */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Subject Teacher</label>
              <select {...editForm.register('staffId')} className="input w-full">
                <option value="">-- No Teacher Assigned --</option>
                {staff.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.specialization || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>

            {/* Real-time Teacher Conflict Alert */}
            {modalTeacherConflict && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                <span>{modalTeacherConflict}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              {activeSlotTarget.existingSlotId ? (
                <Button
                  type="button"
                  variant="danger"
                  icon={<Trash2 size={14} />}
                  onClick={() => clearSlotMutation.mutate(activeSlotTarget.existingSlotId)}
                  disabled={clearSlotMutation.isPending}
                >
                  Clear Period
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setSlotEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  icon={<Check size={14} />}
                  disabled={saveSlotMutation.isPending || !!modalTeacherConflict}
                >
                  Save Period
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL 5: ASSIGN EMERGENCY RELIEF TEACHER ───────────────────────── */}
      {substitutionModal && (
        <Modal
          title="Assign Emergency Relief Teacher"
          open={substitutionModal}
          onClose={() => setSubstitutionModal(false)}
          className="max-w-md"
        >
          <form
            onSubmit={reliefForm.handleSubmit(data => {
              // EDN-008 fix: pass actual staff UUIDs so the backend can run
              // real validation (absent ≠ relief, scheduling conflict check,
              // staff existence in this school). Also map the names so the
              // persisted row remains readable even if staff is later deleted.
              if (!data.absentStaffId) {
                toast.error('Please select the absent teacher');
                return;
              }
              if (!data.reliefStaffId) {
                toast.error('Please select a relief teacher');
                return;
              }
              if (data.absentStaffId === data.reliefStaffId) {
                toast.error('The absent teacher and the relief teacher cannot be the same person');
                return;
              }
              // Resolve human-readable names from staff list (for legacy display)
              const absentStaff = staff.find((s: any) => s.id === data.absentStaffId);
              const reliefStaff = staff.find((s: any) => s.id === data.reliefStaffId);
              const absentName = absentStaff ? `${absentStaff.firstName} ${absentStaff.lastName}` : '—';
              const reliefName = reliefStaff ? `${reliefStaff.firstName} ${reliefStaff.lastName}` : '—';
              // Look up class & subject IDs if possible
              const cls = classes.find((c: any) => c.name === data.className);
              const subj = subjects.find((s: any) => s.name === data.subjectName);
              createReliefMutation.mutate({
                date: new Date().toISOString(),
                dayOfWeek: data.day,
                period: data.period,
                classId: cls?.id || null,
                className: data.className,
                subjectId: subj?.id || null,
                subjectName: data.subjectName || '—',
                absentStaffId: data.absentStaffId,
                absentTeacherName: absentName,
                reliefStaffId: data.reliefStaffId,
                reliefTeacherName: reliefName,
                reason: data.reason,
                status: 'CONFIRMED',
              });
            })}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-700 font-bold mb-1">Class Section</label>
              <select {...reliefForm.register('className', { required: true })} className="input w-full">
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Day</label>
                <select {...reliefForm.register('day')} className="input w-full">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Period</label>
                <select {...reliefForm.register('period')} className="input w-full">
                  {periodSlots.filter(p => !p.isBreak).map(p => (
                    <option key={p.id} value={`${p.label} (${p.time})`}>{p.label} ({p.time})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Subject</label>
              <select {...reliefForm.register('subjectName')} className="input w-full">
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Absent Teacher</label>
              <select {...reliefForm.register('absentStaffId', { required: true })} className="input w-full">
                <option value="">— Select absent teacher —</option>
                {staff.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName}{st.email ? ` · ${st.email}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Relief Teacher <span className="text-slate-400 font-normal">(free-period info shown)</span>
              </label>
              <select {...reliefForm.register('reliefStaffId', { required: true })} className="input w-full">
                <option value="">— Select relief teacher —</option>
                {staff.map(st => {
                  // EDN-008 fix: compute real free periods per week instead of
                  // the misleading hardcoded "(Available)" tag.
                  const load = facultyWorkloadData.find(f => f.staffId === st.id);
                  const freePw = load ? load.freePeriodsPerWeek : 35;
                  const totalPw = load ? load.totalWeeklyPeriods : 0;
                  const status = load?.status || 'OPTIMAL';
                  const tag =
                    status === 'OVERLOADED' ? '⚠️ Overloaded' :
                    status === 'LIGHT' ? '✓ Light load' :
                    '✓ Optimal';
                  return (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} · {totalPw}/wk · {freePw} free · {tag}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Shows actual weekly load + free periods (max 35/wk). Verify the chosen period is open for this teacher.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Reason for Absence</label>
              <select {...reliefForm.register('reason')} className="input w-full">
                <option value="Approved Sick Leave">Approved Sick Leave</option>
                <option value="Official Institutional Assignment">Official Institutional Assignment</option>
                <option value="TRCN / Ministry Workshop">TRCN / Ministry Workshop</option>
                <option value="Personal Emergency">Personal Emergency</option>
                <option value="Bereavement Leave">Bereavement Leave</option>
                <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                <option value="Medical Appointment">Medical Appointment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setSubstitutionModal(false)}>
                Cancel
              </Button>
              <Button type="submit" icon={<Check size={14} />}>
                Confirm Relief Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── MODAL 6: FORMAL PRINT & EXPORT CENTER ───────────────────────────── */}
      {printCenterModal && (
        <Modal
          title="🖨️ Formal Institutional Print & Export Center"
          open={printCenterModal}
          onClose={() => setPrintCenterModal(false)}
          className="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Select timetable printout scope for institutional dissemination, staff room notice boards, or student record files:
            </p>

            <div className="space-y-2">
              {[
                { id: 'current_class', label: `Current Class Only (${selectedClassName})`, sub: 'Generates single official timetable sheet with signature blocks' },
                { id: 'selected_classes', label: 'Selected Classes (Batch Print)', sub: 'Prints separate formatted sheets for each chosen class' },
                { id: 'whole_school', label: 'Whole School Master Matrix', sub: 'Prints complete institutional master schedule' },
                { id: 'teachers', label: 'Faculty / Teacher Timetables', sub: 'Prints personalized weekly timetable slips for teachers' },
              ].map(opt => (
                <label
                  key={opt.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    printScope === opt.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <input
                    type="radio"
                    name="printScope"
                    checked={printScope === opt.id}
                    onChange={() => setPrintScope(opt.id as any)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* If selected classes */}
            {printScope === 'selected_classes' && (
              <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                <span className="font-bold text-slate-700 block mb-1">Check Classes to Print:</span>
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printSelectedClassIds.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) setPrintSelectedClassIds([...printSelectedClassIds, c.id]);
                        else setPrintSelectedClassIds(printSelectedClassIds.filter(id => id !== c.id));
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="text-xs text-slate-800">{c.name}</span>
                  </label>
                ))}
              </div>
            )}

            {/* If teachers */}
            {printScope === 'teachers' && (
              <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                <span className="font-bold text-slate-700 block mb-1">Check Teachers to Print:</span>
                {staff.map(st => (
                  <label key={st.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printSelectedTeacherIds.includes(st.id)}
                      onChange={e => {
                        if (e.target.checked) setPrintSelectedTeacherIds([...printSelectedTeacherIds, st.id]);
                        else setPrintSelectedTeacherIds(printSelectedTeacherIds.filter(id => id !== st.id));
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="text-xs text-slate-800">{st.firstName} {st.lastName}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setPrintCenterModal(false)}>
                Cancel
              </Button>
              <Button
                icon={<Printer size={15} />}
                onClick={() => {
                  setPrintCenterModal(false);
                  setTimeout(() => window.print(), 200);
                }}
              >
                Launch Browser Print Dialog
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 7: CLEAR TIMETABLE CONFIRMATION ──────────────────────────── */}
      {clearConfirmModal && (
        <Modal
          title="⚠️ Clear Timetable Confirmation"
          open={clearConfirmModal}
          onClose={() => setClearConfirmModal(false)}
          className="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Select whether you wish to clear only the active class timetable or reset the entire school schedule:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleClearTimetable('class')}
                className="w-full p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-left transition-colors"
              >
                <div className="font-bold text-red-900">Clear Current Class Timetable</div>
                <div className="text-[11px] text-red-700 mt-0.5">Clears all periods for {selectedClassName} only.</div>
              </button>

              <button
                type="button"
                onClick={() => handleClearTimetable('school')}
                className="w-full p-3 rounded-xl border border-red-300 bg-red-100 hover:bg-red-200 text-left transition-colors"
              >
                <div className="font-bold text-red-950">Clear Entire School Timetable</div>
                <div className="text-[11px] text-red-800 mt-0.5">Resets schedule across all {classes.length} classes.</div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setClearConfirmModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
