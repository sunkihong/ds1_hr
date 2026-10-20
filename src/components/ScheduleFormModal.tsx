import React, { useState } from 'react';
import { Staff } from '../types';
import { createSchedule } from '../api';
import { X, Calendar, CheckCircle2 } from 'lucide-react';

interface ScheduleFormModalProps {
  staffList: Staff[];
  currentStaff: Staff | null;
  presetDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  staffList,
  currentStaff,
  presetDate,
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    currentStaff?.id || staffList[0]?.id || ''
  );
  const [scheduleType, setScheduleType] = useState<
    '연차' | '오전반차' | '오후반차' | '야간진료' | '학회' | '병가' | '당직' | '기타'
  >('연차');
  const [startDate, setStartDate] = useState<string>(presetDate || todayStr);
  const [endDate, setEndDate] = useState<string>(presetDate || todayStr);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick title helpers
  const handleTypeChange = (typeVal: any) => {
    setScheduleType(typeVal);
    if (!title || title.includes('연차') || title.includes('반차') || title.includes('야간진료')) {
      if (typeVal === '연차') setTitle('정기 연차 휴가');
      else if (typeVal === '오전반차') setTitle('오전 반차');
      else if (typeVal === '오후반차') setTitle('오후 반차');
      else if (typeVal === '야간진료') setTitle('야간진료 당직');
      else if (typeVal === '학회') setTitle('치과 학회 및 세미나 참석');
      else if (typeVal === '병가') setTitle('병가 휴무');
      else if (typeVal === '당직') setTitle('원내 당직 근무');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      alert('직원을 선택하세요.');
      return;
    }
    if (!startDate) {
      alert('시작일을 입력하세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isHighAdmin = currentStaff?.role === '대표원장' || currentStaff?.role === '총괄실장';
      const approvalStatus = isHighAdmin ? '승인완료' : '승인대기';

      await createSchedule({
        staffId: selectedStaffId,
        type: scheduleType,
        startDate,
        endDate: endDate || startDate,
        title: title || `${scheduleType} 일정`,
        description,
        approvalStatus,
      });

      alert(
        isHighAdmin
          ? '일정이 등록 및 즉시 승인되었습니다.'
          : '휴가/일정 신청이 접수되었습니다. 최고관리자(대표원장/총괄실장) 결재 후 최종 승인됩니다.'
      );

      onSuccess();
      onClose();
    } catch (err: unknown) {
      alert((err as Error).message || '일정 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                휴가 및 일정 등록
              </h3>
              <p className="text-[11px] text-slate-500">
                지정된 서버로 실시간 동기화되어 전 직원과 공유됩니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3.5 flex-1 text-xs">
          {/* Staff Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              신청 직원
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role} · {s.department}) - 잔여 연차: {s.totalLeaveDays - s.usedLeaveDays}일
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Type Selection Buttons */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              일정 구분
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: '연차', label: '연차' },
                { id: '오전반차', label: '오전반차' },
                { id: '오후반차', label: '오후반차' },
                { id: '야간진료', label: '야간진료' },
                { id: '학회', label: '학회/교육' },
                { id: '당직', label: '당직' },
                { id: '병가', label: '병가' },
                { id: '기타', label: '기타' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold transition border text-center ${
                    scheduleType === t.id
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              일정 제목
            </label>
            <input
              type="text"
              placeholder="예: 정기 연차 휴가, 세미나 참석"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
          </div>

          {/* Description & Handover */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              비고 / 인수인계 메모
            </label>
            <textarea
              rows={2}
              placeholder="대체 근무자 지정, 긴급 연락처 또는 공유 사항"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
            />
          </div>

          {/* Info pill */}
          {selectedStaff && (scheduleType === '연차' || scheduleType.includes('반차')) && (
            <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-100 flex items-center justify-between text-sky-900 text-[11px]">
              <span>연차 자동 차감 예정:</span>
              <span className="font-bold">
                {scheduleType === '연차' ? '1.0일 차감' : '0.5일 차감'} (현재 잔여: {selectedStaff.totalLeaveDays - selectedStaff.usedLeaveDays}일)
              </span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? '동기화 저장 중...' : '일정 등록 및 공유하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
