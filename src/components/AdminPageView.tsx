import React, { useState, useMemo } from 'react';
import {
  Staff,
  ScheduleEvent,
  AttendanceRecord,
  ClinicSettings,
  TodayStaffStatus,
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
} from 'lucide-react';

interface AdminPageViewProps {
  currentStaff: Staff | null;
  staffList: Staff[];
  schedules: ScheduleEvent[];
  attendanceRecords: AttendanceRecord[];
  todayRecords: TodayStaffStatus[];
  clinicSettings: ClinicSettings;
  onRefresh: () => void;
  onSelectStaff: (staff: Staff) => void;
}

type AdminSubTab = 'approvals' | 'abnormal' | 'staff' | 'settings';

export const AdminPageView: React.FC<AdminPageViewProps> = ({
  currentStaff,
  staffList,
  schedules,
  attendanceRecords,
  todayRecords,
  clinicSettings,
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
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2 border-t border-white/15">
          {[
            {
              id: 'approvals' as AdminSubTab,
              label: '휴가 승인',
              badge: pendingSchedules.length > 0 ? pendingSchedules.length : undefined,
              badgeColor: 'bg-rose-500',
            },
            {
              id: 'abnormal' as AdminSubTab,
              label: '비정상 근태',
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
              id: 'settings' as AdminSubTab,
              label: '운영·설정',
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
          SUB-TAB 4: 치과 운영 설정 & 마스터 PIN & CSV 다운로드
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
    </div>
  );
};
