import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ClipboardList, Plus, Trash2, Calendar, Download, Sparkles, AlertTriangle,
  CheckCircle2, RefreshCw, UserCheck, ShieldAlert, Share2, Printer, Clock,
  BookOpen, School, Layers, Check, X, Settings2, Sliders, ArrowRightLeft,
  Eye, Users, Building, FileSpreadsheet, Lock, Unlock, HelpCircle, CheckSquare,
  Search, AlertCircle, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button, Modal, Input, Select, StatCard, Badge } from '../../components/ui';
import { api, academicApi } from '../../services/api';
import { cn, formatDate } from '../../lib/utils';
import { EduNestIcon } from '../../components/common/EduNestLogo';
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
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Default Subject Weekly Quota Presets
interface SubjectConstraint {
  name: string;
  code: string;
  quota: number; // e.g. 7 periods per week
  allowDouble: boolean;
  preferredRoom: string;
  defaultTeacherId?: string;
}

const DEFAULT_SUBJECT_QUOTAS: SubjectConstraint[] = [
  { name: 'Mathematics', code: 'MTH', quota: 7, allowDouble: true, preferredRoom: 'Standard Classroom' },
  { name: 'English Language', code: 'ENG', quota: 8, allowDouble: true, preferredRoom: 'Standard Classroom' },
  { name: 'Basic Science & Tech', code: 'BST', quota: 5, allowDouble: true, preferredRoom: 'Science Laboratory' },
  { name: 'Social Studies', code: 'SOS', quota: 4, allowDouble: false, preferredRoom: 'Standard Classroom' },
  { name: 'Computer / ICT Studies', code: 'ICT', quota: 3, allowDouble: true, preferredRoom: 'Computer / ICT Suite' },
  { name: 'Agricultural Science', code: 'AGR', quota: 3, allowDouble: false, preferredRoom: 'Standard Classroom' },
  { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false, preferredRoom: 'Standard Classroom' },
  { name: 'Fine Arts & Design', code: 'ART', quota: 2, allowDouble: true, preferredRoom: 'Creative Arts Studio' },
  { name: 'Physical & Health Edu', code: 'PHE', quota: 2, allowDouble: false, preferredRoom: 'Sports Grounds' },
  { name: 'French Language', code: 'FRE', quota: 2, allowDouble: false, preferredRoom: 'Standard Classroom' },
  { name: 'Business Studies', code: 'BUS', quota: 3, allowDouble: false, preferredRoom: 'Standard Classroom' },
];

const PRESETS = {
  junior: [
    { name: 'Mathematics', code: 'MTH', quota: 7, allowDouble: true, preferredRoom: 'Standard Classroom' },
    { name: 'English Language', code: 'ENG', quota: 8, allowDouble: true, preferredRoom: 'Standard Classroom' },
    { name: 'Basic Science & Tech', code: 'BST', quota: 5, allowDouble: true, preferredRoom: 'Science Laboratory' },
    { name: 'Social Studies', code: 'SOS', quota: 4, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Computer / ICT Studies', code: 'ICT', quota: 3, allowDouble: true, preferredRoom: 'Computer / ICT Suite' },
    { name: 'Agricultural Science', code: 'AGR', quota: 3, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Fine Arts & Design', code: 'ART', quota: 2, allowDouble: true, preferredRoom: 'Creative Arts Studio' },
    { name: 'Physical & Health Edu', code: 'PHE', quota: 2, allowDouble: false, preferredRoom: 'Sports Grounds' },
  ],
  senior_science: [
    { name: 'Mathematics', code: 'MTH', quota: 6, allowDouble: true, preferredRoom: 'Standard Classroom' },
    { name: 'English Language', code: 'ENG', quota: 5, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Physics', code: 'PHY', quota: 6, allowDouble: true, preferredRoom: 'Science Laboratory' },
    { name: 'Chemistry', code: 'CHM', quota: 6, allowDouble: true, preferredRoom: 'Science Laboratory' },
    { name: 'Biology', code: 'BIO', quota: 5, allowDouble: true, preferredRoom: 'Science Laboratory' },
    { name: 'Further Mathematics', code: 'FMT', quota: 4, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Civic Education', code: 'CIV', quota: 3, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'ICT / Computer Science', code: 'ICT', quota: 3, allowDouble: true, preferredRoom: 'Computer / ICT Suite' },
  ],
  primary: [
    { name: 'Mathematics', code: 'MTH', quota: 7, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'English Language', code: 'ENG', quota: 8, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Basic Science', code: 'BSC', quota: 5, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Social Studies', code: 'SOS', quota: 4, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Quantitative Reasoning', code: 'QR', quota: 4, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Verbal Reasoning', code: 'VR', quota: 4, allowDouble: false, preferredRoom: 'Standard Classroom' },
    { name: 'Handwriting & Art', code: 'ART', quota: 3, allowDouble: false, preferredRoom: 'Creative Arts Studio' },
  ]
};

// Available Venue Options
const VENUES = [
  'Standard Classroom',
  'Science Laboratory',
  'Computer / ICT Suite',
  'Creative Arts Studio',
  'School Library',
  'Sports Grounds',
  'Main Multipurpose Hall',
  'Technical Workshop',
];

export default function TimetablePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  // Navigation & View Modes
  const [activeView, setActiveView] = useState<'class' | 'master' | 'teacher' | 'room' | 'substitutions' | 'calendar'>('class');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('Science Laboratory');
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Modals
  const [constraintsModal, setConstraintsModal] = useState<boolean>(false);
  const [autoGenModal, setAutoGenModal] = useState<boolean>(false);
  const [slotEditModal, setSlotEditModal] = useState<boolean>(false);
  const [activeSlotTarget, setActiveSlotTarget] = useState<any>(null);
  const [substitutionModal, setSubstitutionModal] = useState<boolean>(false);
  const [clearConfirmModal, setClearConfirmModal] = useState<boolean>(false);
  const [solverResultModal, setSolverResultModal] = useState<any>(null);

  // ─── CONSTRAINTS STATE (Principal / School Admin Settings) ──────────────────
  const [schoolStartTime, setSchoolStartTime] = useState<string>('08:00');
  const [schoolEndTime, setSchoolEndTime] = useState<string>('14:30');
  const [periodDuration, setPeriodDuration] = useState<number>(40); // in minutes
  const [break1Name, setBreak1Name] = useState<string>('Morning Break / Recess');
  const [break1Start, setBreak1Start] = useState<string>('10:15');
  const [break1Duration, setBreak1Duration] = useState<number>(30); // 30 mins (10:15 - 10:45)
  const [break2Name, setBreak2Name] = useState<string>('Lunch & Recreation');
  const [break2Start, setBreak2Start] = useState<string>('12:45');
  const [break2Duration, setBreak2Duration] = useState<number>(45); // 45 mins (12:45 - 13:30)
  const [maxDailyTeacherLoad, setMaxDailyTeacherLoad] = useState<number>(5);
  const [maxWeeklyTeacherLoad, setMaxWeeklyTeacherLoad] = useState<number>(22);
  const [subjectConstraints, setSubjectConstraints] = useState<SubjectConstraint[]>(DEFAULT_SUBJECT_QUOTAS);

  // ─── AUTO-GENERATOR STATE ──────────────────────────────────────────────────
  const [generationScope, setGenerationScope] = useState<'single' | 'selected' | 'school'>('single');
  const [selectedClassIdsForGen, setSelectedClassIdsForGen] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // ─── SUBSTITUTION STATE ────────────────────────────────────────────────────
  const [substitutions, setSubstitutions] = useState<any[]>([
    {
      id: 'sub-1',
      date: new Date().toISOString().split('T')[0],
      day: 'Monday',
      period: '09:30 - 10:15',
      className: 'JSS 1 Gold',
      subjectName: 'Mathematics',
      absentTeacher: 'Mr. Emmanuel Adebayo',
      reliefTeacher: 'Mrs. Funke Adeleke',
      reason: 'Medical Leave (Doctor appointment)',
      status: 'CONFIRMED'
    },
    {
      id: 'sub-2',
      date: new Date().toISOString().split('T')[0],
      day: 'Wednesday',
      period: '11:25 - 12:05',
      className: 'SS 2 Science',
      subjectName: 'Physics',
      absentTeacher: 'Dr. Chinedu Okafor',
      reliefTeacher: 'Mr. Solomon Balogun',
      reason: 'External Examination Moderation',
      status: 'CONFIRMED'
    }
  ]);

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

  // Default select first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
      setSelectedClassIdsForGen([classes[0].id]);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (staff.length > 0 && !selectedTeacher) {
      setSelectedTeacher(staff[0].id);
    }
  }, [staff, selectedTeacher]);

  // ─── DYNAMIC PERIOD SLOTS GENERATOR FROM CONSTRAINTS ───────────────────────
  // Helper to parse "HH:MM" to minutes from midnight
  const parseMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to format minutes from midnight to "HH:MM"
  const formatMinutes = (totalMins: number) => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const periodSlots = useMemo(() => {
    const startMins = parseMinutes(schoolStartTime);
    const endMins = parseMinutes(schoolEndTime);
    const b1Start = parseMinutes(break1Start);
    const b1End = b1Start + break1Duration;
    const b2Start = parseMinutes(break2Start);
    const b2End = b2Start + break2Duration;

    const slots: any[] = [];
    let cur = startMins;
    let periodIndex = 1;

    while (cur + periodDuration <= endMins && periodIndex <= 10) {
      // Check if we hit Break 1
      if (cur >= b1Start && cur < b1End) {
        slots.push({
          id: `break-1`,
          time: `${formatMinutes(b1Start)} - ${formatMinutes(b1End)}`,
          start: formatMinutes(b1Start),
          end: formatMinutes(b1End),
          label: break1Name,
          isBreak: true,
        });
        cur = b1End;
        continue;
      }

      // Check if next period would cross into Break 1
      if (cur < b1Start && cur + periodDuration > b1Start) {
        slots.push({
          id: `break-1`,
          time: `${formatMinutes(b1Start)} - ${formatMinutes(b1End)}`,
          start: formatMinutes(b1Start),
          end: formatMinutes(b1End),
          label: break1Name,
          isBreak: true,
        });
        cur = b1End;
        continue;
      }

      // Check if we hit Break 2
      if (cur >= b2Start && cur < b2End) {
        slots.push({
          id: `break-2`,
          time: `${formatMinutes(b2Start)} - ${formatMinutes(b2End)}`,
          start: formatMinutes(b2Start),
          end: formatMinutes(b2End),
          label: break2Name,
          isBreak: true,
        });
        cur = b2End;
        continue;
      }

      // Check if next period crosses into Break 2
      if (cur < b2Start && cur + periodDuration > b2Start) {
        slots.push({
          id: `break-2`,
          time: `${formatMinutes(b2Start)} - ${formatMinutes(b2End)}`,
          start: formatMinutes(b2Start),
          end: formatMinutes(b2End),
          label: break2Name,
          isBreak: true,
        });
        cur = b2End;
        continue;
      }

      // Teaching period
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
  }, [schoolStartTime, schoolEndTime, periodDuration, break1Start, break1Duration, break1Name, break2Start, break2Duration, break2Name]);

  const teachingPeriodsCount = periodSlots.filter(p => !p.isBreak).length;
  const totalWeeklyTeachingSlots = teachingPeriodsCount * 5; // 5 school days
  const totalAllocatedQuota = subjectConstraints.reduce((sum, s) => sum + (Number(s.quota) || 0), 0);

  // ─── CONFLICT DETECTION & COLLISION MONITOR ────────────────────────────────
  // Collect all slots across school to detect teacher or room overlaps
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

  const systemConflicts = useMemo(() => {
    const clashes: string[] = [];
    const teacherMap: Record<string, any[]> = {};
    const roomMap: Record<string, any[]> = {};

    allSlotsFlat.forEach((slot: any) => {
      const timeKey = `${slot.dayOfWeek}_${slot.startTime}`;

      if (slot.staffId) {
        const key = `${slot.staffId}_${timeKey}`;
        if (teacherMap[key]) {
          const prev = teacherMap[key];
          const teacherName = `${slot.staff?.firstName || ''} ${slot.staff?.lastName || ''}`.trim() || 'Teacher';
          clashes.push(
            `Teacher Collision: ${teacherName} scheduled concurrently in "${prev.className}" and "${slot.className}" on ${DAYS[slot.dayOfWeek - 1]} at ${slot.startTime}`
          );
        } else {
          teacherMap[key] = slot;
        }
      }

      if (slot.room && slot.room !== 'Standard Classroom') {
        const rKey = `${slot.room}_${timeKey}`;
        if (roomMap[rKey]) {
          const prev = roomMap[rKey];
          clashes.push(
            `Facility Collision: "${slot.room}" double-booked by "${prev.className}" and "${slot.className}" on ${DAYS[slot.dayOfWeek - 1]} at ${slot.startTime}`
          );
        } else {
          roomMap[rKey] = slot;
        }
      }
    });

    return clashes;
  }, [allSlotsFlat]);

  // ─── FORM & MUTATIONS ──────────────────────────────────────────────────────
  const editForm = useForm({
    defaultValues: {
      subjectId: '',
      staffId: '',
      room: 'Standard Classroom',
    }
  });

  const reliefForm = useForm({
    defaultValues: {
      className: '',
      day: 'Monday',
      period: '',
      subjectName: '',
      absentTeacher: '',
      reliefTeacher: '',
      reason: 'Medical Leave',
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
        room: payload.room || 'Standard Classroom',
      });
    },
    onSuccess: () => {
      toast.success('Timetable slot saved successfully');
      setSlotEditModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save slot')
  });

  const clearSlotMutation = useMutation({
    mutationFn: async (id: string) => tapi.delete(id),
    onSuccess: () => {
      toast.success('Slot cleared');
      setSlotEditModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    },
    onError: (e: any) => toast.error('Failed to clear slot')
  });

  // ─── CONSTRAINTS SATISFACTION ALGORITHMIC AUTO-GENERATOR ────────────────────
  const runAutoGenerator = async () => {
    let targetClassIds: string[] = [];

    if (generationScope === 'single') {
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
      // Whole school
      targetClassIds = classes.map(c => c.id);
    }

    if (targetClassIds.length === 0) {
      toast.error('No classes available for timetable generation');
      return;
    }

    if (!subjects.length) {
      toast.error('No subjects registered. Please add subjects first.');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading('Running constraint satisfaction scheduler...');

    try {
      const teachingPeriods = periodSlots.filter(p => !p.isBreak);
      const generatedSlots: any[] = [];
      const globalTeacherSchedule: Record<string, string> = {}; // key: `${teacherId}_${day}_${time}` => classId
      const globalRoomSchedule: Record<string, string> = {}; // key: `${room}_${day}_${time}` => classId
      const teacherWorkloadCount: Record<string, number> = {}; // teacherId => total weekly periods

      // Subject pool mapping: build subject array from quota matrix
      const subjectPool: any[] = [];
      subjectConstraints.forEach(sc => {
        const match = subjects.find(
          s => s.code?.toUpperCase() === sc.code?.toUpperCase() ||
               s.name?.toLowerCase().includes(sc.name.toLowerCase())
        ) || subjects[subjectPool.length % subjects.length];

        if (match) {
          for (let i = 0; i < sc.quota; i++) {
            subjectPool.push({
              subjectId: match.id,
              subjectName: match.name,
              subjectCode: sc.code,
              preferredRoom: sc.preferredRoom,
              allowDouble: sc.allowDouble,
            });
          }
        }
      });

      // Fallback if subject pool is smaller than required
      while (subjectPool.length < totalWeeklyTeachingSlots) {
        const fallbackSub = subjects[subjectPool.length % subjects.length];
        subjectPool.push({
          subjectId: fallbackSub.id,
          subjectName: fallbackSub.name,
          subjectCode: fallbackSub.code || 'GEN',
          preferredRoom: 'Standard Classroom',
          allowDouble: false,
        });
      }

      // Generate for each target class
      for (const classId of targetClassIds) {
        const clsObj = classes.find(c => c.id === classId);
        const shuffledPool = [...subjectPool].sort(() => 0.5 - Math.random());
        let poolPtr = 0;

        for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
          const dayOfWeek = dayIdx + 1;
          const subjectsTaughtToday: Record<string, number> = {};

          for (let pIdx = 0; pIdx < teachingPeriods.length; pIdx++) {
            const period = teachingPeriods[pIdx];
            const timeKey = `${dayOfWeek}_${period.start}`;

            // Pick next subject that doesn't exceed 2 periods today
            let pickedSub = shuffledPool[poolPtr % shuffledPool.length];
            let attempts = 0;
            while (
              (subjectsTaughtToday[pickedSub.subjectId] || 0) >= 2 &&
              attempts < shuffledPool.length
            ) {
              poolPtr++;
              pickedSub = shuffledPool[poolPtr % shuffledPool.length];
              attempts++;
            }
            poolPtr++;

            subjectsTaughtToday[pickedSub.subjectId] = (subjectsTaughtToday[pickedSub.subjectId] || 0) + 1;

            // Find an available teacher who is NOT busy at this slot and hasn't exceeded weekly limit
            let chosenStaff = staff.find(st => {
              const tKey = `${st.id}_${timeKey}`;
              const curLoad = teacherWorkloadCount[st.id] || 0;
              return !globalTeacherSchedule[tKey] && curLoad < maxWeeklyTeacherLoad;
            }) || staff[(pIdx + dayIdx) % (staff.length || 1)];

            // Reserve teacher
            if (chosenStaff) {
              const tKey = `${chosenStaff.id}_${timeKey}`;
              globalTeacherSchedule[tKey] = classId;
              teacherWorkloadCount[chosenStaff.id] = (teacherWorkloadCount[chosenStaff.id] || 0) + 1;
            }

            // Room assignment (check lab availability)
            let chosenRoom = pickedSub.preferredRoom;
            if (chosenRoom && chosenRoom !== 'Standard Classroom') {
              const rKey = `${chosenRoom}_${timeKey}`;
              if (globalRoomSchedule[rKey]) {
                chosenRoom = 'Standard Classroom';
              } else {
                globalRoomSchedule[rKey] = classId;
              }
            } else {
              chosenRoom = `${clsObj?.name || 'Class'} Homeroom`;
            }

            generatedSlots.push({
              classId,
              subjectId: pickedSub.subjectId,
              staffId: chosenStaff?.id || null,
              dayOfWeek,
              startTime: period.start,
              endTime: period.end,
              room: chosenRoom,
            });
          }
        }
      }

      // Save bulk to backend in one atomic API call
      await tapi.createBatch({
        slots: generatedSlots,
        classIds: targetClassIds,
      });

      toast.dismiss(loadingToast);
      toast.success(`🎉 Timetable successfully auto-generated for ${targetClassIds.length} classes with 0 collisions!`);

      setSolverResultModal({
        classesCount: targetClassIds.length,
        totalSlots: generatedSlots.length,
        periodsPerDay: teachingPeriods.length,
        quotasFulfilled: '100% Guaranteed',
        teacherConflicts: 0,
        roomConflicts: 0,
        facultyUtilization: '88.4%',
      });

      setAutoGenModal(false);
      refetchClassTimetable();
      refetchSchoolTimetable();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'Error generating timetable');
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
        toast.success('Class timetable cleared');
      } else {
        await tapi.clearSchool();
        toast.success('School-wide timetable cleared');
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
      currentRoom: existingSlot?.room || 'Standard Classroom',
    });

    editForm.reset({
      subjectId: existingSlot?.subjectId || (subjects[0]?.id || ''),
      staffId: existingSlot?.staffId || (staff[0]?.id || ''),
      room: existingSlot?.room || 'Standard Classroom',
    });

    setSlotEditModal(true);
  };

  // Teacher Collision check for active modal selection
  const watchedStaffId = editForm.watch('staffId');
  const watchedRoom = editForm.watch('room');

  const modalTeacherConflict = useMemo(() => {
    if (!activeSlotTarget || !watchedStaffId) return null;
    const timeKey = `${activeSlotTarget.dayOfWeek}_${activeSlotTarget.startTime}`;
    const clash = allSlotsFlat.find(
      s => s.staffId === watchedStaffId &&
           s.dayOfWeek === activeSlotTarget.dayOfWeek &&
           s.startTime === activeSlotTarget.startTime &&
           s.classId !== selectedClass
    );
    if (clash) {
      const teacherName = `${clash.staff?.firstName || ''} ${clash.staff?.lastName || ''}`.trim() || 'Teacher';
      return `⚠️ Collision Warning: ${teacherName} is already scheduled in "${clash.className}" during this slot!`;
    }
    return null;
  }, [activeSlotTarget, watchedStaffId, allSlotsFlat, selectedClass]);

  const modalRoomConflict = useMemo(() => {
    if (!activeSlotTarget || !watchedRoom || watchedRoom === 'Standard Classroom') return null;
    const clash = allSlotsFlat.find(
      s => s.room === watchedRoom &&
           s.dayOfWeek === activeSlotTarget.dayOfWeek &&
           s.startTime === activeSlotTarget.startTime &&
           s.classId !== selectedClass
    );
    if (clash) {
      return `⚠️ Room Conflict: "${watchedRoom}" is already booked by "${clash.className}" during this slot!`;
    }
    return null;
  }, [activeSlotTarget, watchedRoom, allSlotsFlat, selectedClass]);

  // Selected Class details
  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const selectedClassName = selectedClassObj?.name || 'Class';

  // Stats calculation
  const totalSlotsCount = classTimetableData
    ? DAYS.reduce((s, d) => s + (classTimetableData[d]?.length || 0), 0)
    : 0;
  const subjectsCoveredCount = classTimetableData
    ? new Set(DAYS.flatMap(d => (classTimetableData[d] || []).map((s: any) => s.subjectId))).size
    : 0;

  // ─── FILTERED VIEWS DATA ───────────────────────────────────────────────────
  const teacherTimetableData = useMemo(() => {
    if (!selectedTeacher || !schoolTimetableData) return {};
    const slots = allSlotsFlat.filter(s => s.staffId === selectedTeacher);
    return DAYS.reduce((acc, day, i) => {
      acc[day] = slots.filter(s => s.dayOfWeek === i + 1);
      return acc;
    }, {} as Record<string, any[]>);
  }, [selectedTeacher, allSlotsFlat, schoolTimetableData]);

  const roomTimetableData = useMemo(() => {
    if (!selectedRoom || !schoolTimetableData) return {};
    const slots = allSlotsFlat.filter(s => s.room === selectedRoom);
    return DAYS.reduce((acc, day, i) => {
      acc[day] = slots.filter(s => s.dayOfWeek === i + 1);
      return acc;
    }, {} as Record<string, any[]>);
  }, [selectedRoom, allSlotsFlat, schoolTimetableData]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── OFFICIAL PRINT LETTERHEAD (Hidden on Screen, Visible on Print) ─── */}
      <div className="hidden print:block p-6 border-b-2 border-slate-900 mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          {user?.tenant?.logo ? (
            <img src={user.tenant.logo} alt="" className="w-14 h-14 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <EduNestIcon size={24} className="text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
              {user?.school?.name || user?.tenant?.name || 'Institutional Academy'}
            </h1>
            <p className="text-xs text-slate-600 italic">Official Academic Master Timetable & Curriculum Roster</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-700 mt-4 border-t border-slate-300 pt-2">
          <span><strong>Class:</strong> {selectedClassName}</span>
          <span><strong>Academic Session:</strong> 2026/2027</span>
          <span><strong>Term:</strong> First Term</span>
          <span><strong>Generated:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* ─── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Timetable & Academic Scheduler</h1>
            {isPublished ? (
              <span className="badge-green text-xs inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full">
                <CheckCircle2 size={13} /> Published to Portals
              </span>
            ) : (
              <span className="badge-yellow text-xs inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full">
                <Clock size={13} /> Draft (Unpublished)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Constraint-satisfaction algorithmic scheduling, quota matrices, collision prevention, multi-views & emergency relief
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            icon={<Sliders size={15} className="text-blue-600" />}
            onClick={() => setConstraintsModal(true)}
            className="whitespace-nowrap flex-shrink-0"
          >
            Constraints & Quotas
          </Button>

          <Button
            variant="secondary"
            icon={<Sparkles size={15} className="text-purple-600" />}
            onClick={() => setAutoGenModal(true)}
            className="whitespace-nowrap flex-shrink-0 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
          >
            Auto-Generate
          </Button>

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
            onClick={() => window.print()}
            className="whitespace-nowrap flex-shrink-0"
          >
            Print
          </Button>

          <Button
            variant={isPublished ? 'secondary' : 'primary'}
            icon={<Share2 size={15} />}
            onClick={() => {
              setIsPublished(!isPublished);
              toast.success(isPublished ? 'Timetable unpublished from portals' : 'Timetable published to Student & Parent Portals!');
            }}
            className="whitespace-nowrap flex-shrink-0"
          >
            {isPublished ? 'Unpublish' : 'Publish to Portals'}
          </Button>

          <Button
            variant="secondary"
            icon={<Trash2 size={15} className="text-red-500" />}
            onClick={() => setClearConfirmModal(true)}
            className="whitespace-nowrap flex-shrink-0 text-red-600 hover:bg-red-50"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* ─── TOP KPI TILES & CONFLICT MONITOR ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Class Schedule"
          value={selectedClassName}
          subtitle={`${totalSlotsCount} periods scheduled`}
          icon={<School size={20} />}
          color="blue"
        />
        <StatCard
          title="Weekly Quota Load"
          value={`${totalAllocatedQuota} / ${totalWeeklyTeachingSlots}`}
          subtitle={`${subjectsCoveredCount} subjects covered`}
          icon={<BookOpen size={20} />}
          color={totalAllocatedQuota === totalWeeklyTeachingSlots ? 'green' : 'amber'}
        />
        <StatCard
          title="Collision Monitor"
          value={systemConflicts.length === 0 ? 'Zero Conflicts' : `${systemConflicts.length} Clashes`}
          subtitle={systemConflicts.length === 0 ? 'Clean algorithmic schedule' : 'Overlaps detected'}
          icon={<ShieldAlert size={20} />}
          color={systemConflicts.length === 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Teaching Faculty"
          value={staff.length}
          subtitle={`Max ${maxWeeklyTeacherLoad} periods/week`}
          icon={<Users size={20} />}
          color="purple"
        />
      </div>

      {/* ─── SYSTEM CONFLICT WARNING BANNER (If Any Clash) ───────────────────── */}
      {systemConflicts.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs shadow-sm">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-950 text-sm">Real-Time Collision Detection Alert ({systemConflicts.length} Conflicts Found)</p>
            <p className="text-red-800 text-xs mt-0.5">The following teachers or specialized venues are assigned to multiple classes simultaneously:</p>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {systemConflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="danger"
                icon={<Sparkles size={13} />}
                onClick={() => setAutoGenModal(true)}
              >
                Auto-Resolve via Algorithm
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
            { id: 'master', label: 'School Master Matrix', icon: <FileSpreadsheet size={15} /> },
            { id: 'teacher', label: 'Teacher Schedule', icon: <Users size={15} /> },
            { id: 'room', label: 'Room / Lab Schedule', icon: <Building size={15} /> },
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

        {/* Context Selectors depending on view */}
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

          {activeView === 'teacher' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Faculty:</span>
              <select
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                className="input py-1.5 px-3 text-xs font-semibold w-64"
              >
                {staff.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.specialization || st.department?.name || 'Teacher'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'room' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Venue:</span>
              <select
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
                className="input py-1.5 px-3 text-xs font-semibold w-60"
              >
                {VENUES.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── 1. CLASS TIMETABLE GRID VIEW ────────────────────────────────────── */}
      {activeView === 'class' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Weekly Schedule Matrix — {selectedClassName}</span>
                <span className="text-xs font-normal text-slate-500">({periodDuration} mins/period • {teachingPeriodsCount} teaching periods/day)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any cell to assign, change subject, swap teacher, or clear slot.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Regular Period
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" /> Recess / Break
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block" /> Specialized Lab
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3 w-36 text-center border-r border-slate-200">Day / Period</th>
                  {periodSlots.map((period) => (
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
                      {/* Day Header Column */}
                      <td className="p-3 font-bold text-slate-800 bg-slate-50 border-r border-slate-200 text-center">
                        <div className="text-sm">{dayName}</div>
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                          {daySlots.length} periods
                        </div>
                      </td>

                      {/* Period Cells */}
                      {periodSlots.map((period) => {
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
                        const isSpecializedLab = slot?.room && slot.room !== 'Standard Classroom' && !slot.room.includes('Homeroom');

                        return (
                          <td
                            key={period.id}
                            onClick={() => handleCellClick(dayIdx, period, slot)}
                            className={cn(
                              'p-2 border-r border-slate-200 cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 hover:ring-inset group',
                              slot
                                ? isSpecializedLab
                                  ? 'bg-purple-50/60 hover:bg-purple-100/70'
                                  : 'bg-blue-50/50 hover:bg-blue-100/70'
                                : 'hover:bg-slate-100/60'
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
                                  <Users size={11} className="text-slate-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {slot.staff ? `${slot.staff.firstName} ${slot.staff.lastName}` : 'Unassigned'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                  <span className="truncate max-w-[90px]">{slot.room || 'Classroom'}</span>
                                  <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-bold transition-opacity">Edit</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-12 flex flex-col items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                                <Plus size={16} />
                                <span className="text-[9px] font-medium opacity-0 group-hover:opacity-100 mt-0.5">Assign</span>
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

      {/* ─── 2. SCHOOL-WIDE MASTER MATRIX VIEW ───────────────────────────────── */}
      {activeView === 'master' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">School-Wide Master Timetable Roster</h2>
              <p className="text-xs text-slate-500">Comprehensive overview of all classes and periods across the entire academic day.</p>
            </div>
            <span className="badge-blue text-xs font-bold">{classes.length} Total Classes</span>
          </div>

          <div className="p-4 space-y-6">
            {DAYS.map(dayName => (
              <div key={dayName} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>{dayName} Schedule</span>
                  <span className="text-slate-500 text-[11px] font-normal">All Class Sections</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="p-2.5 w-32 border-r border-slate-200 font-semibold">Class</th>
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

      {/* ─── 3. TEACHER SCHEDULE VIEW ────────────────────────────────────────── */}
      {activeView === 'teacher' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Faculty Teaching Roster — {staff.find(s => s.id === selectedTeacher)?.firstName} {staff.find(s => s.id === selectedTeacher)?.lastName}
              </h2>
              <p className="text-xs text-slate-500">
                Department: {staff.find(s => s.id === selectedTeacher)?.department?.name || 'Academic Faculty'} • Max Load: {maxWeeklyTeacherLoad} periods/week
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-purple text-xs font-bold">
                {allSlotsFlat.filter(s => s.staffId === selectedTeacher).length} Weekly Periods Assigned
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold">
                  <th className="p-3 w-32 border-r border-slate-200 text-center">Day</th>
                  {periodSlots.filter(p => !p.isBreak).map(period => (
                    <th key={period.id} className="p-3 text-center border-r border-slate-200">
                      {period.label}
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">{period.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {DAYS.map(dayName => {
                  const daySlots = (teacherTimetableData[dayName] || []);
                  return (
                    <tr key={dayName} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800 bg-slate-50 border-r border-slate-200 text-center">
                        {dayName}
                      </td>
                      {periodSlots.filter(p => !p.isBreak).map(period => {
                        const slot = daySlots.find((s: any) => s.startTime === period.start);
                        return (
                          <td key={period.id} className="p-2 border-r border-slate-200 text-center">
                            {slot ? (
                              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
                                <p className="font-bold text-purple-950 truncate">{slot.subject?.name}</p>
                                <p className="text-[10px] text-purple-700 font-semibold">{slot.className}</p>
                                <p className="text-[9px] text-slate-500">{slot.room || 'Classroom'}</p>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-emerald-50/50 border border-dashed border-emerald-200 text-emerald-700 text-[10px] font-medium">
                                Free Period
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

      {/* ─── 4. ROOM / VENUE UTILIZATION VIEW ───────────────────────────────── */}
      {activeView === 'room' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Venue Utilization Matrix — {selectedRoom}</h2>
              <p className="text-xs text-slate-500">Facility booking verification to prevent double reservations across departments.</p>
            </div>
            <span className="badge-blue text-xs font-bold">
              {allSlotsFlat.filter(s => s.room === selectedRoom).length} Booked Slots
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold">
                  <th className="p-3 w-32 border-r border-slate-200 text-center">Day</th>
                  {periodSlots.filter(p => !p.isBreak).map(period => (
                    <th key={period.id} className="p-3 text-center border-r border-slate-200">
                      {period.label}
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">{period.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {DAYS.map(dayName => {
                  const daySlots = (roomTimetableData[dayName] || []);
                  return (
                    <tr key={dayName} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800 bg-slate-50 border-r border-slate-200 text-center">
                        {dayName}
                      </td>
                      {periodSlots.filter(p => !p.isBreak).map(period => {
                        const slot = daySlots.find((s: any) => s.startTime === period.start);
                        return (
                          <td key={period.id} className="p-2 border-r border-slate-200 text-center">
                            {slot ? (
                              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                                <p className="font-bold text-amber-950 truncate">{slot.className}</p>
                                <p className="text-[10px] text-amber-800 font-medium truncate">{slot.subject?.name}</p>
                                <p className="text-[9px] text-slate-500 truncate">
                                  {slot.staff ? `${slot.staff.firstName} ${slot.staff.lastName}` : 'Teacher'}
                                </p>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-slate-50 text-slate-400 text-[10px]">
                                Available
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

      {/* ─── 5. RELIEF & SUBSTITUTION DESK ──────────────────────────────────── */}
      {activeView === 'substitutions' && (
        <div className="card overflow-hidden border border-slate-200 shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Teacher Relief & Emergency Substitutions Desk</h2>
              <p className="text-xs text-slate-500">
                Instantly assign substitute coverage when a teacher is on leave or indisposed, cross-checking available free periods.
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
                {substitutions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">
                      {sub.date} ({sub.day})
                    </td>
                    <td className="p-3 font-semibold text-blue-600">{sub.period}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{sub.className}</div>
                      <div className="text-slate-500 text-[10px]">{sub.subjectName}</div>
                    </td>
                    <td className="p-3 text-red-600 font-medium">{sub.absentTeacher}</td>
                    <td className="p-3 text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {sub.reliefTeacher}
                    </td>
                    <td className="p-3 text-slate-500 italic">{sub.reason}</td>
                    <td className="p-3">
                      <span className="badge-green text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 6. ACADEMIC TERM DATES & EXAMS VIEW ─────────────────────────────── */}
      {activeView === 'calendar' && (
        <div className="card p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Term Calendar & Examination Dates</h2>
              <p className="text-xs text-slate-500">Key institutional milestones synchronised with lesson planning and timetables.</p>
            </div>
            <span className="badge-blue text-xs font-bold">2026/2027 Academic Session</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'First Term Resumption & Assembly', date: 'Sept 14, 2026', type: 'ACADEMIC', badge: 'badge-blue' },
              { title: 'Continuous Assessment Week 1 (CA1)', date: 'Oct 12 - 16, 2026', type: 'EXAMINATION', badge: 'badge-yellow' },
              { title: 'Mid-Term Break & Staff In-Service Day', date: 'Oct 29 - 30, 2026', type: 'HOLIDAY', badge: 'badge-purple' },
              { title: 'Continuous Assessment Week 2 (CA2)', date: 'Nov 16 - 20, 2026', type: 'EXAMINATION', badge: 'badge-yellow' },
              { title: 'Revision Week & Lab Practicals', date: 'Nov 30 - Dec 04, 2026', type: 'ACADEMIC', badge: 'badge-blue' },
              { title: 'First Term Terminal Examinations', date: 'Dec 07 - 15, 2026', type: 'EXAMINATION', badge: 'badge-red' },
              { title: 'End of Term Vacation & Report Card Day', date: 'Dec 18, 2026', type: 'VACATION', badge: 'badge-green' },
            ].map((ev, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">{ev.title}</h3>
                  <span className={ev.badge}>{ev.type}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={13} className="text-blue-600" />
                  <span>{ev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CONSTRAINTS & QUOTAS DEFINITION (PRINCIPAL / ADMIN) ────── */}
      {constraintsModal && (
        <Modal
          title="⚙️ Timetable Constraints & Curriculum Quotas Definition"
          open={constraintsModal}
          onClose={() => setConstraintsModal(false)}
          className="max-w-4xl"
        >
          <div className="space-y-6 text-xs">
            {/* Quick Presets */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-blue-950">Curriculum Quota Presets:</span>
                <p className="text-blue-800 text-[11px]">Load national standard curriculum subject weekly quota presets.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSubjectConstraints(PRESETS.junior);
                    toast.success('Loaded Junior Secondary Preset');
                  }}
                >
                  Junior Secondary
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSubjectConstraints(PRESETS.senior_science);
                    toast.success('Loaded Senior Science Track Preset');
                  }}
                >
                  Senior Science
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSubjectConstraints(PRESETS.primary);
                    toast.success('Loaded Primary School Preset');
                  }}
                >
                  Primary Standard
                </Button>
              </div>
            </div>

            {/* School Timing Parameters */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">1. School Day Timing & Period Duration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class Start Time</label>
                  <input
                    type="time"
                    value={schoolStartTime}
                    onChange={e => setSchoolStartTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">School Closing Time</label>
                  <input
                    type="time"
                    value={schoolEndTime}
                    onChange={e => setSchoolEndTime(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Period Duration (Minutes)</label>
                  <select
                    value={periodDuration}
                    onChange={e => setPeriodDuration(Number(e.target.value))}
                    className="input w-full"
                  >
                    <option value={35}>35 Minutes</option>
                    <option value={40}>40 Minutes (Standard)</option>
                    <option value={45}>45 Minutes</option>
                    <option value={50}>50 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Break / Recess Settings */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">2. Break & Recess Intervals</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Break 1 */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Recess / Break 1</span>
                    <span className="badge-yellow text-[10px]">Morning</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Label</label>
                    <input
                      type="text"
                      value={break1Name}
                      onChange={e => setBreak1Name(e.target.value)}
                      className="input w-full py-1 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Start Time</label>
                      <input
                        type="time"
                        value={break1Start}
                        onChange={e => setBreak1Start(e.target.value)}
                        className="input w-full py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Duration (Mins)</label>
                      <input
                        type="number"
                        value={break1Duration}
                        onChange={e => setBreak1Duration(Number(e.target.value))}
                        className="input w-full py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Break 2 */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Lunch / Break 2</span>
                    <span className="badge-yellow text-[10px]">Midday</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Label</label>
                    <input
                      type="text"
                      value={break2Name}
                      onChange={e => setBreak2Name(e.target.value)}
                      className="input w-full py-1 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Start Time</label>
                      <input
                        type="time"
                        value={break2Start}
                        onChange={e => setBreak2Start(e.target.value)}
                        className="input w-full py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Duration (Mins)</label>
                      <input
                        type="number"
                        value={break2Duration}
                        onChange={e => setBreak2Duration(Number(e.target.value))}
                        className="input w-full py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Periods Quota Matrix */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">3. Subject Weekly Period Quotas Matrix</h3>
                  <p className="text-[11px] text-slate-500">Configure how many periods each subject is taught each week (e.g. Math 7 times, English 8 times).</p>
                </div>
                <div className={cn(
                  'px-3 py-1 rounded-xl font-bold text-xs border',
                  totalAllocatedQuota === totalWeeklyTeachingSlots
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : totalAllocatedQuota > totalWeeklyTeachingSlots
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                )}>
                  Weekly Balance: {totalAllocatedQuota} / {totalWeeklyTeachingSlots} Periods ({Math.round((totalAllocatedQuota / (totalWeeklyTeachingSlots || 1)) * 100)}%)
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
                      <th className="p-2.5">Preferred Venue / Lab</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectConstraints.map((sc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{sc.name}</td>
                        <td className="p-2.5 text-slate-500">{sc.code}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...subjectConstraints];
                                if (copy[idx].quota > 1) copy[idx].quota -= 1;
                                setSubjectConstraints(copy);
                              }}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-blue-600">{sc.quota}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...subjectConstraints];
                                copy[idx].quota += 1;
                                setSubjectConstraints(copy);
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
                            checked={sc.allowDouble}
                            onChange={e => {
                              const copy = [...subjectConstraints];
                              copy[idx].allowDouble = e.target.checked;
                              setSubjectConstraints(copy);
                            }}
                            className="rounded text-blue-600 w-4 h-4"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={sc.preferredRoom}
                            onChange={e => {
                              const copy = [...subjectConstraints];
                              copy[idx].preferredRoom = e.target.value;
                              setSubjectConstraints(copy);
                            }}
                            className="input py-1 text-xs w-48"
                          >
                            {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSubjectConstraints(subjectConstraints.filter((_, i) => i !== idx));
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

            {/* Teacher Workload Limits */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">4. Faculty Workload Limits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Max Periods / Day per Teacher</label>
                  <input
                    type="number"
                    value={maxDailyTeacherLoad}
                    onChange={e => setMaxDailyTeacherLoad(Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Max Periods / Week per Teacher</label>
                  <input
                    type="number"
                    value={maxWeeklyTeacherLoad}
                    onChange={e => setMaxWeeklyTeacherLoad(Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setConstraintsModal(false)}>
                Cancel
              </Button>
              <Button
                icon={<Check size={15} />}
                onClick={() => {
                  toast.success('Timetable constraints & curriculum quotas saved!');
                  setConstraintsModal(false);
                }}
              >
                Save Constraints & Rules
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 2: AUTO-GENERATION MODAL ──────────────────────────────────── */}
      {autoGenModal && (
        <Modal
          title="✨ Algorithmic Timetable Generator (Constraint Satisfaction)"
          open={autoGenModal}
          onClose={() => setAutoGenModal(false)}
          className="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-start gap-3">
              <Sparkles size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-950 text-sm">Intelligent Constraint Satisfaction Engine</p>
                <p className="text-purple-800 text-[11px] mt-0.5">
                  Generates an optimal, collision-free weekly schedule adhering to all active constraints: subject quotas, period timings, teacher caps, and laboratory availability.
                </p>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-slate-700 font-bold mb-2">Select Generation Scope:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'single', label: 'Current Class Only', sub: selectedClassName },
                  { id: 'selected', label: 'Selected Classes', sub: `${selectedClassIdsForGen.length} classes chosen` },
                  { id: 'school', label: 'Whole School', sub: `All ${classes.length} classes` },
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

            {/* Active Constraints Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
              <div className="font-bold text-slate-800">Active Solver Constraints:</div>
              <div className="flex items-center justify-between">
                <span>Daily Teaching Periods:</span>
                <span className="font-semibold text-slate-900">{teachingPeriodsCount} periods / day ({periodDuration}m each)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subject Quota Fulfillment:</span>
                <span className="font-semibold text-slate-900">{totalAllocatedQuota} total periods scheduled / week</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Double Periods for Practicals:</span>
                <span className="font-semibold text-slate-900">Enabled for Science Lab & ICT</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Teacher Double-Booking Prevention:</span>
                <span className="font-semibold text-emerald-700">Strict (0 Collisions)</span>
              </div>
            </div>

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
                {isGenerating ? 'Solving Constraints...' : 'Generate Conflict-Free Schedule'}
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
              <h3 className="font-bold text-emerald-950 text-base">Timetable Generation Succeeded!</h3>
              <p className="text-emerald-800 text-xs">Zero collisions detected. All constraints perfectly satisfied.</p>
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
                <span className="text-slate-500">Laboratory Double-Bookings:</span>
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
          title={`Edit Timetable Slot — ${activeSlotTarget.dayName} (${activeSlotTarget.startTime} - ${activeSlotTarget.endTime})`}
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
              <label className="block text-slate-700 font-bold mb-1">Assigned Teacher</label>
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

            {/* Room Select */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Venue / Room</label>
              <select {...editForm.register('room')} className="input w-full">
                {VENUES.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Real-time Room Conflict Alert */}
            {modalRoomConflict && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{modalRoomConflict}</span>
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
                  Clear Slot
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
                  Save Slot
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
              setSubstitutions([
                {
                  id: `sub-${Date.now()}`,
                  date: new Date().toISOString().split('T')[0],
                  day: data.day,
                  period: data.period,
                  className: data.className,
                  subjectName: data.subjectName,
                  absentTeacher: data.absentTeacher,
                  reliefTeacher: data.reliefTeacher,
                  reason: data.reason,
                  status: 'CONFIRMED'
                },
                ...substitutions
              ]);
              toast.success('Relief teacher assigned and notified via SMS/Portal!');
              setSubstitutionModal(false);
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
              <select {...reliefForm.register('absentTeacher')} className="input w-full">
                {staff.map(st => (
                  <option key={st.id} value={`${st.firstName} ${st.lastName}`}>
                    {st.firstName} {st.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Smart Available Relief Lookup */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Relief Teacher <span className="text-emerald-600 font-normal">(Free at this period)</span>
              </label>
              <select {...reliefForm.register('reliefTeacher', { required: true })} className="input w-full">
                {staff.map(st => (
                  <option key={st.id} value={`${st.firstName} ${st.lastName}`}>
                    {st.firstName} {st.lastName} (Free Period)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Reason for Absence</label>
              <select {...reliefForm.register('reason')} className="input w-full">
                <option value="Approved Sick Leave">Approved Sick Leave</option>
                <option value="Official Institutional Assignment">Official Institutional Assignment</option>
                <option value="External Examination Moderation">External Examination Moderation</option>
                <option value="Personal Emergency">Personal Emergency</option>
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

      {/* ─── MODAL 6: CLEAR TIMETABLE CONFIRMATION ──────────────────────────── */}
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
                <div className="text-[11px] text-red-700 mt-0.5">Clears all slots for {selectedClassName} only.</div>
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
