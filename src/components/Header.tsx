import React from 'react';
import { Staff } from '../types';
import { RefreshCw, UserCheck, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  clinicName: string;
  currentStaff: Staff | null;
  onOpenStaffSwitch: () => void;
  onOpenGreeting?: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedTime: Date | null;
}

export const Header: React.FC<HeaderProps> = ({
  clinicName,
  currentStaff,
  onOpenStaffSwitch,
  onOpenGreeting,
  onRefresh,
  isSyncing,
  isOnline,
  lastSyncedTime,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand & Clinic Name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            🦷
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {clinicName}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              {isOnline ? (
                <span className="flex items-center gap-1 text-slate-500">
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span>실시간 동기화</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <WifiOff className="w-3 h-3" />
                  <span>오프라인</span>
                </span>
              )}
              {lastSyncedTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-mono text-[10px]">
                    {lastSyncedTime.toTimeString().slice(0, 5)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* User Switcher & Refresh Action */}
        <div className="flex items-center gap-1.5">
          {/* Daily Fortune briefing shortcut */}
          {onOpenGreeting && (
            <button
              onClick={onOpenGreeting}
              title="오늘의 운세 & 공지 보기"
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200/80 transition active:scale-95 flex items-center gap-1"
            >
              <span>✨ 운세</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            title="서버 데이터 새로고침"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {/* Current Staff Button */}
          <button
            onClick={onOpenStaffSwitch}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition active:scale-95"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentStaff?.color || '#0284c7' }}
            />
            <span className="max-w-[80px] truncate font-semibold text-slate-900">
              {currentStaff ? currentStaff.name : '직원 선택'}
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {currentStaff?.role}
            </span>
            <UserCheck className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
