import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from '@firebase/firestore';
import { db } from './firebase';
import {
  Staff,
  AttendanceRecord,
  ClinicWifiRouter,
  ManualAttendanceRequest,
  ScheduleEvent,
  ClinicNotice,
  ClinicHoliday,
  ClinicSettings,
  TodayStaffStatus,
} from './types';

const INITIAL_STAFF: Partial<Staff>[] = [
  { id: 'staff-01', name: '박진우', role: '대표원장', department: '진료부', phone: '010-3841-1001', color: '#0284c7', totalLeaveDays: 15, usedLeaveDays: 2, joinDate: '2020-03-01', avatarIcon: 'tooth' },
  { id: 'staff-02', name: '이서진', role: '원장', department: '진료부', phone: '010-4921-2002', color: '#0369a1', totalLeaveDays: 15, usedLeaveDays: 3, joinDate: '2022-01-10', avatarIcon: 'stethoscope' },
  { id: 'staff-03', name: '정미래', role: '총괄실장', department: '경영지원', phone: '010-5219-3003', color: '#7c3aed', totalLeaveDays: 15, usedLeaveDays: 4, joinDate: '2021-05-15', avatarIcon: 'briefcase' },
  { id: 'staff-04', name: '한소희', role: '데스크주임', department: '경영지원', phone: '010-6712-4004', color: '#db2777', totalLeaveDays: 15, usedLeaveDays: 1.5, joinDate: '2023-04-01', avatarIcon: 'user-check' },
  { id: 'staff-05', name: '강다은', role: '치과위생사', department: '치위생팀', phone: '010-7819-5005', color: '#059669', totalLeaveDays: 15, usedLeaveDays: 5, joinDate: '2021-09-01', avatarIcon: 'shield-check' },
  { id: 'staff-06', name: '윤지민', role: '치과위생사', department: '치위생팀', phone: '010-8910-6006', color: '#10b981', totalLeaveDays: 15, usedLeaveDays: 3, joinDate: '2022-06-15', avatarIcon: 'heart-pulse' },
  { id: 'staff-07', name: '최유나', role: '치과위생사', department: '치위생팀', phone: '010-9011-7007', color: '#14b8a6', totalLeaveDays: 15, usedLeaveDays: 2.5, joinDate: '2023-02-20', avatarIcon: 'smile' },
  { id: 'staff-08', name: '오승현', role: '치과위생사', department: '치위생팀', phone: '010-2134-8008', color: '#06b6d4', totalLeaveDays: 15, usedLeaveDays: 1, joinDate: '2024-01-08', avatarIcon: 'activity' },
  { id: 'staff-09', name: '백현우', role: '치과기공사', department: '기공실', phone: '010-4321-9009', color: '#ea580c', totalLeaveDays: 15, usedLeaveDays: 4, joinDate: '2021-11-10', avatarIcon: 'tool' },
  { id: 'staff-10', name: '김태린', role: '진료보조', department: '치위생팀', phone: '010-5432-0010', color: '#64748b', totalLeaveDays: 15, usedLeaveDays: 2, joinDate: '2024-03-02', avatarIcon: 'users' },
];

const INITIAL_SETTINGS: ClinicSettings = {
  name: '당산원치과',
  openTime: '09:30',
  closeTime: '18:30',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  nightClinicDays: ['화', '목'],
  nightClinicCloseTime: '20:30',
  saturdayType: '반일진료',
  saturdayCloseTime: '13:30',
  sundayType: '전체휴진',
  address: '서울특별시 영등포구 당산로 123 메디컬타워 4층',
  phone: '02-2633-2875',
};

export async function seedFirestoreIfNeeded() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Staff
    const staffSnap = await getDocs(collection(db, 'staff')).catch(() => null);
    if (!staffSnap || staffSnap.empty) {
      for (const st of INITIAL_STAFF) {
        await setDoc(doc(db, 'staff', st.id!), st).catch(() => {});
      }
    }

    // 2. Settings
    const settingsRef = doc(db, 'settings', 'clinic');
    const settingsSnap = await getDoc(settingsRef).catch(() => null);
    if (!settingsSnap || !settingsSnap.exists()) {
      await setDoc(settingsRef, INITIAL_SETTINGS).catch(() => {});
    }

    // 3. Wifi Routers
    const wifiSnap = await getDocs(collection(db, 'wifiRouters')).catch(() => null);
    if (!wifiSnap || wifiSnap.empty) {
      const sampleWifi = {
        id: 'wifi-01',
        name: '당산원치과 메인AP',
        ssid: 'DangsanDental_WiFi',
        bssid: '00:11:22:33:44:55',
        location: '4층 진료실 및 데스크',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'wifiRouters', sampleWifi.id), sampleWifi).catch(() => {});
    }

    // 4. Attendance Records for today
    const attSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', today))).catch(() => null);
    if (!attSnap || attSnap.empty) {
      const sampleAtts = [
        { id: `att-staff-01-${today}`, staffId: 'staff-01', date: today, clockInTime: '09:05:12', clockOutTime: null, status: '정상출근', location: '당산원치과 원내 (DangsanDental_WiFi)', authMethod: 'wifi', wifiSsid: 'DangsanDental_WiFi', note: '정시 출근' },
        { id: `att-staff-02-${today}`, staffId: 'staff-02', date: today, clockInTime: '09:12:45', clockOutTime: null, status: '정상출근', location: '당산원치과 원내 (DangsanDental_WiFi)', authMethod: 'wifi', wifiSsid: 'DangsanDental_WiFi', note: '' },
        { id: `att-staff-03-${today}`, staffId: 'staff-03', date: today, clockInTime: '08:50:30', clockOutTime: null, status: '정상출근', location: '당산원치과 원내 (DangsanDental_WiFi)', authMethod: 'wifi', wifiSsid: 'DangsanDental_WiFi', note: '일찍 출근' },
        { id: `att-staff-04-${today}`, staffId: 'staff-04', date: today, clockInTime: '09:35:10', clockOutTime: null, status: '지각', location: '당산원치과 원내 (DangsanDental_WiFi)', authMethod: 'wifi', wifiSsid: 'DangsanDental_WiFi', note: '교통 체증으로 지각' },
        { id: `att-staff-05-${today}`, staffId: 'staff-05', date: today, clockInTime: null, clockOutTime: null, status: '휴가', location: '', authMethod: 'wifi', wifiSsid: '', note: '연차 휴가' },
        { id: `att-staff-06-${today}`, staffId: 'staff-06', date: today, clockInTime: '09:02:15', clockOutTime: null, status: '정상출근', location: '당산원치과 원내 (DangsanDental_WiFi)', authMethod: 'wifi', wifiSsid: 'DangsanDental_WiFi', note: '' },
      ];
      for (const att of sampleAtts) {
        await setDoc(doc(db, 'attendance', att.id), att).catch(() => {});
      }
    }

    // 5. Schedules
    const schSnap = await getDocs(collection(db, 'schedules')).catch(() => null);
    if (!schSnap || schSnap.empty) {
      const sampleSch = {
        id: 'sch-sample-1',
        staffId: 'staff-05',
        title: '강다은 연차휴가',
        type: '연차',
        startDate: today,
        endDate: today,
        description: '개인 사유 휴가',
        createdAt: new Date().toISOString(),
        approvalStatus: '승인완료',
        approvedBy: '박진우 (대표원장)',
      };
      await setDoc(doc(db, 'schedules', sampleSch.id), sampleSch).catch(() => {});
    }

    // 6. Todos
    const todoSnap = await getDocs(collection(db, 'todos')).catch(() => null);
    if (!todoSnap || todoSnap.empty) {
      const sampleTodos = [
        { id: 'todo-01', title: '오전 진료기구 소독 및 세팅 점검', assignedTo: 'staff-05', assignedName: '강다은 치과위생사', dueDate: today, completed: true, createdAt: new Date().toISOString(), createdBy: '정미래 총괄실장' },
        { id: 'todo-02', title: '임플란트 수술 2건 예약 확인 및 환자 안내 문자 발송', assignedTo: 'staff-04', assignedName: '한소희 데스크주임', dueDate: today, completed: false, createdAt: new Date().toISOString(), createdBy: '정미래 총괄실장' },
        { id: 'todo-03', title: '방사선 장비 정기 안전 점검 실시', assignedTo: 'staff-09', assignedName: '백현우 치과기공사', dueDate: today, completed: false, createdAt: new Date().toISOString(), createdBy: '박진우 대표원장' },
      ];
      for (const td of sampleTodos) {
        await setDoc(doc(db, 'todos', td.id), td).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Seed warning:', err);
  }
}

export async function fetchClinicSettings(): Promise<{ settings: ClinicSettings; serverTime: string }> {
  try {
    const ref = doc(db, 'settings', 'clinic');
    const snap = await getDoc(ref);
    const settings = snap.exists() ? (snap.data() as ClinicSettings) : INITIAL_SETTINGS;
    return { settings, serverTime: new Date().toISOString() };
  } catch (err) {
    return { settings: INITIAL_SETTINGS, serverTime: new Date().toISOString() };
  }
}

export async function updateClinicSettings(settings: Partial<ClinicSettings>): Promise<{ success: boolean; settings: ClinicSettings }> {
  const ref = doc(db, 'settings', 'clinic');
  await setDoc(ref, settings, { merge: true }).catch(() => {});
  const snap = await getDoc(ref).catch(() => null);
  const updated = snap && snap.exists() ? (snap.data() as ClinicSettings) : { ...INITIAL_SETTINGS, ...settings };
  return { success: true, settings: updated };
}

export async function fetchStaffList(): Promise<Staff[]> {
  try {
    const snap = await getDocs(collection(db, 'staff'));
    if (snap.empty) return INITIAL_STAFF as Staff[];
    return snap.docs.map((d) => d.data() as Staff);
  } catch (err) {
    return INITIAL_STAFF as Staff[];
  }
}

export async function addStaffMember(data: Partial<Staff>): Promise<Staff> {
  const id = `staff-${Date.now()}`;
  const newStaff: Staff = {
    id,
    name: data.name || '',
    role: data.role || '치과위생사',
    department: data.department || '치위생팀',
    phone: data.phone || '',
    color: data.color || '#0284c7',
    totalLeaveDays: Number(data.totalLeaveDays) || 15,
    usedLeaveDays: Number(data.usedLeaveDays) || 0,
    joinDate: data.joinDate || new Date().toISOString().split('T')[0],
    avatarIcon: data.avatarIcon || 'smile',
  };
  await setDoc(doc(db, 'staff', id), newStaff).catch(() => {});
  return newStaff;
}

export async function updateStaffMember(id: string, data: Partial<Staff>): Promise<Staff> {
  const ref = doc(db, 'staff', id);
  await updateDoc(ref, data).catch(() => {});
  const updatedSnap = await getDoc(ref).catch(() => null);
  return updatedSnap && updatedSnap.exists() ? (updatedSnap.data() as Staff) : ({ id, ...data } as Staff);
}

export async function deleteStaffMember(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'staff', id)).catch(() => {});
  return { success: true };
}

export async function fetchTodayAttendance(dateStr?: string): Promise<{ date: string; records: TodayStaffStatus[]; serverTime: string }> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  try {
    const staffList = await fetchStaffList();
    const attSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', targetDate)));
    const records = attSnap.docs.map((d) => d.data() as AttendanceRecord);

    const schSnap = await getDocs(collection(db, 'schedules'));
    const allSchedules = schSnap.docs.map((d) => d.data() as ScheduleEvent);

    const fullStatus: TodayStaffStatus[] = staffList.map((staff) => {
      const record = records.find((r) => r.staffId === staff.id) || null;
      const schedule = allSchedules.find(
        (s) => s.staffId === staff.id && s.startDate <= targetDate && s.endDate >= targetDate
      ) || null;
      const status = record?.status || (schedule ? (schedule.type.includes('반차') ? '반차' : '휴가') : '출근전');
      return { staff, record, todaySchedule: schedule, status };
    });

    return { date: targetDate, records: fullStatus, serverTime: new Date().toISOString() };
  } catch (err) {
    const staffList = INITIAL_STAFF as Staff[];
    const fullStatus: TodayStaffStatus[] = staffList.map((staff) => ({
      staff,
      record: null,
      todaySchedule: null,
      status: '출근전',
    }));
    return { date: targetDate, records: fullStatus, serverTime: new Date().toISOString() };
  }
}

export async function clockIn(
  staffId: string,
  note?: string,
  location?: string,
  wifiOptions?: { authMethod?: 'wifi' | 'unverified' | 'manual_approved'; wifiSsid?: string; wifiBssid?: string }
): Promise<{ success: boolean; record: AttendanceRecord; message: string }> {
  const today = new Date().toISOString().split('T')[0];
  const id = `att-${staffId}-${today}`;
  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0];

  const ref = doc(db, 'attendance', id);
  const existingSnap = await getDoc(ref).catch(() => null);
  const settingsRes = await fetchClinicSettings();
  const [openH, openM] = settingsRes.settings.openTime.split(':').map(Number);
  const isLate = now.getHours() > openH || (now.getHours() === openH && now.getMinutes() > openM);
  const status = isLate ? '지각' : '정상출근';

  const recordData: AttendanceRecord = {
    id,
    staffId,
    date: today,
    clockInTime: currentTime,
    clockOutTime: existingSnap && existingSnap.exists() ? (existingSnap.data() as AttendanceRecord).clockOutTime : null,
    status,
    note: note || (existingSnap && existingSnap.exists() ? (existingSnap.data() as AttendanceRecord).note : ''),
    location: location || '치과의원 원내',
    authMethod: wifiOptions?.authMethod || 'wifi',
    wifiSsid: wifiOptions?.wifiSsid || '',
  };

  await setDoc(ref, recordData, { merge: true }).catch(() => {});
  return { success: true, record: recordData, message: `${currentTime} 출근 기록 완료` };
}

export async function clockOut(
  staffId: string,
  note?: string,
  wifiOptions?: { authMethod?: 'wifi' | 'unverified' | 'manual_approved'; wifiSsid?: string; wifiBssid?: string }
): Promise<{ success: boolean; record: AttendanceRecord; message: string }> {
  const today = new Date().toISOString().split('T')[0];
  const id = `att-${staffId}-${today}`;
  const currentTime = new Date().toTimeString().split(' ')[0];

  const ref = doc(db, 'attendance', id);
  const existingSnap = await getDoc(ref).catch(() => null);
  const existing = existingSnap && existingSnap.exists() ? (existingSnap.data() as AttendanceRecord) : null;

  const recordData: AttendanceRecord = {
    id,
    staffId,
    date: today,
    clockInTime: existing?.clockInTime || null,
    clockOutTime: currentTime,
    status: '퇴근완료',
    note: note || existing?.note || '',
    location: existing?.location || '치과의원 원내',
    authMethod: wifiOptions?.authMethod || existing?.authMethod || 'wifi',
    wifiSsid: wifiOptions?.wifiSsid || existing?.wifiSsid || '',
  };

  await setDoc(ref, recordData, { merge: true }).catch(() => {});
  return { success: true, record: recordData, message: `${currentTime} 퇴근 기록 완료` };
}

export async function fetchSchedules(monthStr?: string): Promise<ScheduleEvent[]> {
  try {
    const snap = await getDocs(collection(db, 'schedules'));
    let schedules = snap.docs.map((d) => d.data() as ScheduleEvent);
    if (monthStr) schedules = schedules.filter((s) => s.startDate.startsWith(monthStr) || s.endDate.startsWith(monthStr));
    return schedules;
  } catch (err) {
    return [];
  }
}

export async function createSchedule(data: {
  staffId: string;
  title?: string;
  type: string;
  startDate: string;
  endDate?: string;
  description?: string;
  approvalStatus?: string;
}): Promise<ScheduleEvent> {
  const id = `sch-${Date.now()}`;
  const newSchedule: ScheduleEvent = {
    id,
    staffId: data.staffId,
    title: data.title || `${data.type} 신청`,
    type: data.type as any,
    startDate: data.startDate,
    endDate: data.endDate || data.startDate,
    description: data.description || '',
    createdAt: new Date().toISOString(),
    approvalStatus: (data.approvalStatus || '승인대기') as any,
  };
  await setDoc(doc(db, 'schedules', id), newSchedule).catch(() => {});
  return newSchedule;
}

export async function deleteSchedule(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'schedules', id)).catch(() => {});
  return { success: true };
}

export async function fetchNotices(): Promise<ClinicNotice[]> {
  try {
    const snap = await getDocs(collection(db, 'notices'));
    const notices = snap.docs.map((d) => d.data() as ClinicNotice);
    return notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    return [];
  }
}

export async function createNotice(data: {
  staffId: string;
  content: string;
  type?: '공지사항' | '인수인계' | '특이사항';
  pinned?: boolean;
}): Promise<ClinicNotice> {
  const staffList = await fetchStaffList();
  const staff = staffList.find((s) => s.id === data.staffId);
  const id = `not-${Date.now()}`;
  const newNotice: ClinicNotice = {
    id,
    staffId: data.staffId,
    staffName: staff ? `${staff.name} ${staff.role}` : '직원',
    type: data.type || '공지사항',
    content: data.content,
    createdAt: new Date().toISOString(),
    pinned: !!data.pinned,
  };
  await setDoc(doc(db, 'notices', id), newNotice).catch(() => {});
  return newNotice;
}

export async function deleteNotice(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'notices', id)).catch(() => {});
  return { success: true };
}

export async function fetchAttendanceHistory(month: string, staffId?: string): Promise<AttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'attendance'));
    let records = snap.docs.map((d) => d.data() as AttendanceRecord);
    if (month) records = records.filter((r) => r.date.startsWith(month));
    if (staffId) records = records.filter((r) => r.staffId === staffId);
    return records;
  } catch (err) {
    return [];
  }
}

export async function adminUpdateScheduleStatus(
  id: string,
  approvalStatus: '승인완료' | '반려',
  approvedBy?: string,
  rejectedReason?: string
): Promise<{ success: boolean; schedule: ScheduleEvent }> {
  const ref = doc(db, 'schedules', id);
  const snap = await getDoc(ref).catch(() => null);
  if (!snap || !snap.exists()) throw new Error('일정을 찾을 수 없습니다.');
  const schedule = snap.data() as ScheduleEvent;
  schedule.approvalStatus = approvalStatus;
  schedule.approvedBy = approvedBy || '관리자';
  if (rejectedReason) schedule.rejectedReason = rejectedReason;
  await updateDoc(ref, { approvalStatus, approvedBy: schedule.approvedBy, rejectedReason: schedule.rejectedReason }).catch(() => {});
  return { success: true, schedule };
}

export async function adminUpdateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<{ success: boolean; record: AttendanceRecord }> {
  const ref = doc(db, 'attendance', id);
  await updateDoc(ref, updates).catch(() => {});
  const snap = await getDoc(ref).catch(() => null);
  return { success: true, record: snap && snap.exists() ? (snap.data() as AttendanceRecord) : ({ id, ...updates } as AttendanceRecord) };
}

export async function adminCreateManualAttendance(data: any): Promise<{ success: boolean; record: AttendanceRecord }> {
  const id = `att-${data.staffId}-${data.date}`;
  const record: AttendanceRecord = {
    id,
    staffId: data.staffId,
    date: data.date,
    clockInTime: data.clockInTime || '09:00:00',
    clockOutTime: data.clockOutTime || '18:30:00',
    status: data.status || '정상출근',
    note: data.note || '관리자 수기 등록',
    location: '원내',
    correctionStatus: '관리자수기등록',
  };
  await setDoc(doc(db, 'attendance', id), record).catch(() => {});
  return { success: true, record };
}

export async function adminDeleteAttendance(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'attendance', id)).catch(() => {});
  return { success: true };
}

export async function fetchHolidays(year?: string | number, month?: string): Promise<ClinicHoliday[]> {
  try {
    const snap = await getDocs(collection(db, 'holidays'));
    let holidays = snap.docs.map((d) => d.data() as ClinicHoliday);
    if (year) holidays = holidays.filter((h) => h.date.startsWith(String(year)));
    if (month) holidays = holidays.filter((h) => h.date.startsWith(month));
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    return [];
  }
}

export async function createHoliday(data: any): Promise<ClinicHoliday> {
  const id = `hol-${Date.now()}`;
  const holiday: ClinicHoliday = { id, ...data };
  await setDoc(doc(db, 'holidays', id), holiday).catch(() => {});
  return holiday;
}

export async function updateHoliday(id: string, updates: Partial<ClinicHoliday>): Promise<{ success: boolean; holiday: ClinicHoliday }> {
  const ref = doc(db, 'holidays', id);
  await updateDoc(ref, updates).catch(() => {});
  const snap = await getDoc(ref).catch(() => null);
  return { success: true, holiday: snap && snap.exists() ? (snap.data() as ClinicHoliday) : ({ id, ...updates } as ClinicHoliday) };
}

export async function deleteHoliday(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'holidays', id)).catch(() => {});
  return { success: true };
}

export async function resetHolidays(): Promise<{ success: boolean; holidays: ClinicHoliday[] }> {
  const snap = await getDocs(collection(db, 'holidays')).catch(() => null);
  if (snap) {
    for (const d of snap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
  }
  return { success: true, holidays: [] };
}

export async function fetchWifiRouters(): Promise<ClinicWifiRouter[]> {
  try {
    const snap = await getDocs(collection(db, 'wifiRouters'));
    return snap.docs.map((d) => d.data() as ClinicWifiRouter);
  } catch (err) {
    return [];
  }
}

export async function createWifiRouter(data: any): Promise<ClinicWifiRouter> {
  const id = `wifi-${Date.now()}`;
  const router: ClinicWifiRouter = { id, ...data, createdAt: new Date().toISOString() };
  await setDoc(doc(db, 'wifiRouters', id), router).catch(() => {});
  return router;
}

export async function updateWifiRouter(id: string, updates: Partial<ClinicWifiRouter>): Promise<{ success: boolean; router: ClinicWifiRouter }> {
  const ref = doc(db, 'wifiRouters', id);
  await updateDoc(ref, updates).catch(() => {});
  const snap = await getDoc(ref).catch(() => null);
  return { success: true, router: snap && snap.exists() ? (snap.data() as ClinicWifiRouter) : ({ id, ...updates } as ClinicWifiRouter) };
}

export async function deleteWifiRouter(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'wifiRouters', id)).catch(() => {});
  return { success: true };
}

export async function resetWifiRouters(): Promise<{ success: boolean; wifiRouters: ClinicWifiRouter[] }> {
  return { success: true, wifiRouters: await fetchWifiRouters() };
}

export async function fetchManualAttendanceRequests(): Promise<ManualAttendanceRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'manualAttendanceRequests'));
    return snap.docs.map((d) => d.data() as ManualAttendanceRequest);
  } catch (err) {
    return [];
  }
}

export async function submitManualAttendanceRequest(data: any): Promise<{ success: boolean; request: ManualAttendanceRequest }> {
  const id = `man-req-${Date.now()}`;
  const staffList = await fetchStaffList();
  const staff = staffList.find((s) => s.id === data.staffId);
  const newReq: ManualAttendanceRequest = {
    id,
    staffId: data.staffId,
    staffName: staff?.name || '직원',
    staffRole: staff?.role || '치과위생사',
    date: data.date,
    requestType: data.requestType,
    requestedClockIn: data.requestedClockIn,
    requestedClockOut: data.requestedClockOut,
    reason: data.reason,
    details: data.details || '',
    status: '승인대기',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'manualAttendanceRequests', id), newReq).catch(() => {});
  return { success: true, request: newReq };
}

export async function reviewManualAttendanceRequest(
  id: string,
  status: '승인' | '반려',
  reviewedBy?: string,
  rejectReason?: string
): Promise<{ success: boolean; request: ManualAttendanceRequest }> {
  const ref = doc(db, 'manualAttendanceRequests', id);
  const snap = await getDoc(ref).catch(() => null);
  if (!snap || !snap.exists()) throw new Error('수기 신청을 찾을 수 없습니다.');
  const req = snap.data() as ManualAttendanceRequest;
  req.status = status;
  req.reviewedBy = reviewedBy || '관리자';
  req.reviewedAt = new Date().toISOString();
  if (rejectReason) req.rejectReason = rejectReason;
  await updateDoc(ref, { status, reviewedBy: req.reviewedBy, reviewedAt: req.reviewedAt, rejectReason: req.rejectReason }).catch(() => {});
  return { success: true, request: req };
}

export async function deleteManualAttendanceRequest(id: string): Promise<{ success: boolean }> {
  await deleteDoc(doc(db, 'manualAttendanceRequests', id)).catch(() => {});
  return { success: true };
}
