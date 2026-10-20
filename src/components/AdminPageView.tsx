import React, { useState, useMemo } from 'react';
import {
  Staff,
  ScheduleEvent,
  AttendanceRecord,
  ClinicSettings,
  TodayStaffStatus,
  ClinicHoliday,
} from '../types';
import {
  adminUpdateScheduleStatus,
  adminUpdateAttendance,
  adminCreateManualAttendance,
  adminDeleteAttendance,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  updateClinicSettings,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  resetHolidays,
} from '../api';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  Plus,
  Trash2,
  Edit,
  Save,
  Download,
  AlertTriangle,
  Lock,
  Unlock,
  Building,
  KeyRound,
  FileCheck,
  Sun,
  Moon,
  CalendarDays,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AdminPageViewProps {
  currentStaff: Staff | null;
  staffList: Staff[];
  schedules: ScheduleEvent[];
  attendanceRecords: AttendanceRecord[];
  todayRecords: TodayStaffStatus[];
  clinicSettings: ClinicSettings;
  holidays?: ClinicHoliday[];
  onRefresh: () => void;
  onSelectStaff: (staff: Staff) => void;
}

type AdminSubTab = 'approvals' | 'abnormal' | 'staff' | 'holidays' | 'settings';

export const AdminPageView: React.FC<AdminPageViewProps> = ({
  currentStaff,
  staffList,
  schedules,
  attendanceRecords,
  todayRecords,
  clinicSettings,
  holidays = [],
  onRefresh,
  onSelectStaff,
}) => {
  // Authentication State
  const masterPin = clinicSettings.adminPin || '1234';
  const isHighAdminRole =
    currentStaff?.role === '대표원장' || currentStaff?.role === '총괄실장';

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return isHighAdminRole || sessionStorage.getItem('dangsan_admin_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Sub tab state
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('approvals');

  // Approvals filter state
  const [approvalFilter, setApprovalFilter] = useState<'대기' | '전체' | '완료' | '반려'>('대기');
  const [rejectingScheduleId, setRejectingScheduleId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Abnormal Attendance modal / form state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    staffId: staffList[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    clockInTime: '09:15:00',
    clockOutTime: '18:30:00',
    status: '정상출근',
    correctionReason: '관리자 수기 승인',
  });

  // Staff modal / form state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: '치과위생사' as Staff['role'],
    department: '치위생팀' as Staff['department'],
    phone: '',
    totalLeaveDays: 15,
    usedLeaveDays: 0,
    birthDate: '1998-01-01',
    zodiac: '처녀자리',
    motto: '',
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    ...clinicSettings,
    adminPin: masterPin,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));

  // Holiday management state
  const [holidayFilter, setHolidayFilter] = useState<'all' | 'half' | 'closed' | 'custom' | 'public'>('all');
  const [holidaySearchQuery, setHolidaySearchQuery] = useState('');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<ClinicHoliday | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    type: '반일진료' as ClinicHoliday['type'],
    openTime: '09:30',
    closeTime: '13:30',
    isPublicHoliday: true,
    memo: '공휴일 오전 집중 반일진료',
  });
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);

  // --- Handlers: Authentication ---
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === masterPin) {
      setIsUnlocked(true);
      setPinError(false);
      sessionStorage.setItem('dangsan_admin_unlocked', 'true');
    } else {
      setPinError(true);
    }
  };

  const handleQuickSwitchToAdmin = () => {
    const chief = staffList.find((s) => s.role === '대표원장') || staffList.find((s) => s.role === '총괄실장');
    if (chief) {
      onSelectStaff(chief);
      setIsUnlocked(true);
      sessionStorage.setItem('dangsan_admin_unlocked', 'true');
    }
  };

  // --- Handlers: Schedule Approval ---
  const handleApproveSchedule = async (id: string) => {
    try {
      const approverName = currentStaff ? `${currentStaff.name} ${currentStaff.role}` : '최상위 관리자';
      await adminUpdateScheduleStatus(id, '승인완료', approverName);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '승인에 실패했습니다.');
    }
  };

  const handleRejectSchedule = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    try {
      const approverName = currentStaff ? `${currentStaff.name} ${currentStaff.role}` : '최상위 관리자';
      await adminUpdateScheduleStatus(id, '반려', approverName, rejectReason);
      setRejectingScheduleId(null);
      setRejectReason('');
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '반려 처리에 실패했습니다.');
    }
  };

  // --- Handlers: Attendance Corrections ---
  const handleExcuseLate = async (recordId: string, staffName: string) => {
    if (!confirm(`${staffName} 직원의 지각을 '정상출근(소명 승인)'으로 처리하시겠습니까?`)) return;
    try {
      await adminUpdateAttendance(recordId, {
        status: '정상출근',
        correctionStatus: '소명승인',
        correctionReason: '최고관리자 지각 소명 승인 (정상 인정)',
      });
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '수정에 실패했습니다.');
    }
  };

  const handleSetClockOut = async (recordId: string, defaultTime = '18:30:00') => {
    const time = prompt('퇴근 시간을 입력하세요 (HH:mm:ss):', defaultTime);
    if (!time) return;
    try {
      await adminUpdateAttendance(recordId, {
        clockOutTime: time,
        status: '퇴근완료',
        correctionStatus: '퇴근누락수정',
        correctionReason: '퇴근 미체크 관리자 수기 지정',
      });
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '퇴근 처리에 실패했습니다.');
    }
  };

  const handleDeleteAttendance = async (recordId: string) => {
    if (!confirm('이 근태 기록을 완전히 삭제하시겠습니까?')) return;
    try {
      await adminDeleteAttendance(recordId);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '삭제에 실패했습니다.');
    }
  };

  const handleManualAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminCreateManualAttendance(manualForm);
      setShowManualModal(false);
      onRefresh();
      alert('수기 근태가 성공적으로 등록되었습니다.');
    } catch (err: unknown) {
      alert((err as Error).message || '등록에 실패했습니다.');
    }
  };

  // --- Handlers: Staff Management ---
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      name: '',
      role: '치과위생사',
      department: '치위생팀',
      phone: '',
      totalLeaveDays: 15,
      usedLeaveDays: 0,
      birthDate: '1998-01-01',
      zodiac: '처녀자리',
      motto: '',
    });
    setShowStaffModal(true);
  };

  const handleOpenEditStaff = (s: Staff) => {
    setEditingStaff(s);
    setStaffForm({
      name: s.name,
      role: s.role,
      department: s.department,
      phone: s.phone,
      totalLeaveDays: s.totalLeaveDays,
      usedLeaveDays: s.usedLeaveDays,
      birthDate: s.birthDate || '1998-01-01',
      zodiac: s.zodiac || '처녀자리',
      motto: s.motto || '',
    });
    setShowStaffModal(true);
  };

  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await updateStaffMember(editingStaff.id, staffForm);
      } else {
        await addStaffMember(staffForm);
      }
      setShowStaffModal(false);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '직원 정보 처리에 실패했습니다.');
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`'${name}' 직원을 정말로 삭제(퇴사 처리)하시겠습니까?`)) return;
    try {
      await deleteStaffMember(id);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '삭제에 실패했습니다.');
    }
  };

  // --- Handlers: Settings Save ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateClinicSettings(settingsForm);
      alert('치과 기본 운영 및 마스터 PIN 설정이 저장되었습니다.');
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '설정 저장에 실패했습니다.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // --- Handlers: Holiday & Clinic Schedule Management ---
  const handleOpenAddHoliday = (presetDate?: string) => {
    setEditingHoliday(null);
    setHolidayForm({
      date: presetDate || new Date().toISOString().split('T')[0],
      name: '',
      type: '반일진료',
      openTime: '09:30',
      closeTime: '13:30',
      isPublicHoliday: true,
      memo: '공휴일 오전 집중 반일진료',
    });
    setShowHolidayModal(true);
  };

  const handleOpenEditHoliday = (h: ClinicHoliday) => {
    setEditingHoliday(h);
    setHolidayForm({
      date: h.date,
      name: h.name,
      type: h.type,
      openTime: h.openTime || '09:30',
      closeTime: h.closeTime || (h.type === '반일진료' ? '13:30' : '18:30'),
      isPublicHoliday: h.isPublicHoliday !== undefined ? !!h.isPublicHoliday : true,
      memo: h.memo || '',
    });
    setShowHolidayModal(true);
  };

  const handleHolidayFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name.trim()) {
      alert('휴무일 또는 진료일정 명칭을 입력해주세요.');
      return;
    }
    setIsSavingHoliday(true);
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, holidayForm);
      } else {
        await createHoliday(holidayForm);
      }
      setShowHolidayModal(false);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '휴무일 저장에 실패했습니다.');
    } finally {
      setIsSavingHoliday(false);
    }
  };

  const handleQuickToggleHoliday = async (
    h: ClinicHoliday,
    nextType: '전체휴진' | '반일진료' | '정상진료'
  ) => {
    try {
      await updateHoliday(h.id, {
        type: nextType,
        openTime: nextType === '반일진료' ? '09:30' : nextType === '정상진료' ? '09:30' : undefined,
        closeTime: nextType === '반일진료' ? '13:30' : nextType === '정상진료' ? '18:30' : undefined,
        memo:
          nextType === '반일진료'
            ? '공휴일 오전 집중 반일진료'
            : nextType === '전체휴진'
            ? '치과 전체 휴진'
            : '치과 정상 진료',
      });
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '휴무일 상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`'${name}' 휴무일 설정을 삭제하시겠습니까?`)) return;
    try {
      await deleteHoliday(id);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '삭제에 실패했습니다.');
    }
  };

  const handleResetHolidays = async () => {
    if (
      !confirm(
        '한국 달력 공휴일 및 당산원치과 기본 진료일정(삼일절, 현충일, 광복절, 개천절, 한글날 반일진료 등)으로 초기화하시겠습니까?'
      )
    ) {
      return;
    }
    try {
      await resetHolidays();
      alert('치과 휴무일 및 공휴일 반일진료 기본 설정이 성공적으로 초기화되었습니다.');
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '초기화에 실패했습니다.');
    }
  };

  // Displayed holidays according to filter and search
  const displayedHolidays = useMemo(() => {
    return (holidays || []).filter((h) => {
      if (holidaySearchQuery.trim()) {
        const query = holidaySearchQuery.toLowerCase();
        const matchesName = h.name.toLowerCase().includes(query);
        const matchesDate = h.date.includes(query);
        const matchesMemo = (h.memo || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDate && !matchesMemo) return false;
      }
      if (holidayFilter === 'half') return h.type === '반일진료';
      if (holidayFilter === 'closed') return h.type === '전체휴진';
      if (holidayFilter === 'custom') return !h.isPublicHoliday;
      if (holidayFilter === 'public') return !!h.isPublicHoliday;
      return true;
    });
  }, [holidays, holidayFilter, holidaySearchQuery]);

  // --- Data Calculations ---
  // Pending schedules
  const pendingSchedules = useMemo(() => {
    return schedules.filter(
      (s) => !s.approvalStatus || s.approvalStatus === '승인대기'
    );
  }, [schedules]);

  // Displayed schedules according to filter
  const displayedSchedules = useMemo(() => {
    if (approvalFilter === '대기') return pendingSchedules;
    if (approvalFilter === '완료') return schedules.filter((s) => s.approvalStatus === '승인완료');
    if (approvalFilter === '반려') return schedules.filter((s) => s.approvalStatus === '반려');
    return schedules;
  }, [schedules, approvalFilter, pendingSchedules]);

  // Abnormal attendances (late, missing clock out)
  const abnormalAttendances = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      // 1. 지각
      const isLate = rec.status === '지각';
      // 2. 미퇴근 (출근은 찍혔는데 퇴근시간 없음 & 오늘 이전 날짜이거나 당일 마감시간 경과)
      const isMissingOut = rec.clockInTime && !rec.clockOutTime && rec.status !== '퇴근완료';
      // 3. 소명 요청
      const hasCorrectionReq = rec.correctionStatus === '지각소명요청';
      return isLate || isMissingOut || hasCorrectionReq;
    });
  }, [attendanceRecords]);

  // If not unlocked, render Authentication Gate
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            최상위 관리자 전용 인증
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            당산원치과 최고 권한자(대표원장/총괄실장)만 접근 가능합니다. 마스터 PIN을 입력하세요.
          </p>

          <form onSubmit={handleVerifyPin} className="mt-5 space-y-3">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="마스터 PIN 4자리 (기본: 1234)"
                className="w-full text-center text-lg tracking-widest px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 font-semibold mt-1">
                  PIN 번호가 일치하지 않습니다. (초기 비밀번호: 1234)
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              관리자 모드 잠금 해제
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={handleQuickSwitchToAdmin}
              className="text-xs text-sky-600 hover:text-sky-700 font-bold underline"
            >
              [대표원장 박진우] 계정으로 즉시 전환하여 인증하기
            </button>
            <span className="text-[11px] text-slate-400">
              * 초기 마스터 PIN은 1234 입니다.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 text-xs">
      {/* 1. Admin Header & Top Control Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>당산원치과 최고관리자 센터</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                  ADMIN
                </span>
              </h2>
              <p className="text-[10px] text-slate-300">
                접속자: {currentStaff ? `${currentStaff.name} (${currentStaff.role})` : '최상위 관리자'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem('dangsan_admin_unlocked');
              setIsUnlocked(false);
            }}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/10"
            title="관리자 모드 잠금"
          >
            잠금
          </button>
        </div>

        {/* Admin Navigation Pills */}
        <div className="grid grid-cols-5 gap-1 mt-3 pt-2 border-t border-white/15">
          {[
            {
              id: 'approvals' as AdminSubTab,
              label: '휴가 승인',
              badge: pendingSchedules.length > 0 ? pendingSchedules.length : undefined,
              badgeColor: 'bg-rose-500',
            },
            {
              id: 'abnormal' as AdminSubTab,
              label: '근태 소명',
              badge: abnormalAttendances.length > 0 ? abnormalAttendances.length : undefined,
              badgeColor: 'bg-amber-500',
            },
            {
              id: 'staff' as AdminSubTab,
              label: '인원 관리',
              badge: staffList.length,
              badgeColor: 'bg-sky-600',
            },
            {
              id: 'holidays' as AdminSubTab,
              label: '휴무일 지정',
              badge: holidays.filter((h) => h.type === '반일진료').length > 0
                ? `${holidays.filter((h) => h.type === '반일진료').length}반일`
                : undefined,
              badgeColor: 'bg-amber-500',
            },
            {
              id: 'settings' as AdminSubTab,
              label: '치과 설정',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative ${
                activeSubTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`mt-0.5 text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full ${tab.badgeColor}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          SUB-TAB 1: 휴가 / 일정 승인 관리
         ======================================================== */}
      {activeSubTab === 'approvals' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                휴가 및 일정 승인 결재함
              </h3>
            </div>

            {/* Filter pills */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
              {(['대기', '전체', '완료', '반려'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setApprovalFilter(f)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    approvalFilter === f
                      ? 'bg-white text-sky-700 shadow-2xs font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {displayedSchedules.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              {approvalFilter === '대기'
                ? '현재 대기 중인 휴가/일정 승인 건이 없습니다.'
                : '해당 조건의 내역이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedSchedules.map((item) => {
                const staff = staffList.find((s) => s.id === item.staffId);
                const status = item.approvalStatus || '승인대기';
                const isPending = status === '승인대기';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      isPending
                        ? 'bg-rose-50/50 border-rose-200/80'
                        : status === '승인완료'
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-slate-100/60 border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs mt-0.5"
                          style={{ backgroundColor: staff?.color || '#0284c7' }}
                        >
                          {staff?.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">
                              {staff?.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {staff?.role} · {staff?.department}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                status === '승인대기'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                  : status === '승인완료'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                            >
                              {status}
                            </span>
                          </div>

                          <div className="font-bold text-slate-800 mt-1">
                            [{item.type}] {item.title}
                          </div>

                          <div className="text-[11px] text-slate-600 mt-0.5">
                            기간: <span className="font-semibold text-slate-800">{item.startDate}</span>
                            {item.endDate !== item.startDate && ` ~ ${item.endDate}`}
                          </div>

                          {item.description && (
                            <p className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-xl mt-1 border border-slate-200/60">
                              사유/메모: {item.description}
                            </p>
                          )}

                          {staff && (
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <span>잔여 연차: {staff.totalLeaveDays - staff.usedLeaveDays}일</span>
                              {item.approvedBy && (
                                <>
                                  <span>·</span>
                                  <span>결재자: {item.approvedBy}</span>
                                </>
                              )}
                              {item.rejectedReason && (
                                <>
                                  <span>·</span>
                                  <span className="text-rose-600 font-semibold">
                                    반려사유: {item.rejectedReason}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Approval Action Buttons */}
                      {isPending && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleApproveSchedule(item.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            승인
                          </button>
                          <button
                            onClick={() => setRejectingScheduleId(item.id)}
                            className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-95 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            반려
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reject reason input prompt */}
                    {rejectingScheduleId === item.id && (
                      <div className="mt-2.5 pt-2.5 border-t border-rose-200 flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="반려 사유 입력 (예: 당일 진료 인력 부족 등)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                        />
                        <button
                          onClick={() => handleRejectSchedule(item.id)}
                          className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-xl text-xs shrink-0"
                        >
                          반려 확정
                        </button>
                        <button
                          onClick={() => setRejectingScheduleId(null)}
                          className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs shrink-0"
                        >
                          취소
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

      {/* ========================================================
          SUB-TAB 2: 비정상 근태 관리 & 소명 승인
         ======================================================== */}
      {activeSubTab === 'abnormal' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                비정상 근태 관리 & 소명 승인
              </h3>
              <p className="text-[11px] text-slate-500">
                지각, 퇴근 누락, 미체크 직원의 근태를 소명 승인하거나 수기 수정합니다
              </p>
            </div>

            <button
              onClick={() => setShowManualModal(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs text-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> 수기 근태 등록
            </button>
          </div>

          {/* Abnormal Attendance List */}
          {abnormalAttendances.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              현재 확인된 지각이나 퇴근 미처리 등 비정상 근태 건이 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {abnormalAttendances.map((rec) => {
                const staff = staffList.find((s) => s.id === rec.staffId);
                const isLate = rec.status === '지각';
                const isMissingOut = rec.clockInTime && !rec.clockOutTime;

                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {staff?.name} ({staff?.role})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rec.date}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            isLate
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isLate ? '지각' : '퇴근미체크'}
                        </span>
                        {rec.correctionStatus && (
                          <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-semibold">
                            {rec.correctionStatus}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-700 mt-1 flex items-center gap-2">
                        <span>출근: {rec.clockInTime || '-'}</span>
                        <span>·</span>
                        <span>퇴근: {rec.clockOutTime || '미체크'}</span>
                      </div>

                      {rec.note && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          메모: {rec.note}
                        </div>
                      )}
                      {rec.correctionReason && (
                        <div className="text-[10px] text-sky-700 font-medium mt-0.5">
                          보정사유: {rec.correctionReason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {isLate && (
                        <button
                          onClick={() => handleExcuseLate(rec.id, staff?.name || '')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs"
                          title="정상근무로 소명 인정"
                        >
                          <CheckCircle2 className="w-3 h-3" /> 소명승인
                        </button>
                      )}

                      {isMissingOut && (
                        <button
                          onClick={() => handleSetClockOut(rec.id)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs"
                          title="퇴근 시간 수기 지정"
                        >
                          <Clock className="w-3 h-3" /> 퇴근지정
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteAttendance(rec.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md self-end"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: 직원 인원 추가 / 삭제 / 연차 강제 관리
         ======================================================== */}
      {activeSubTab === 'staff' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                치과 직원 인원 관리 ({staffList.length}명)
              </h3>
              <p className="text-[11px] text-slate-500">
                인원 추가, 퇴사자 삭제, 부서 변경 및 잔여 연차를 관리합니다
              </p>
            </div>
            <button
              onClick={handleOpenAddStaff}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 text-xs shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> 신규 직원 추가
            </button>
          </div>

          <div className="space-y-2">
            {staffList.map((s) => {
              const remaining = s.totalLeaveDays - s.usedLeaveDays;
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {s.name}
                        </span>
                        <span className="text-[11px] text-sky-700 font-semibold">
                          {s.role}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {s.department}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{s.phone || '연락처 없음'}</span>
                        <span>·</span>
                        <span>
                          연차: 부여 {s.totalLeaveDays}일 / 사용 {s.usedLeaveDays}일 (
                          <strong className="text-emerald-700">잔여 {remaining}일</strong>)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditStaff(s)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100"
                      title="정보 및 연차 수정"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {staffList.length > 1 && (
                      <button
                        onClick={() => handleDeleteStaff(s.id, s.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 bg-white border border-slate-200 hover:bg-rose-50"
                        title="직원 삭제(퇴사)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 4: 치과 휴무일 및 공휴일 반일진료 지정
         ======================================================== */}
      {activeSubTab === 'holidays' && (
        <div className="space-y-4">
          {/* Header Info & Actions */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                  <CalendarDays className="w-4 h-4 text-sky-600" />
                  <h3>치과 휴무일 및 공휴일 반일진료 지정</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  한국 달력 공휴일 중 당산원치과의 오전 반일진료일 및 전체 휴진일, 치과 지정 특별휴무를 관리합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetHolidays}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-semibold text-xs transition active:scale-95"
                  title="한국 공휴일 및 치과 기본 설정으로 복원"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  기본값 복원
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddHoliday()}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1 font-bold text-xs shadow-xs transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  휴무·반일진료 추가
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-2.5 text-center">
                <span className="text-[10px] text-amber-800 font-bold flex items-center justify-center gap-1">
                  <Sun className="w-3 h-3 text-amber-600" /> 공휴일 반일진료
                </span>
                <div className="text-lg font-black text-amber-950 mt-0.5 tabular-nums">
                  {holidays.filter((h) => h.type === '반일진료').length}
                  <span className="text-xs font-normal ml-0.5">일</span>
                </div>
                <span className="text-[9px] text-amber-700">09:30~13:30 오전진료</span>
              </div>

              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-2.5 text-center">
                <span className="text-[10px] text-rose-800 font-bold flex items-center justify-center gap-1">
                  <Moon className="w-3 h-3 text-rose-600" /> 치과 전체휴진
                </span>
                <div className="text-lg font-black text-rose-950 mt-0.5 tabular-nums">
                  {holidays.filter((h) => h.type === '전체휴진').length}
                  <span className="text-xs font-normal ml-0.5">일</span>
                </div>
                <span className="text-[9px] text-rose-700">설·추석·신정 등 휴무</span>
              </div>

              <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-2.5 text-center">
                <span className="text-[10px] text-sky-800 font-bold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-600" /> 치과 자체지정
                </span>
                <div className="text-lg font-black text-sky-950 mt-0.5 tabular-nums">
                  {holidays.filter((h) => !h.isPublicHoliday).length}
                  <span className="text-xs font-normal ml-0.5">일</span>
                </div>
                <span className="text-[9px] text-sky-700">개원기념일, 여름휴가</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center">
                <span className="text-[10px] text-slate-700 font-bold flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-600" /> 총 관리 일정
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5 tabular-nums">
                  {holidays.length}
                  <span className="text-xs font-normal ml-0.5">일</span>
                </div>
                <span className="text-[9px] text-slate-500">2026/2027 연간</span>
              </div>
            </div>

            {/* Weekend Operating Policy Fast Info */}
            <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏥</span>
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    주말 정기 진료 기준: 토요일 반일진료(09:30~13:30) · 일요일 정기휴진
                  </span>
                  <span className="text-[10px] text-slate-500">
                    각 날짜 우측의 버튼([☀️ 반일진료] / [🌴 휴진] / [🏥 정상])을 누르면 해당 공휴일의 치과 진료형태가 즉시 변경됩니다.
                  </span>
                </div>
              </div>
            </div>

            {/* Filter pills & search */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `전체 (${holidays.length})` },
                  { id: 'half', label: `☀️ 반일진료 (${holidays.filter((h) => h.type === '반일진료').length})` },
                  { id: 'closed', label: `🌴 전체휴진 (${holidays.filter((h) => h.type === '전체휴진').length})` },
                  { id: 'custom', label: `치과지정 (${holidays.filter((h) => !h.isPublicHoliday).length})` },
                  { id: 'public', label: `법정공휴일 (${holidays.filter((h) => h.isPublicHoliday).length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setHolidayFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      holidayFilter === f.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="명칭 또는 날짜 검색 (예: 삼일절, 10-03)"
                value={holidaySearchQuery}
                onChange={(e) => setHolidaySearchQuery(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs w-full sm:w-48 bg-white"
              />
            </div>
          </div>

          {/* Holiday List */}
          {displayedHolidays.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-xs">일치하는 휴무일 또는 진료일정이 없습니다.</p>
              <button
                type="button"
                onClick={() => {
                  setHolidayFilter('all');
                  setHolidaySearchQuery('');
                }}
                className="mt-2 text-xs text-sky-600 font-bold underline"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedHolidays.map((h) => {
                const dateObj = new Date(h.date);
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                const dayOfWeek = dayNames[dateObj.getDay()];
                const isSunday = dateObj.getDay() === 0;
                const isSaturday = dateObj.getDay() === 6;

                return (
                  <div
                    key={h.id}
                    className={`bg-white rounded-2xl border p-3.5 transition shadow-2xs ${
                      h.type === '반일진료'
                        ? 'border-amber-200 hover:border-amber-300'
                        : h.type === '전체휴진'
                        ? 'border-rose-200 hover:border-rose-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Left: Date, Name, and Badges */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                            h.type === '반일진료'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : h.type === '전체휴진'
                              ? 'bg-rose-50 text-rose-900 border-rose-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          <span className="text-[10px] font-bold leading-none">{dateObj.getMonth() + 1}월</span>
                          <span className="text-base font-extrabold leading-tight">{dateObj.getDate()}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">{h.name}</span>
                            <span
                              className={`text-[10px] font-bold ${
                                isSunday ? 'text-rose-600' : isSaturday ? 'text-sky-600' : 'text-slate-500'
                              }`}
                            >
                              ({dayOfWeek}요일)
                            </span>
                            {h.isPublicHoliday ? (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
                                대한민국 공휴일
                              </span>
                            ) : (
                              <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded font-semibold border border-sky-200">
                                치과 자체지정
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-slate-500">{h.date}</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-800">
                              {h.type === '반일진료'
                                ? `오전 반일진료 (${h.openTime || '09:30'} ~ ${h.closeTime || '13:30'})`
                                : h.type === '전체휴진'
                                ? '당산원치과 전체 휴진'
                                : `정상진료 (${h.openTime || '09:30'} ~ ${h.closeTime || '18:30'})`}
                            </span>
                            {h.memo && (
                              <>
                                <span>·</span>
                                <span className="text-slate-500 italic text-[10px]">{h.memo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick 1-Tap Policy Switcher Buttons & Edit/Delete */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* Quick Toggle: 반일진료 vs 전체휴진 vs 정상진료 */}
                        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleQuickToggleHoliday(h, '반일진료')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                              h.type === '반일진료'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="반일진료(09:30~13:30)로 즉시 변경"
                          >
                            ☀️ 반일진료
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickToggleHoliday(h, '전체휴진')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                              h.type === '전체휴진'
                                ? 'bg-rose-500 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="전체휴진으로 즉시 변경"
                          >
                            🌴 휴진
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickToggleHoliday(h, '정상진료')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                              h.type === '정상진료'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="정상진료로 즉시 변경"
                          >
                            🏥 정상
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditHoliday(h)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                          title="상세 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHoliday(h.id, h.name)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 5: 치과 운영 설정 & 마스터 PIN & CSV 다운로드
         ======================================================== */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4">
          {/* CSV Download Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-sky-600" />
              월간 전 직원 근태 정산 엑셀(CSV)
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              월말 급여 산정용 전 직원 출퇴근, 지각, 휴가 내역이 담긴 CSV 파일입니다.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono"
              />
              <button
                onClick={() => {
                  window.location.href = `/api/export/attendance.csv?month=${exportMonth}`;
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" /> 엑셀 다운로드
              </button>
            </div>
          </div>

          {/* Clinic Hours & Admin PIN Settings Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-sky-600" />
              치과 진료 시간 및 마스터 보안 PIN 설정
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">치과 명칭</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">진료 시작 (지각 판정)</label>
                  <input
                    type="time"
                    value={settingsForm.openTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, openTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">진료 마감</label>
                  <input
                    type="time"
                    value={settingsForm.closeTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, closeTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">점심시간 시작</label>
                  <input
                    type="time"
                    value={settingsForm.lunchStart}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lunchStart: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">점심시간 마감</label>
                  <input
                    type="time"
                    value={settingsForm.lunchEnd}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lunchEnd: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">야간진료 마감 시간</label>
                <input
                  type="time"
                  value={settingsForm.nightClinicCloseTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, nightClinicCloseTime: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              {/* Weekend Operating Policy in Settings Form */}
              <div className="bg-sky-50/70 p-3 rounded-2xl border border-sky-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                  <Sun className="w-4 h-4 text-sky-600" />
                  <span>주말 기본 진료 방침 (토요일/일요일)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">토요일 진료 형태</label>
                    <select
                      value={settingsForm.saturdayType || '반일진료'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, saturdayType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="반일진료">오전 반일진료 (09:30~13:30)</option>
                      <option value="정상진료">정상진료 (09:30~17:00)</option>
                      <option value="전체휴진">전체휴진</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">토요일 마감 시간</label>
                    <input
                      type="time"
                      value={settingsForm.saturdayCloseTime || '13:30'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, saturdayCloseTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">일요일 진료 형태</label>
                    <select
                      value={settingsForm.sundayType || '전체휴진'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sundayType: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="전체휴진">전체휴진 (정기 휴무)</option>
                      <option value="반일진료">오전 반일진료</option>
                      <option value="정상진료">정상진료</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Master PIN */}
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <label className="block text-amber-950 font-bold mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  최상위 관리자 마스터 PIN 번호 (4~8자리)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={settingsForm.adminPin || '1234'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-amber-300 font-mono tracking-widest text-center text-sm font-bold bg-white"
                />
                <span className="text-[10px] text-amber-800 mt-0.5 block">
                  * 대표원장/총괄실장 외 직원들이 관리자 페이지에 접근할 수 없도록 보호하는 암호입니다.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20"
              >
                <Save className="w-4 h-4" />
                {isSavingSettings ? '저장 중...' : '치과 설정 저장하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 1: 수기 근태 등록 모달 --- */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              관리자 수기 근태 등록 / 보정
            </h3>
            <form onSubmit={handleManualAttendanceSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">대상 직원</label>
                <select
                  value={manualForm.staffId}
                  onChange={(e) => setManualForm({ ...manualForm, staffId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">날짜</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">출근 시간</label>
                  <input
                    type="time"
                    step="1"
                    value={manualForm.clockInTime}
                    onChange={(e) => setManualForm({ ...manualForm, clockInTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">퇴근 시간</label>
                  <input
                    type="time"
                    step="1"
                    value={manualForm.clockOutTime}
                    onChange={(e) => setManualForm({ ...manualForm, clockOutTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">근태 상태</label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                >
                  <option value="정상출근">정상출근</option>
                  <option value="퇴근완료">퇴근완료</option>
                  <option value="지각">지각</option>
                  <option value="휴가">휴가</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">보정 사유</label>
                <input
                  type="text"
                  value={manualForm.correctionReason}
                  onChange={(e) => setManualForm({ ...manualForm, correctionReason: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                  placeholder="예: 교통체증 지각 정상 인정, 수기 출근 요청"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: 직원 추가 및 수정 모달 --- */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              {editingStaff ? `${editingStaff.name} 직원 정보 및 연차 수정` : '신규 치과 직원 등록'}
            </h3>

            <form onSubmit={handleStaffFormSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">직원 이름</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">직책</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                  >
                    <option value="대표원장">대표원장</option>
                    <option value="원장">원장</option>
                    <option value="총괄실장">총괄실장</option>
                    <option value="데스크주임">데스크주임</option>
                    <option value="치과위생사">치과위생사</option>
                    <option value="치과기공사">치과기공사</option>
                    <option value="진료보조">진료보조</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">부서</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                  >
                    <option value="치위생팀">치위생팀</option>
                    <option value="진료부">진료부</option>
                    <option value="경영지원">경영지원(데스크)</option>
                    <option value="기공실">기공실</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">연락처</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              {/* Leave Quota Controls */}
              <div className="grid grid-cols-2 gap-2 bg-sky-50/60 p-2.5 rounded-2xl border border-sky-100">
                <div>
                  <label className="block text-sky-950 font-bold mb-1 text-[11px]">총 부여 연차 (일)</label>
                  <input
                    type="number"
                    min="0"
                    max="35"
                    step="0.5"
                    value={staffForm.totalLeaveDays}
                    onChange={(e) => setStaffForm({ ...staffForm, totalLeaveDays: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-sky-200 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sky-950 font-bold mb-1 text-[11px]">사용 연차 (일)</label>
                  <input
                    type="number"
                    min="0"
                    max="35"
                    step="0.5"
                    value={staffForm.usedLeaveDays}
                    onChange={(e) => setStaffForm({ ...staffForm, usedLeaveDays: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-sky-200 bg-white font-bold"
                  />
                </div>
                <div className="col-span-2 text-[10px] text-sky-700 font-semibold text-right">
                  계산된 잔여 연차: {staffForm.totalLeaveDays - staffForm.usedLeaveDays}일
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">생년월일 (운세용)</label>
                  <input
                    type="date"
                    value={staffForm.birthDate}
                    onChange={(e) => setStaffForm({ ...staffForm, birthDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">별자리</label>
                  <input
                    type="text"
                    value={staffForm.zodiac}
                    onChange={(e) => setStaffForm({ ...staffForm, zodiac: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                    placeholder="예: 처녀자리"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">진료 다짐 / 좌우명</label>
                <input
                  type="text"
                  value={staffForm.motto}
                  onChange={(e) => setStaffForm({ ...staffForm, motto: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                  placeholder="예: 환자를 내 가족처럼 편안하게"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {editingStaff ? '수정 저장' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: 치과 휴무일 및 반일진료 추가 / 수정 모달 --- */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-sky-600" />
              <span>{editingHoliday ? '치과 휴무일 / 진료일정 수정' : '신규 치과 휴무일 / 반일진료 추가'}</span>
            </h3>

            <form onSubmit={handleHolidayFormSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">날짜</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">명칭</label>
                <input
                  type="text"
                  placeholder="예: 삼일절, 개천절, 치과 개원기념일, 여름정기휴진"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                  required
                />
                {/* Fast name chips */}
                <div className="flex items-center gap-1 overflow-x-auto mt-1.5 pb-0.5">
                  {[
                    '삼일절',
                    '어린이날',
                    '현충일',
                    '광복절',
                    '개천절',
                    '한글날',
                    '개원기념일',
                    '여름정기휴진',
                    '임시공휴일',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHolidayForm({ ...holidayForm, name: preset })}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 whitespace-nowrap"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">진료 형태</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: '반일진료', label: '☀️ 반일진료', desc: '09:30~13:30' },
                    { id: '전체휴진', label: '🌴 전체휴진', desc: '진료 없음' },
                    { id: '정상진료', label: '🏥 정상진료', desc: '09:30~18:30' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setHolidayForm({
                          ...holidayForm,
                          type: t.id as any,
                          openTime: t.id === '전체휴진' ? '' : '09:30',
                          closeTime: t.id === '반일진료' ? '13:30' : t.id === '정상진료' ? '18:30' : '',
                        })
                      }
                      className={`p-2 rounded-xl text-center border transition ${
                        holidayForm.type === t.id
                          ? t.id === '반일진료'
                            ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                            : t.id === '전체휴진'
                            ? 'bg-rose-500 text-white border-rose-600 font-bold shadow-xs'
                            : 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div
                        className={`text-[9px] mt-0.5 ${
                          holidayForm.type === t.id ? 'text-white/90' : 'text-slate-400'
                        }`}
                      >
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {holidayForm.type !== '전체휴진' && (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">진료 시작 시간</label>
                    <input
                      type="time"
                      value={holidayForm.openTime}
                      onChange={(e) => setHolidayForm({ ...holidayForm, openTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-[11px]">진료 종료 시간</label>
                    <input
                      type="time"
                      value={holidayForm.closeTime}
                      onChange={(e) => setHolidayForm({ ...holidayForm, closeTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">운영 메모 / 특이사항</label>
                <input
                  type="text"
                  placeholder="예: 공휴일 오전 집중진료, 점심시간 없음, 당직 2명"
                  value={holidayForm.memo}
                  onChange={(e) => setHolidayForm({ ...holidayForm, memo: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPub"
                  checked={holidayForm.isPublicHoliday}
                  onChange={(e) => setHolidayForm({ ...holidayForm, isPublicHoliday: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <label htmlFor="isPub" className="text-xs text-slate-700 select-none">
                  대한민국 법정 공휴일 (달력 빨간 날)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingHoliday}
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {isSavingHoliday ? '저장 중...' : editingHoliday ? '수정 저장' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
