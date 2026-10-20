import React, { useState } from 'react';
import { Staff, ManualAttendanceRequest } from '../types';
import { submitManualAttendanceRequest } from '../api';
import {
  X,
  Clock,
  Calendar,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Send,
  BatteryLow,
  WifiOff,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

interface ManualAttendanceModalProps {
  currentStaff: Staff | null;
  staffList: Staff[];
  userRequests: ManualAttendanceRequest[];
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_PRESETS = [
  { label: '스마트폰 미지참 (집에 두고 옴)', icon: Smartphone },
  { label: '스마트폰 배터리 방전', icon: BatteryLow },
  { label: '원내 Wi-Fi 연결 단말 오류', icon: WifiOff },
  { label: '외부 세미나/업무 후 직퇴', icon: Briefcase },
  { label: '기타 사유', icon: HelpCircle },
];

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  currentStaff,
  staffList,
  userRequests,
  onClose,
  onSuccess,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    currentStaff?.id || staffList[0]?.id || ''
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [requestType, setRequestType] = useState<'출근' | '퇴근' | '출퇴근동시'>('출근');
  const [clockInTime, setClockInTime] = useState<string>('09:15');
  const [clockOutTime, setClockOutTime] = useState<string>('18:30');
  const [selectedReason, setSelectedReason] = useState<string>(REASON_PRESETS[0].label);
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState(false);

  const staff = staffList.find((s) => s.id === selectedStaffId) || currentStaff;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMsg('직원을 선택해주세요.');
      return;
    }
    if (!date) {
      setErrorMsg('날짜를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const inTimeFormatted =
        requestType === '출근' || requestType === '출퇴근동시'
          ? clockInTime.length === 5
            ? `${clockInTime}:00`
            : clockInTime
          : undefined;

      const outTimeFormatted =
        requestType === '퇴근' || requestType === '출퇴근동시'
          ? clockOutTime.length === 5
            ? `${clockOutTime}:00`
            : clockOutTime
          : undefined;

      await submitManualAttendanceRequest({
        staffId: selectedStaffId,
        date,
        requestType,
        requestedClockIn: inTimeFormatted,
        requestedClockOut: outTimeFormatted,
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || '수기 신청에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = userRequests.filter((r) => r.staffId === selectedStaffId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                핸드폰 미소지 · 수기 출퇴근 신청
              </h3>
              <p className="text-xs text-sky-100 font-medium">
                공유기 자동인식 불가 시 수기로 시간을 입력하고 관리자 승인을 받습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition active:scale-95"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: 신규 신청 / 내 신청 내역 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            type="button"
            onClick={() => setViewHistory(false)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-t-xl transition ${
              !viewHistory
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ✏️ 수기 출퇴근 신청 작성
          </button>
          <button
            type="button"
            onClick={() => setViewHistory(true)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center justify-center gap-1.5 ${
              viewHistory
                ? 'bg-white text-sky-700 border-t-2 border-sky-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 내 신청 내역
            {filteredHistory.filter((r) => r.status === '승인대기').length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {filteredHistory.filter((r) => r.status === '승인대기').length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {errorMsg && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!viewHistory ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Staff Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  신청 대상 직원
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {staffList.map((s) => {
                    const isSelected = s.id === selectedStaffId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStaffId(s.id)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-400/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 shadow-xs"
                          style={{ backgroundColor: s.color }}
                        >
                          {s.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {s.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{s.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  근무 일자
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* 3. Request Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">신청 구분</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['출근', '퇴근', '출퇴근동시'] as const).map((type) => {
                    const isSel = requestType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRequestType(type)}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold transition border ${
                          isSel
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type === '출근'
                          ? '☀️ 출근만'
                          : type === '퇴근'
                          ? '🌙 퇴근만'
                          : '⚡ 출·퇴근 동시'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(requestType === '출근' || requestType === '출퇴근동시') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> 출근 시간
                      </span>
                      <span className="text-[10px] text-slate-400">기준 09:30</span>
                    </label>
                    <input
                      type="time"
                      value={clockInTime}
                      onChange={(e) => setClockInTime(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-sky-500"
                      required
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {['09:00', '09:15', '09:25'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setClockInTime(t)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(requestType === '퇴근' || requestType === '출퇴근동시') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-rose-600" /> 퇴근 시간
                      </span>
                      <span className="text-[10px] text-slate-400">평일 18:30 / 토 13:30</span>
                    </label>
                    <input
                      type="time"
                      value={clockOutTime}
                      onChange={(e) => setClockOutTime(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-sky-500"
                      required
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {['13:30', '18:30', '20:30'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setClockOutTime(t)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Reason Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  수기 신청 사유
                </label>
                <div className="space-y-1.5">
                  {REASON_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedReason === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSelectedReason(preset.label)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 font-bold text-sky-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span>{preset.label}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Detailed Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  상세 설명 및 사유 (선택)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="예: 출근길 지하철에서 스마트폰을 분실하여 원내 태블릿에서 수기로 신청합니다."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Notice Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong>관리자 승인 안내:</strong> 수기 출퇴근 신청은 원장님 또는 총괄실장의 승인이
                  완료되어야 정규 근태 기록으로 반영됩니다.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:scale-98 text-white shadow-md flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? '신청 전송 중...' : '관리자에게 수기 신청 제출'}
                </button>
              </div>
            </form>
          ) : (
            /* History View */
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium pb-1 flex items-center justify-between">
                <span>
                  {staff?.name} ({staff?.role}) 님의 수기 신청 내역 ({filteredHistory.length}건)
                </span>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  수기 출퇴근 신청 내역이 없습니다.
                </div>
              ) : (
                filteredHistory.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800">{req.date}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            req.requestType === '출근'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.requestType === '퇴근'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {req.requestType}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          req.status === '승인대기'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === '승인'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {req.status === '승인대기'
                          ? '⏳ 승인대기'
                          : req.status === '승인'
                          ? '✅ 승인완료'
                          : '❌ 반려됨'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3">
                      {req.requestedClockIn && <span>신청 출근: <strong>{req.requestedClockIn}</strong></span>}
                      {req.requestedClockOut && <span>신청 퇴근: <strong>{req.requestedClockOut}</strong></span>}
                    </div>

                    <div className="text-xs text-slate-700 bg-slate-50 rounded-xl p-2 font-medium">
                      <span className="text-slate-500 font-bold mr-1">사유:</span>
                      {req.reason}
                      {req.details && <p className="text-slate-500 mt-0.5">{req.details}</p>}
                    </div>

                    {req.status === '반려' && req.rejectReason && (
                      <div className="text-xs text-rose-600 bg-rose-50 rounded-xl p-2 font-medium">
                        <strong>반려 사유:</strong> {req.rejectReason}
                      </div>
                    )}

                    {req.reviewedBy && (
                      <div className="text-[10px] text-slate-400">
                        검토자: {req.reviewedBy}
                        {req.reviewedAt && ` · ${new Date(req.reviewedAt).toLocaleDateString('ko-KR')}`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
