import React, { useState, useEffect, useCallback } from 'react';
import {
  ClinicNotice,
  ClinicSettings,
  ScheduleEvent,
  Staff,
  TodayStaffStatus,
  ClinicHoliday,
} from './types';
import {
  fetchClinicSettings,
  fetchNotices,
  fetchSchedules,
  fetchStaffList,
  fetchTodayAttendance,
  fetchAttendanceHistory,
  fetchHolidays,
} from './api';
import { AttendanceRecord } from './types';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { PWAInstallBar } from './components/PWAInstallBar';
import { TodayAttendanceView } from './components/TodayAttendanceView';
import { SharedCalendarView } from './components/SharedCalendarView';
import { ScheduleFormModal } from './components/ScheduleFormModal';
import { ClinicNoticesView } from './components/ClinicNoticesView';
import { StaffManagementView } from './components/StaffManagementView';
import { StaffSwitchModal } from './components/StaffSwitchModal';
import { DailyGreetingScreen } from './components/DailyGreetingScreen';
import { AdminPageView } from './components/AdminPageView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, AlertCircle } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // App State
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [todayRecords, setTodayRecords] = useState<TodayStaffStatus[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [notices, setNotices] = useState<ClinicNotice[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    name: '당산원치과',
    openTime: '09:30',
    closeTime: '18:30',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    nightClinicDays: ['화', '목'],
    nightClinicCloseTime: '20:30',
    address: '서울특별시 영등포구 당산로 123 메디컬타워 4층',
    phone: '02-2633-2875',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [showStaffSwitchModal, setShowStaffSwitchModal] = useState(false);
  const [showScheduleAddModal, setShowScheduleAddModal] = useState(false);
  const [presetScheduleDate, setPresetScheduleDate] = useState<string | undefined>();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<ClinicHoliday[]>([]);
  const [showGreeting, setShowGreeting] = useState<boolean>(() => {
    const skipDate = localStorage.getItem('dangsan_greeting_skip_date');
    const todayStr = new Date().toISOString().split('T')[0];
    return skipDate !== todayStr;
  });

  // Fetch all data from designated server
  const loadAllData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    setSyncError(null);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [settingsRes, staffData, attendanceData, scheduleData, noticeData, historyData, holidayData] =
        await Promise.all([
          fetchClinicSettings(),
          fetchStaffList(),
          fetchTodayAttendance(),
          fetchSchedules(),
          fetchNotices(),
          fetchAttendanceHistory(currentMonth),
          fetchHolidays(),
        ]);

      setClinicSettings(settingsRes.settings);
      setStaffList(staffData);
      setTodayRecords(attendanceData.records);
      setSchedules(scheduleData);
      setNotices(noticeData);
      setAttendanceHistory(historyData);
      setHolidays(holidayData);
      setLastSyncedTime(new Date());

      // If no current staff selected yet, load from localStorage or default to staff-06 (윤지민 위생사)
      const savedStaffId = localStorage.getItem('dentalwork_current_staff_id');
      if (savedStaffId) {
        const found = staffData.find((s) => s.id === savedStaffId);
        if (found) setCurrentStaff(found);
        else if (staffData.length > 0) setCurrentStaff(staffData[0]);
      } else if (staffData.length > 0) {
        // Default to first hygienist or first staff member
        const defaultStaff = staffData.find((s) => s.role === '치과위생사') || staffData[0];
        setCurrentStaff(defaultStaff);
        localStorage.setItem('dentalwork_current_staff_id', defaultStaff.id);
      }
    } catch (err: unknown) {
      console.error('Data sync failed:', err);
      setSyncError('서버 동기화 연결 상태를 확인해주세요.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Periodic polling every 8 seconds for real-time synchronization between phones
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAllData(true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Handle staff selection
  const handleSelectStaff = (staff: Staff) => {
    setCurrentStaff(staff);
    localStorage.setItem('dentalwork_current_staff_id', staff.id);
  };

  const handleOpenScheduleAdd = (presetDate?: string) => {
    setPresetScheduleDate(presetDate);
    setShowScheduleAddModal(true);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'scheduleAdd') {
      handleOpenScheduleAdd();
    } else {
      setCurrentTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && staffList.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-sky-600 text-white flex items-center justify-center text-3xl shadow-lg mb-4 animate-bounce">
          🦷
        </div>
        <h2 className="text-base font-bold text-slate-800">
          당산원치과 동기화 서버 연결 중...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          10인 직원 근태 및 일정을 불러오고 있습니다
        </p>
      </div>
    );
  }

  // 1st screen on vertical mobile: Daily personalized fortune & clinic notices screen
  if (showGreeting && !isLoading) {
    return (
      <DailyGreetingScreen
        currentStaff={currentStaff}
        notices={notices}
        holidays={holidays}
        onSkip={() => setShowGreeting(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* PWA Install Notification Bar */}
      <PWAInstallBar />

      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs px-3 py-1.5 flex items-center justify-center gap-1.5 font-medium shadow-xs">
          <WifiOff className="w-3.5 h-3.5" />
          오프라인 모드입니다. 네트워크 연결 시 자동으로 서버와 동기화됩니다.
        </div>
      )}

      {syncError && (
        <div className="bg-rose-50 text-rose-700 text-xs px-3 py-1.5 flex items-center justify-between border-b border-rose-200">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{syncError}</span>
          </div>
          <button
            onClick={() => loadAllData()}
            className="underline font-bold text-[11px] ml-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Header */}
      <Header
        clinicName={clinicSettings.name}
        currentStaff={currentStaff}
        onOpenStaffSwitch={() => setShowStaffSwitchModal(true)}
        onOpenGreeting={() => setShowGreeting(true)}
        onRefresh={() => loadAllData()}
        isSyncing={isSyncing}
        isOnline={isOnline}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Main Content Area: Responsive container for mobile viewports (375px~430px) expanding cleanly on desktop */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-5">
        {currentTab === 'today' && (
          <TodayAttendanceView
            currentStaff={currentStaff}
            todayRecords={todayRecords}
            holidays={holidays}
            onRefresh={() => loadAllData()}
            onOpenScheduleAdd={() => handleOpenScheduleAdd()}
            onOpenNotices={() => setCurrentTab('notices')}
            notices={notices}
          />
        )}

        {currentTab === 'calendar' && (
          <SharedCalendarView
            schedules={schedules}
            staffList={staffList}
            holidays={holidays}
            onOpenScheduleAdd={handleOpenScheduleAdd}
            onRefresh={() => loadAllData()}
            currentStaff={currentStaff}
          />
        )}

        {currentTab === 'notices' && (
          <ClinicNoticesView
            notices={notices}
            currentStaff={currentStaff}
            onRefresh={() => loadAllData()}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPageView
            currentStaff={currentStaff}
            staffList={staffList}
            schedules={schedules}
            attendanceRecords={attendanceHistory}
            todayRecords={todayRecords}
            clinicSettings={clinicSettings}
            holidays={holidays}
            onRefresh={() => loadAllData()}
            onSelectStaff={handleSelectStaff}
          />
        )}
      </main>

      {/* Bottom Navigation for Mobile Touch */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        unreadNoticesCount={notices.length}
        pendingApprovalCount={
          schedules.filter((s) => !s.approvalStatus || s.approvalStatus === '승인대기').length
        }
      />

      {/* Modal: Staff Switcher */}
      {showStaffSwitchModal && (
        <StaffSwitchModal
          staffList={staffList}
          currentStaff={currentStaff}
          onSelectStaff={handleSelectStaff}
          onClose={() => setShowStaffSwitchModal(false)}
        />
      )}

      {/* Modal: Schedule & Leave Registration */}
      {showScheduleAddModal && (
        <ScheduleFormModal
          staffList={staffList}
          currentStaff={currentStaff}
          presetDate={presetScheduleDate}
          onClose={() => setShowScheduleAddModal(false)}
          onSuccess={() => loadAllData()}
        />
      )}
    </div>
  );
}
