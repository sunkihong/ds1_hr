import React, { useState, useEffect, useCallback } from 'react';
import {
  ClinicNotice,
  ClinicSettings,
  ScheduleEvent,
  Staff,
  TodayStaffStatus,
  ClinicHoliday,
  ClinicWifiRouter,
  ManualAttendanceRequest,
  AttendanceRecord,
} from './types';
import {
  fetchClinicSettings,
  fetchNotices,
  fetchSchedules,
  fetchStaffList,
  fetchTodayAttendance,
  fetchAttendanceHistory,
  fetchHolidays,
  fetchWifiRouters,
  fetchManualAttendanceRequests,
  seedFirestoreIfNeeded,
} from './api';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { PWAInstallBar } from './components/PWAInstallBar';
import { TodayAttendanceView } from './components/TodayAttendanceView';
import { SharedCalendarView } from './components/SharedCalendarView';
import { ScheduleFormModal } from './components/ScheduleFormModal';
import { ClinicNoticesView } from './components/ClinicNoticesView';
import { StaffSwitchModal } from './components/StaffSwitchModal';
import { DailyGreetingScreen } from './components/DailyGreetingScreen';
import { AdminPageView } from './components/AdminPageView';
import { AccountRegistrationModal } from './components/AccountRegistrationModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, AlertCircle } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // App State
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(() => {
    const savedId = localStorage.getItem('dentalwork_current_staff_id');
    return null; // Will load after staff list fetch
  });
  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    return localStorage.getItem('dentalwork_account_registered') === 'true';
  });

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
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showScheduleAddModal, setShowScheduleAddModal] = useState(false);
  const [presetScheduleDate, setPresetScheduleDate] = useState<string | undefined>();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<ClinicHoliday[]>([]);
  const [wifiRouters, setWifiRouters] = useState<ClinicWifiRouter[]>([]);
  const [manualRequests, setManualRequests] = useState<ManualAttendanceRequest[]>([]);
  const [notifiedApprovalIds, setNotifiedApprovalIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentStaff) return;

    let newAlerts = false;
    let alertMessage = '';

    schedules.forEach((s) => {
      if (s.staffId === currentStaff.id && s.approvalStatus === '승인완료' && !notifiedApprovalIds.includes(s.id)) {
        alertMessage += `[승인] ${s.title} 일정이 승인되었습니다.\n`;
        setNotifiedApprovalIds((prev) => [...prev, s.id]);
        newAlerts = true;
      }
    });

    manualRequests.forEach((m) => {
      if (m.staffId === currentStaff.id && m.status === '승인' && !notifiedApprovalIds.includes(m.id)) {
        alertMessage += `[승인] ${m.date} ${m.requestType} 신청이 승인되었습니다.\n`;
        setNotifiedApprovalIds((prev) => [...prev, m.id]);
        newAlerts = true;
      }
    });

    if (newAlerts) {
      alert(alertMessage);
    }
  }, [schedules, manualRequests, currentStaff, notifiedApprovalIds]);

  const [showGreeting, setShowGreeting] = useState<boolean>(() => {
    const skipDate = localStorage.getItem('dangsan_greeting_skip_date');
    const todayStr = new Date().toISOString().split('T')[0];
    return skipDate !== todayStr;
  });

  // Fetch all data from Firestore with caching and fallback mechanism
  const loadAllData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    setSyncError(null);

    let isCompleted = false;
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));

    try {
      await Promise.race([
        (async () => {
          await seedFirestoreIfNeeded().catch(() => {});
          const currentMonth = new Date().toISOString().slice(0, 7);
          const [
            settingsRes,
            staffData,
            attendanceData,
            scheduleData,
            noticeData,
            historyData,
            holidayData,
            wifiData,
            manualReqData,
          ] = await Promise.all([
            fetchClinicSettings(),
            fetchStaffList(),
            fetchTodayAttendance(),
            fetchSchedules(),
            fetchNotices(),
            fetchAttendanceHistory(currentMonth),
            fetchHolidays(),
            fetchWifiRouters(),
            fetchManualAttendanceRequests(),
          ]);

          setClinicSettings(settingsRes.settings);
          setStaffList(staffData);
          setTodayRecords(attendanceData.records);
          setSchedules(scheduleData);
          setNotices(noticeData);
          setAttendanceHistory(historyData);
          setHolidays(holidayData);
          setWifiRouters(wifiData);
          setManualRequests(manualReqData);
          setLastSyncedTime(new Date());

          // Save to localStorage cache for offline fallback
          try {
            localStorage.setItem('dentalwork_cache_settings', JSON.stringify(settingsRes.settings));
            localStorage.setItem('dentalwork_cache_staff', JSON.stringify(staffData));
            localStorage.setItem('dentalwork_cache_todayRecords', JSON.stringify(attendanceData.records));
            localStorage.setItem('dentalwork_cache_schedules', JSON.stringify(scheduleData));
            localStorage.setItem('dentalwork_cache_notices', JSON.stringify(noticeData));
            localStorage.setItem('dentalwork_cache_history', JSON.stringify(historyData));
            localStorage.setItem('dentalwork_cache_holidays', JSON.stringify(holidayData));
            localStorage.setItem('dentalwork_cache_wifi', JSON.stringify(wifiData));
            localStorage.setItem('dentalwork_cache_manual', JSON.stringify(manualReqData));
          } catch (e) {
            console.warn('Cache save warning:', e);
          }

          const savedStaffId = localStorage.getItem('dentalwork_current_staff_id');
          const isAdminLoggedIn = sessionStorage.getItem('dangsan_admin_logged_in') === 'true';

          if (savedStaffId) {
            const found = staffData.find((s) => s.id === savedStaffId);
            if (found) setCurrentStaff(found);
          } else if (isAdminLoggedIn && staffData.length > 0) {
            const adminStaff = staffData.find((s) => s.role === '대표원장' || s.role === '총괄실장') || staffData[0];
            setCurrentStaff(adminStaff);
            localStorage.setItem('dentalwork_current_staff_id', adminStaff.id);
            setIsRegistered(true);
          }
          isCompleted = true;
        })(),
        timeoutPromise,
      ]);

      if (!isCompleted) {
        throw new Error('Firestore connection timed out');
      }
    } catch (err: unknown) {
      console.warn('Data sync failed or timed out, loading from localStorage cache:', err);
      try {
        const cachedStaff = localStorage.getItem('dentalwork_cache_staff');
        const cachedSettings = localStorage.getItem('dentalwork_cache_settings');
        const cachedToday = localStorage.getItem('dentalwork_cache_todayRecords');
        const cachedSchedules = localStorage.getItem('dentalwork_cache_schedules');
        const cachedNotices = localStorage.getItem('dentalwork_cache_notices');
        const cachedHistory = localStorage.getItem('dentalwork_cache_history');
        const cachedHolidays = localStorage.getItem('dentalwork_cache_holidays');
        const cachedWifi = localStorage.getItem('dentalwork_cache_wifi');
        const cachedManual = localStorage.getItem('dentalwork_cache_manual');

        if (cachedStaff) {
          const staffData = JSON.parse(cachedStaff);
          setStaffList(staffData);
          if (cachedSettings) setClinicSettings(JSON.parse(cachedSettings));
          if (cachedToday) setTodayRecords(JSON.parse(cachedToday));
          if (cachedSchedules) setSchedules(JSON.parse(cachedSchedules));
          if (cachedNotices) setNotices(JSON.parse(cachedNotices));
          if (cachedHistory) setAttendanceHistory(JSON.parse(cachedHistory));
          if (cachedHolidays) setHolidays(JSON.parse(cachedHolidays));
          if (cachedWifi) setWifiRouters(JSON.parse(cachedWifi));
          if (cachedManual) setManualRequests(JSON.parse(cachedManual));

          const savedStaffId = localStorage.getItem('dentalwork_current_staff_id');
          if (savedStaffId) {
            const found = staffData.find((s: Staff) => s.id === savedStaffId);
            if (found) setCurrentStaff(found);
          }
          setSyncError('오프라인 캐시 모드로 동작 중입니다.');
        } else {
          setSyncError('Firebase Firestore 동기화 실패 및 캐시가 없습니다.');
        }
      } catch (cacheErr) {
        console.error('Fallback cache loading failed:', cacheErr);
        setSyncError('Firebase Firestore 동기화 연결 상태를 확인해주세요.');
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSelectStaff = (staff: Staff) => {
    setCurrentStaff(staff);
    localStorage.setItem('dentalwork_current_staff_id', staff.id);
  };

  const handleAccountRegister = (staff: Staff) => {
    setCurrentStaff(staff);
    setIsRegistered(true);
    localStorage.setItem('dentalwork_current_staff_id', staff.id);
    localStorage.setItem('dentalwork_account_registered', 'true');
  };

  const handleOpenScheduleAdd = (presetDate?: string) => {
    setPresetScheduleDate(presetDate);
    setShowScheduleAddModal(true);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'admin' && sessionStorage.getItem('dangsan_admin_logged_in') !== 'true') {
      setShowAdminLoginModal(true);
      return;
    }
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
          당산원치과 Firebase DB 연결 중...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          클라우드 데이터베이스에서 직원 및 근태 정보를 동기화하고 있습니다
        </p>
      </div>
    );
  }

  const isAdminLoggedIn = sessionStorage.getItem('dangsan_admin_logged_in') === 'true';

  // If user hasn't completed phone/name verification registration process on this device and not logged in as admin
  if ((!isRegistered || !currentStaff) && !isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <AccountRegistrationModal
          staffList={staffList}
          onRegister={handleAccountRegister}
          onAdminLogin={() => setShowAdminLoginModal(true)}
        />

        {showAdminLoginModal && (
          <AdminLoginModal
            onSuccess={() => {
              setShowAdminLoginModal(false);
              setIsRegistered(true);
              if (!currentStaff && staffList.length > 0) {
                const adminStaff = staffList.find((s) => s.role === '대표원장' || s.role === '총괄실장') || staffList[0];
                setCurrentStaff(adminStaff);
                localStorage.setItem('dentalwork_current_staff_id', adminStaff.id);
              }
              localStorage.setItem('dentalwork_account_registered', 'true');
              setCurrentTab('admin');
            }}
            onClose={() => setShowAdminLoginModal(false)}
          />
        )}
      </div>
    );
  }

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

  const isHighAdminRole = currentStaff?.role === '대표원장' || currentStaff?.role === '총괄실장';

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col selection:bg-sky-500 selection:text-white">
      <PWAInstallBar />

      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs px-3 py-1.5 flex items-center justify-center gap-1.5 font-medium shadow-xs">
          <WifiOff className="w-3.5 h-3.5" />
          오프라인 모드입니다. 네트워크 연결 시 Firestore와 실시간 동기화됩니다.
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

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-5">
        {currentTab === 'today' && (
          <TodayAttendanceView
            currentStaff={currentStaff}
            todayRecords={todayRecords}
            holidays={holidays}
            wifiRouters={wifiRouters}
            manualRequests={manualRequests}
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
            wifiRouters={wifiRouters}
            manualRequests={manualRequests}
            onRefresh={() => loadAllData()}
            onSelectStaff={handleSelectStaff}
          />
        )}
      </main>

      <BottomNav
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        unreadNoticesCount={notices.length}
        pendingApprovalCount={
          isHighAdminRole
            ? schedules.filter((s) => !s.approvalStatus || s.approvalStatus === '승인대기').length +
              manualRequests.filter((m) => m.status === '승인대기').length
            : 0
        }
      />

      {showStaffSwitchModal && (
        <StaffSwitchModal
          staffList={staffList}
          currentStaff={currentStaff}
          onSelectStaff={handleSelectStaff}
          onClose={() => setShowStaffSwitchModal(false)}
        />
      )}

      {showScheduleAddModal && (
        <ScheduleFormModal
          staffList={staffList}
          currentStaff={currentStaff}
          presetDate={presetScheduleDate}
          onClose={() => setShowScheduleAddModal(false)}
          onSuccess={() => loadAllData()}
        />
      )}

      {showAdminLoginModal && (
        <AdminLoginModal
          onSuccess={() => {
            setShowAdminLoginModal(false);
            setCurrentTab('admin');
          }}
          onClose={() => setShowAdminLoginModal(false)}
        />
      )}
    </div>
  );
}
