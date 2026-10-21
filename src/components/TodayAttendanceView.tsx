import React, { useState, useEffect } from 'react';
import {
  Staff,
  TodayStaffStatus,
  ClinicNotice,
  ClinicHoliday,
  ClinicWifiRouter,
  ManualAttendanceRequest,
} from '../types';
import { clockIn, clockOut } from '../api';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import { WifiVerifyModal } from './WifiVerifyModal';
import {
  Clock,
  LogIn,
  LogOut,
  MapPin,
  CheckCircle,
  Calendar,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Building,
  Sun,
  Coffee,
  Wifi,
  WifiOff,
  Smartphone,
  ChevronDown,
  Info,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';

interface TodayAttendanceViewProps {
  currentStaff: Staff | null;
  todayRecords: TodayStaffStatus[];
  holidays?: ClinicHoliday[];
  wifiRouters?: ClinicWifiRouter[];
  manualRequests?: ManualAttendanceRequest[];
  onRefresh: () => void;
  onOpenScheduleAdd: () => void;
  onOpenNotices: () => void;
  notices: ClinicNotice[];
}

export const TodayAttendanceView: React.FC<TodayAttendanceViewProps> = ({
  currentStaff,
  todayRecords,
  holidays = [],
  wifiRouters = [],
  manualRequests = [],
  onRefresh,
  onOpenScheduleAdd,
  onOpenNotices,
  notices,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [wifiModalAction, setWifiModalAction] = useState<'출근' | '퇴근' | null>(null);

  // Active hospital Wi-Fi router selection (simulating/detecting presence in the clinic)
  const activeRouters = wifiRouters.filter((r) => r.isActive);
  const [selectedWifiId, setSelectedWifiId] = useState<string>(() => {
    return activeRouters[0]?.id || 'wifi-01';
  });
  const [showWifiPicker, setShowWifiPicker] = useState(false);

  // Live timer update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Find current user's record
  const currentRecord = currentStaff
    ? todayRecords.find((r) => r.staff.id === currentStaff.id)
    : null;

  const clockInTime = currentRecord?.record?.clockInTime;
  const clockOutTime = currentRecord?.record?.clockOutTime;
  const userStatus = currentRecord?.status || '출근전';

  // Calculate working elapsed duration if clocked in
  const getElapsedTimeString = () => {
    if (!clockInTime) return null;
    const [h, m, s] = clockInTime.split(':').map(Number);
    const inDate = new Date();
    inDate.setHours(h, m, s || 0, 0);

    const targetDate = clockOutTime
      ? (() => {
          const [oh, om, os] = clockOutTime.split(':').map(Number);
          const out = new Date();
          out.setHours(oh, om, os || 0, 0);
          return out;
        })()
      : currentTime;

    const diffMs = Math.max(0, targetDate.getTime() - inDate.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}시간 ${diffMinutes}분`;
  };

  // Current detected clinic Wi-Fi router
  const currentWifi = activeRouters.find((r) => r.id === selectedWifiId) || null;
  const isWifiConnected = Boolean(currentWifi);

  // Check if current user has manual attendance requests for today
  const todayStr = currentTime.toISOString().split('T')[0];
  const userTodayManualRequests = manualRequests.filter(
    (m) => m.staffId === currentStaff?.id && m.date === todayStr
  );
  const pendingManualReq = userTodayManualRequests.find((m) => m.status === '승인대기');
  const approvedManualReq = userTodayManualRequests.find((m) => m.status === '승인');

  const handleClockIn = () => {
    if (!currentStaff) return;
    setWifiModalAction('출근');
  };

  const executeClockIn = async (router: ClinicWifiRouter | null) => {
    setWifiModalAction(null);
    setIsSubmitting(true);
    setActionSuccessMsg(null);
    try {
      const res = await clockIn(
        currentStaff!.id,
        customNote,
        router ? `${router.location} (${router.ssid})` : '원외/수기확인',
        {
          authMethod: router ? 'wifi' : 'unverified',
          wifiSsid: router?.ssid,
          wifiBssid: router?.bssid,
        }
      );
      setActionSuccessMsg(res.message);
      setCustomNote('');
      setShowNoteInput(false);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '출근 처리에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = () => {
    if (!currentStaff) return;
    setWifiModalAction('퇴근');
  };

  const executeClockOut = async (router: ClinicWifiRouter | null) => {
    setWifiModalAction(null);
    setIsSubmitting(true);
    setActionSuccessMsg(null);
    try {
      const res = await clockOut(currentStaff!.id, customNote, {
        authMethod: router ? 'wifi' : 'unverified',
        wifiSsid: router?.ssid,
        wifiBssid: router?.bssid,
      });
      setActionSuccessMsg(res.message);
      setCustomNote('');
      setShowNoteInput(false);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '퇴근 처리에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI counts
  const totalStaffCount = todayRecords.length;
  const workingCount = todayRecords.filter(
    (r) => r.status === '근무중' || r.status === '정상출근' || r.status === '지각'
  ).length;
  const leaveCount = todayRecords.filter((r) => r.status === '휴가' || r.status === '반차').length;
  const completedCount = todayRecords.filter((r) => r.status === '퇴근완료').length;
  const notYetCount = todayRecords.filter((r) => r.status === '출근전').length;

  const urgentNotice = notices.find((n) => n.pinned) || notices[0];

  const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dateFormatted = `${currentTime.getFullYear()}년 ${currentTime.getMonth() + 1}월 ${currentTime.getDate()}일 ${daysOfWeek[currentTime.getDay()]}`;

  const todayHoliday = holidays.find((h) => h.date === todayStr);

  return (
    <div className="space-y-4 pb-20">
      {/* Today Special Holiday / Operating Alert Banner */}
      {todayHoliday && (
        <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-sm border border-slate-800 flex items-center gap-3">
          <div className="shrink-0 text-xl">
            {todayHoliday.type === '반일진료' ? '☀️' : todayHoliday.type === '전체휴진' ? '🌴' : '🏥'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">진료 안내</div>
            <div className="text-sm font-bold truncate">{todayHoliday.name}</div>
          </div>
        </div>
      )}

      {/* Manual Request Status Banner (If Staff has a pending or approved request today) */}
      {pendingManualReq && (
        <div className="bg-amber-100 border border-amber-200 rounded-3xl p-4 flex items-center gap-3">
          <Hourglass className="w-5 h-5 text-amber-700 shrink-0 animate-spin-slow" />
          <div className="flex-1 min-w-0 text-xs font-medium text-amber-900 truncate">
            수기 출퇴근 신청 진행 중 ({pendingManualReq.requestedClockIn || pendingManualReq.requestedClockOut})
          </div>
          <button onClick={() => setShowManualModal(true)} className="text-xs font-bold underline shrink-0">확인</button>
        </div>
      )}

      {approvedManualReq && !pendingManualReq && (
        <div className="bg-emerald-100 border border-emerald-200 rounded-3xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div className="flex-1 min-w-0 text-xs font-medium text-emerald-900 truncate">
            수기 출퇴근 승인 완료 ({approvedManualReq.requestedClockIn || approvedManualReq.requestedClockOut})
          </div>
        </div>
      )}

      {/* 1. Hospital Wi-Fi Router Recognition Status Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition ${
                isWifiConnected
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {isWifiConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-900 truncate">
                  {isWifiConnected ? currentWifi?.ssid : '병원 Wi-Fi 미연결'}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isWifiConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isWifiConnected ? '● 원내 공유기 인증됨' : '○ 인증 불가 (외부망)'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {isWifiConnected
                  ? `위치: ${currentWifi?.location} · IP ${currentWifi?.ipRange || '192.168.10.x'}`
                  : '병원 설치 공유기에 연결되어야 원클릭 출퇴근이 가능합니다.'}
              </div>
            </div>
          </div>

          {/* Wi-Fi AP selector toggle for simulation / zone testing */}
          <button
            type="button"
            onClick={() => setShowWifiPicker(!showWifiPicker)}
            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-xl border border-sky-100 shrink-0 flex items-center gap-1 transition active:scale-95"
          >
            <span>AP 연결변경</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dropdown for testing different hospital APs or LTE */}
        {showWifiPicker && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
              <span>치과 내 설치된 인가 공유기 선택 (스마트폰 Wi-Fi 연결 감지):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {activeRouters.map((router) => {
                const isSelected = selectedWifiId === router.id;
                return (
                  <button
                    key={router.id}
                    onClick={() => {
                      setSelectedWifiId(router.id);
                      setShowWifiPicker(false);
                    }}
                    className={`p-2 rounded-xl text-left border flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold truncate">{router.ssid}</div>
                      <div className="text-[10px] text-slate-500 truncate">{router.location}</div>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}

              {/* Simulation option for Disconnected / Outside Clinic */}
              <button
                onClick={() => {
                  setSelectedWifiId('');
                  setShowWifiPicker(false);
                }}
                className={`p-2 rounded-xl text-left border flex items-center justify-between text-xs transition ${
                  selectedWifiId === ''
                    ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-extrabold text-rose-700">외부망 / LTE (Wi-Fi 미연결)</div>
                  <div className="text-[10px] text-slate-500">병원 공유기 범위 밖 테스트</div>
                </div>
                {selectedWifiId === '' && (
                  <CheckCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Header Banner & Live Clock */}
      <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between text-sky-100 text-xs font-medium mb-1">
          <span>{dateFormatted}</span>
          <span className="flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            <Building className="w-3 h-3" />
            {isWifiConnected ? `${currentWifi?.location} 원내` : '원외 접속중'}
          </span>
        </div>

        {/* Digital Clock */}
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums font-mono my-1">
          {currentTime.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })}
        </div>

        {/* Current Employee Clock In/Out Section */}
        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center border border-white/30"
                style={{ backgroundColor: currentStaff?.color || '#0284c7' }}
              >
                {currentStaff?.name.slice(0, 1)}
              </div>
              <div>
                <span className="font-bold text-sm">{currentStaff?.name}</span>
                <span className="text-xs text-sky-200 ml-1.5">{currentStaff?.role}</span>
              </div>
            </div>

            {/* Status indicator */}
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                userStatus === '근무중' || userStatus === '정상출근'
                  ? 'bg-emerald-400 text-emerald-950 font-bold'
                  : userStatus === '지각'
                  ? 'bg-amber-400 text-amber-950 font-bold'
                  : userStatus === '퇴근완료'
                  ? 'bg-slate-200 text-slate-800'
                  : userStatus === '휴가' || userStatus === '반차'
                  ? 'bg-purple-200 text-purple-900'
                  : 'bg-white/20 text-white'
              }`}
            >
              {userStatus}
            </span>
          </div>

          {/* Clock In / Out Time Metadata */}
          <div className="text-xs text-sky-100 flex flex-wrap items-center gap-3 my-2">
            <span>출근: {clockInTime ? clockInTime : '미등록'}</span>
            <span>·</span>
            <span>퇴근: {clockOutTime ? clockOutTime : '미등록'}</span>
            {getElapsedTimeString() && (
              <>
                <span>·</span>
                <span className="text-white font-semibold">
                  근무 {getElapsedTimeString()}
                </span>
              </>
            )}
            {currentRecord?.record?.authMethod === 'manual_approved' && (
              <span className="bg-sky-500/30 text-white font-bold px-1.5 py-0.5 rounded-md text-[10px]">
                수기승인
              </span>
            )}
            {currentRecord?.record?.wifiSsid && (
              <span className="text-[10px] text-sky-200">
                (📶 {currentRecord.record.wifiSsid})
              </span>
            )}
          </div>

          {actionSuccessMsg && (
            <div className="bg-emerald-500/20 border border-emerald-300 text-emerald-100 text-xs px-3 py-1.5 rounded-lg my-2 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Optional Note input toggle */}
          {showNoteInput && (
            <div className="mt-2 mb-3">
              <input
                type="text"
                placeholder="특이사항 메모 (예: 외근, 기구점검 등)"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          )}

          {/* Large Primary Action Buttons for Thumb Zone */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {/* Clock-in Button */}
            <button
              onClick={handleClockIn}
              disabled={isSubmitting || userStatus === '근무중' || userStatus === '정상출근' || userStatus === '지각'}
              className={`h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 ${
                userStatus === '출근전' || userStatus === '퇴근완료'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <LogIn className="w-4 h-4" />
              {clockInTime ? '재출근' : '출근하기'}
            </button>

            {/* Clock-out Button */}
            <button
              onClick={handleClockOut}
              disabled={isSubmitting || userStatus === '출근전' || userStatus === '퇴근완료'}
              className={`h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 ${
                userStatus === '근무중' || userStatus === '정상출근' || userStatus === '지각'
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <LogOut className="w-4 h-4" />
              퇴근하기
            </button>
          </div>

          {/* Manual Attendance & Quick Note Options */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10 text-[11px] text-sky-200">
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white font-extrabold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-300" />
              <span>핸드폰 미소지 · 수기 출퇴근 신청</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="underline hover:text-white"
            >
              {showNoteInput ? '메모창 닫기' : '+ 출퇴근 특이사항 메모'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Attendance Modal */}
      {showManualModal && (
        <ManualAttendanceModal
          currentStaff={currentStaff}
          staffList={todayRecords.map((r) => r.staff)}
          userRequests={manualRequests}
          onClose={() => setShowManualModal(false)}
          onSuccess={() => {
            onRefresh();
            setActionSuccessMsg('수기 출퇴근 신청이 관리자에게 정상 전송되었습니다.');
          }}
        />
      )}

      {/* 2. Urgent Notice or Handover Strip */}
      {urgentNotice && (
        <div
          onClick={onOpenNotices}
          className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-amber-100/70 transition"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-amber-900 mr-1.5">
                [{urgentNotice.type}]
              </span>
              <span className="text-xs text-amber-800 truncate">
                {urgentNotice.content}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 shrink-0">
            보기 &gt;
          </span>
        </div>
      )}

      {/* 3. Today's Clinic KPI Status Ring/Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: '근무', val: workingCount, color: 'text-emerald-600' },
          { label: '휴가', val: leaveCount, color: 'text-purple-600' },
          { label: '퇴근', val: completedCount, color: 'text-slate-700' },
          { label: '출근전', val: notYetCount, color: 'text-sky-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-2 rounded-2xl border border-slate-100">
            <div className="text-[10px] text-slate-500">{kpi.label}</div>
            <div className={`text-md font-bold ${kpi.color}`}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* 4. All 10 Dental Staff Real-Time Attendance Board */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">
              오늘 전 직원 출근 및 일정 현황
            </h2>
            <span className="text-xs text-slate-500">
              ({totalStaffCount}명 동기화)
            </span>
          </div>
          <button
            onClick={onOpenScheduleAdd}
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
          >
            + 휴가/일정 신청
          </button>
        </div>

        {/* Staff Rows */}
        <div className="divide-y divide-slate-100">
          {todayRecords.map((item) => {
            const { staff, record, todaySchedule, status } = item;
            const isMe = currentStaff?.id === staff.id;

            return (
              <div
                key={staff.id}
                className={`py-2.5 px-2 flex items-center justify-between rounded-xl transition ${
                  isMe ? 'bg-sky-50/50' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left: Staff Profile & Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs relative"
                    style={{ backgroundColor: staff.color }}
                  >
                    {staff.name.slice(0, 1)}
                    {isMe && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-600 rounded-full border border-white flex items-center justify-center text-[8px] font-bold">
                        나
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {staff.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {staff.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <span>{staff.department}</span>
                      {record?.clockInTime && (
                        <>
                          <span>·</span>
                          <span className="tabular-nums font-mono text-slate-600">
                            {record.clockInTime.slice(0, 5)} 출근
                          </span>
                        </>
                      )}
                      {record?.clockOutTime && (
                        <>
                          <span>·</span>
                          <span className="tabular-nums font-mono text-slate-500">
                            {record.clockOutTime.slice(0, 5)} 퇴근
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status & Schedule Info */}
                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      status === '근무중' || status === '정상출근'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : status === '지각'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : status === '휴가' || status === '반차'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : status === '퇴근완료'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {status}
                  </span>

                  {todaySchedule && (
                    <span className="text-[10px] text-sky-600 font-medium mt-0.5 max-w-[120px] truncate">
                      {todaySchedule.type} {todaySchedule.description ? `(${todaySchedule.description})` : ''}
                    </span>
                  )}
                  {record?.note && !todaySchedule && (
                    <span className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate">
                      {record.note}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {wifiModalAction && (
        <WifiVerifyModal
          actionType={wifiModalAction}
          wifiRouters={wifiRouters}
          onConfirm={(router) => {
            if (wifiModalAction === '출근') executeClockIn(router);
            else executeClockOut(router);
          }}
          onClose={() => setWifiModalAction(null)}
        />
      )}
    </div>
  );
};
