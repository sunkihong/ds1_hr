import React from 'react';
import { Clock, Calendar, PlusCircle, MessageSquareText, Users } from 'lucide-react';

export type TabType = 'today' | 'calendar' | 'scheduleAdd' | 'notices' | 'admin';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unreadNoticesCount?: number;
  pendingApprovalCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  unreadNoticesCount = 0,
  pendingApprovalCount = 0,
}) => {
  const tabs = [
    {
      id: 'today' as TabType,
      label: '오늘 근태',
      icon: Clock,
    },
    {
      id: 'calendar' as TabType,
      label: '주간 근태',
      icon: Calendar,
    },
    {
      id: 'scheduleAdd' as TabType,
      label: '일정 신청',
      icon: PlusCircle,
      isSpecial: true,
    },
    {
      id: 'notices' as TabType,
      label: '인수인계',
      icon: MessageSquareText,
      badge: unreadNoticesCount > 0 ? unreadNoticesCount : undefined,
    },
    {
      id: 'admin' as TabType,
      label: '최고관리자',
      icon: Users,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className="flex flex-col items-center justify-center -mt-3.5 group focus:outline-none"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white scale-105'
                      : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight text-slate-700 mt-1">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="flex flex-col items-center justify-center min-h-[44px] py-1 text-slate-500 hover:text-slate-900 transition-colors relative"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-sky-600 scale-110' : 'text-slate-400'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 ${
                  isActive ? 'text-sky-700 font-bold' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
