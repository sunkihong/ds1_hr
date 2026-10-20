import React, { useState } from 'react';
import { ScheduleEvent, Staff } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Plane,
  Award,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { deleteSchedule } from '../api';

interface SharedCalendarViewProps {
  schedules: ScheduleEvent[];
  staffList: Staff[];
  onOpenScheduleAdd: (presetDate?: string) => void;
  onRefresh: () => void;
  currentStaff: Staff | null;
}

type CalendarViewMode = 'week' | 'month';

export const SharedCalendarView: React.FC<SharedCalendarViewProps> = ({
  schedules,
  staffList,
  onOpenScheduleAdd,
  onRefresh,
  currentStaff,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Helpers for week calculation (Monday to Sunday)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  const mondayDate = getMonday(currentDate);

  // Array of 7 days in current week: Mon ~ Sun
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + idx);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      date: d,
      dateStr,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
      isToday: new Date().toISOString().split('T')[0] === dateStr,
      isSunday: d.getDay() === 0,
      isSaturday: d.getDay() === 6,
    };
  });

  const weekStartStr = `${weekDays[0].monthNum}.${weekDays[0].dayNum}(${weekDays[0].dayName})`;
  const weekEndStr = `${weekDays[6].monthNum}.${weekDays[6].dayNum}(${weekDays[6].dayName})`;

  // Navigation
  const prevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const nextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    if (filterDept !== 'all' && s.department !== filterDept) return false;
    return true;
  });

  // Get schedules for a specific staff and specific date
  const getStaffScheduleForDate = (staffId: string, dateStr: string) => {
    return schedules.filter(
      (s) => s.staffId === staffId && s.startDate <= dateStr && s.endDate >= dateStr
    );
  };

  // Get all schedules for a specific date
  const getAllSchedulesForDate = (dateStr: string) => {
    return schedules.filter(
      (s) => s.startDate <= dateStr && s.endDate >= dateStr
    );
  };

  // Weekly KPI stats
  const weekDateStrs = weekDays.map((d) => d.dateStr);
  const weekSchedules = schedules.filter((s) =>
    weekDateStrs.some((dStr) => s.startDate <= dStr && s.endDate >= dStr)
  );

  const weekLeaveCount = weekSchedules.filter((s) => s.type === '연차').length;
  const weekHalfLeaveCount = weekSchedules.filter((s) => s.type.includes('반차')).length;
  const weekNightDutyCount = weekSchedules.filter((s) => s.type === '야간진료').length;

  // Delete schedule handler
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`'${title}' 일정을 삭제하시겠습니까?`)) return;
    try {
      await deleteSchedule(id);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '삭제에 실패했습니다.');
    }
  };

  // Badge styler
  const getScheduleStyle = (type: string) => {
    switch (type) {
      case '연차':
        return {
          bg: 'bg-purple-100 text-purple-900 border-purple-200',
          dot: 'bg-purple-500',
          label: '연차',
        };
      case '오전반차':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-200',
          dot: 'bg-amber-500',
          label: '오전반차',
        };
      case '오후반차':
        return {
          bg: 'bg-orange-100 text-orange-900 border-orange-200',
          dot: 'bg-orange-500',
          label: '오후반차',
        };
      case '야간진료':
        return {
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-200 font-bold',
          dot: 'bg-indigo-600',
          label: '야간진료',
        };
      case '학회':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          dot: 'bg-emerald-500',
          label: '학회',
        };
      case '병가':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-200',
          dot: 'bg-rose-500',
          label: '병가',
        };
      default:
        return {
          bg: 'bg-sky-100 text-sky-900 border-sky-200',
          dot: 'bg-sky-500',
          label: type,
        };
    }
  };

  const selectedDateEvents = getAllSchedulesForDate(selectedDateStr);

  return (
    <div className="space-y-4 pb-20 text-xs">
      {/* 1. Header & View Mode Switcher */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Title & Today Button */}
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {viewMode === 'week'
                ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 주간 근태`
                : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 전체 달력`}
            </h2>
            <button
              onClick={goToday}
              className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
            >
              오늘
            </button>
          </div>

          {/* Segmented View Mode Toggle: [주간 뷰] | [월간 뷰] */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'week'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              주간 근태표
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'month'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              월간 캘린더
            </button>
          </div>
        </div>

        {/* Week Navigator or Month Navigator */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={viewMode === 'week' ? prevWeek : prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              aria-label="이전"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 text-xs px-1">
              {viewMode === 'week'
                ? `${weekStartStr} ~ ${weekEndStr}`
                : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`}
            </span>
            <button
              onClick={viewMode === 'week' ? nextWeek : nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              aria-label="다음"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenScheduleAdd(selectedDateStr)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition active:scale-95 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              일정 등록
            </button>
          </div>
        </div>

        {/* Weekly Attendance Summary KPI */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-2">
            <span className="text-[10px] text-purple-700 font-medium">이번 주 연차</span>
            <div className="text-base font-extrabold text-purple-900 tabular-nums">
              {weekLeaveCount}
              <span className="text-[10px] font-normal text-purple-600 ml-0.5">건</span>
            </div>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2">
            <span className="text-[10px] text-amber-700 font-medium">이번 주 반차</span>
            <div className="text-base font-extrabold text-amber-900 tabular-nums">
              {weekHalfLeaveCount}
              <span className="text-[10px] font-normal text-amber-600 ml-0.5">건</span>
            </div>
          </div>
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2">
            <span className="text-[10px] text-indigo-700 font-medium">야간근무 당직</span>
            <div className="text-base font-extrabold text-indigo-900 tabular-nums">
              {weekNightDutyCount}
              <span className="text-[10px] font-normal text-indigo-600 ml-0.5">건</span>
            </div>
          </div>
        </div>

        {/* Department Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1">
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">부서 필터:</span>
          {[
            { id: 'all', label: '전체 (10명)' },
            { id: '진료부', label: '진료부 (원장실)' },
            { id: '치위생팀', label: '치위생팀' },
            { id: '경영지원', label: '경영지원(데스크)' },
            { id: '기공실', label: '기공실' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterDept === d.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          MODE 1: WEEKLY ATTENDANCE BOARD (스태프 X 요일 매트릭스)
         ======================================================== */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                주간 치과 직원 근태 현황판 (월~토/일)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              * 셀을 누르면 해당 날짜 일정을 확인 및 등록할 수 있습니다
            </span>
          </div>

          {/* Horizontally scrollable matrix table */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-2.5 px-3 text-slate-700 font-bold text-xs w-[120px] sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_rgba(0,0,0,0.06)]">
                    직원명 / 직책
                  </th>
                  {weekDays.map((d) => (
                    <th
                      key={d.dateStr}
                      onClick={() => setSelectedDateStr(d.dateStr)}
                      className={`py-2 px-1.5 text-center cursor-pointer transition select-none ${
                        d.isToday
                          ? 'bg-sky-100/70 font-extrabold text-sky-900'
                          : d.isSunday
                          ? 'text-rose-500'
                          : d.isSaturday
                          ? 'text-sky-600'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] leading-tight font-semibold">
                        {d.dayName}
                        {d.isToday && <span className="ml-0.5 text-sky-600 font-bold">(오늘)</span>}
                      </div>
                      <div
                        className={`text-xs mt-0.5 inline-block w-6 h-6 rounded-full leading-6 text-center ${
                          d.isToday
                            ? 'bg-sky-600 text-white font-bold'
                            : selectedDateStr === d.dateStr
                            ? 'bg-slate-800 text-white'
                            : ''
                        }`}
                      >
                        {d.dayNum}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaff.map((staff) => {
                  const isCurrent = currentStaff?.id === staff.id;
                  return (
                    <tr
                      key={staff.id}
                      className={`transition ${isCurrent ? 'bg-sky-50/40' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Sticky Staff Profile Column */}
                      <td className="py-2.5 px-3 sticky left-0 bg-white z-10 shadow-[1px_0_0_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: staff.color }}
                          >
                            {staff.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-1">
                              <span>{staff.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-sky-600 text-white px-1 py-0.2 rounded font-bold">
                                  나
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {staff.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Columns for this staff */}
                      {weekDays.map((d) => {
                        const dayEvents = getStaffScheduleForDate(staff.id, d.dateStr);
                        const isSunday = d.isSunday;

                        return (
                          <td
                            key={d.dateStr}
                            onClick={() => {
                              setSelectedDateStr(d.dateStr);
                              if (dayEvents.length === 0 && !isSunday) {
                                onOpenScheduleAdd(d.dateStr);
                              }
                            }}
                            className={`p-1.5 text-center align-middle cursor-pointer transition ${
                              d.isToday
                                ? 'bg-sky-50/40'
                                : selectedDateStr === d.dateStr
                                ? 'bg-slate-50'
                                : ''
                            }`}
                          >
                            {isSunday ? (
                              <span className="text-[10px] text-slate-300 font-normal">
                                휴진
                              </span>
                            ) : dayEvents.length > 0 ? (
                              <div className="space-y-1">
                                {dayEvents.map((ev) => {
                                  const style = getScheduleStyle(ev.type);
                                  return (
                                    <div
                                      key={ev.id}
                                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border leading-none shadow-xs truncate ${style.bg}`}
                                      title={`${ev.type} - ${ev.title}`}
                                    >
                                      {style.label}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="inline-block text-[11px] text-slate-400 font-medium hover:text-sky-600 hover:font-bold">
                                정상
                              </span>
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

          {/* Legend Guide */}
          <div className="flex flex-wrap items-center gap-3 pt-3 mt-1 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">근태 범례:</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>연차</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>오전반차</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>오후반차</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span className="font-bold text-indigo-900">야간진료 당직</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>학회/교육</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 2: MONTHLY OVERVIEW CALENDAR
         ======================================================== */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1">
            <span className="text-rose-500">일</span>
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span className="text-sky-600">토</span>
          </div>

          {/* Calendar Grid */}
          {(() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();

            return (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                  <div
                    key={`p-${idx}`}
                    className="min-h-[50px] p-1 text-slate-300 text-xs text-center rounded-xl bg-slate-50/50"
                  >
                    {prevMonthDays - firstDayOfMonth + idx + 1}
                  </div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const mStr = String(month + 1).padStart(2, '0');
                  const dStr = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${mStr}-${dStr}`;

                  const isSelected = selectedDateStr === dateStr;
                  const isToday =
                    new Date().toISOString().split('T')[0] === dateStr;
                  const daySchedules = getAllSchedulesForDate(dateStr);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`min-h-[50px] p-1 rounded-xl text-left flex flex-col justify-between transition border ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-1 ring-sky-400'
                          : isToday
                          ? 'border-slate-300 bg-amber-50/40'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold leading-none ${
                            isToday
                              ? 'text-sky-600 font-extrabold'
                              : isSelected
                              ? 'text-sky-900'
                              : 'text-slate-800'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {daySchedules.length > 0 && (
                          <span className="text-[9px] font-bold px-1 rounded-full bg-sky-100 text-sky-800">
                            {daySchedules.length}
                          </span>
                        )}
                      </div>

                      <div className="w-full space-y-0.5 mt-1 overflow-hidden max-h-[30px]">
                        {daySchedules.slice(0, 2).map((ev) => {
                          const staff = staffList.find((s) => s.id === ev.staffId);
                          return (
                            <div
                              key={ev.id}
                              className="text-[9px] truncate px-1 rounded font-medium leading-tight flex items-center gap-0.5"
                              style={{
                                backgroundColor: `${staff?.color || '#0284c7'}15`,
                                color: staff?.color || '#0284c7',
                              }}
                            >
                              <span className="font-bold">{staff?.name?.slice(0, 2)}</span>
                              <span>{ev.type}</span>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. Selected Date Deep-Dive Schedule Detail Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {selectedDateStr} 근태 및 일정 상세
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              ({selectedDateEvents.length}건 등록됨)
            </span>
          </div>
          <button
            onClick={() => onOpenScheduleAdd(selectedDateStr)}
            className="text-xs text-sky-600 font-semibold hover:text-sky-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 이 날짜에 등록
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            등록된 휴가나 일정이 없습니다. 원내 전원 정상 진료 예정입니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDateEvents.map((item) => {
              const staff = staffList.find((s) => s.id === item.staffId);
              const style = getScheduleStyle(item.type);
              const canDelete =
                currentStaff?.id === item.staffId ||
                currentStaff?.role === '대표원장' ||
                currentStaff?.role === '총괄실장';

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs mt-0.5"
                      style={{ backgroundColor: staff?.color || '#0284c7' }}
                    >
                      {staff?.name.slice(0, 1) || '직'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {staff?.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {staff?.role}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.bg}`}
                        >
                          {item.type}
                        </span>
                        {item.approvalStatus && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              item.approvalStatus === '승인대기'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : item.approvalStatus === '승인완료'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                          >
                            {item.approvalStatus}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-800 mt-1">
                        {item.title}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400 mt-1">
                        기간: {item.startDate}{' '}
                        {item.endDate !== item.startDate ? `~ ${item.endDate}` : ''}
                      </div>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
                      title="일정 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
