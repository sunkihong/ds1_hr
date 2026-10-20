import {
  ClinicNotice,
  ClinicSettings,
  ScheduleEvent,
  Staff,
  TodayStaffStatus,
  AttendanceRecord,
  ClinicHoliday,
  ClinicWifiRouter,
  ManualAttendanceRequest,
} from './types';

const BASE_URL = '';

export async function fetchClinicSettings(): Promise<{ settings: ClinicSettings; serverTime: string }> {
  const res = await fetch(`${BASE_URL}/api/clinic`);
  if (!res.ok) throw new Error('클리닉 설정을 불러오지 못했습니다.');
  return res.json();
}

export async function updateClinicSettings(settings: Partial<ClinicSettings>): Promise<{ success: boolean; settings: ClinicSettings }> {
  const res = await fetch(`${BASE_URL}/api/clinic/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('클리닉 설정을 수정하지 못했습니다.');
  return res.json();
}

export async function fetchStaffList(): Promise<Staff[]> {
  const res = await fetch(`${BASE_URL}/api/staff`);
  if (!res.ok) throw new Error('직원 목록을 불러오지 못했습니다.');
  return res.json();
}

export async function addStaffMember(data: Partial<Staff>): Promise<Staff> {
  const res = await fetch(`${BASE_URL}/api/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('직원 등록에 실패했습니다.');
  return res.json();
}

export async function updateStaffMember(id: string, data: Partial<Staff>): Promise<Staff> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('직원 정보 수정에 실패했습니다.');
  return res.json();
}

export async function deleteStaffMember(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/staff/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('직원 삭제에 실패했습니다.');
  return res.json();
}

export async function fetchTodayAttendance(dateStr?: string): Promise<{
  date: string;
  records: TodayStaffStatus[];
  serverTime: string;
}> {
  const url = dateStr ? `${BASE_URL}/api/attendance/today?date=${dateStr}` : `${BASE_URL}/api/attendance/today`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('금일 근태 현황을 불러오지 못했습니다.');
  return res.json();
}

export async function clockIn(
  staffId: string,
  note?: string,
  location?: string,
  wifiOptions?: { authMethod?: 'wifi' | 'unverified' | 'manual_approved'; wifiSsid?: string; wifiBssid?: string }
): Promise<{ success: boolean; record: AttendanceRecord; message: string }> {
  const res = await fetch(`${BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staffId,
      note,
      location,
      authMethod: wifiOptions?.authMethod || 'wifi',
      wifiSsid: wifiOptions?.wifiSsid,
      wifiBssid: wifiOptions?.wifiBssid,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || '출근 기록에 실패했습니다.');
  }
  return res.json();
}

export async function clockOut(
  staffId: string,
  note?: string,
  wifiOptions?: { authMethod?: 'wifi' | 'unverified' | 'manual_approved'; wifiSsid?: string; wifiBssid?: string }
): Promise<{ success: boolean; record: AttendanceRecord; message: string }> {
  const res = await fetch(`${BASE_URL}/api/attendance/clock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staffId,
      note,
      authMethod: wifiOptions?.authMethod || 'wifi',
      wifiSsid: wifiOptions?.wifiSsid,
      wifiBssid: wifiOptions?.wifiBssid,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || '퇴근 기록에 실패했습니다.');
  }
  return res.json();
}

export async function fetchSchedules(monthStr?: string): Promise<ScheduleEvent[]> {
  const url = monthStr ? `${BASE_URL}/api/schedules?month=${monthStr}` : `${BASE_URL}/api/schedules`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('일정을 불러오지 못했습니다.');
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '일정 등록에 실패했습니다.');
  }
  return res.json();
}

export async function deleteSchedule(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/schedules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('일정 삭제에 실패했습니다.');
  return res.json();
}

export async function fetchNotices(): Promise<ClinicNotice[]> {
  const res = await fetch(`${BASE_URL}/api/notices`);
  if (!res.ok) throw new Error('공지 및 인수인계를 불러오지 못했습니다.');
  return res.json();
}

export async function createNotice(data: {
  staffId: string;
  content: string;
  type?: '공지사항' | '인수인계' | '특이사항';
  pinned?: boolean;
}): Promise<ClinicNotice> {
  const res = await fetch(`${BASE_URL}/api/notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('공지 등록에 실패했습니다.');
  return res.json();
}

export async function deleteNotice(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/notices/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('삭제에 실패했습니다.');
  return res.json();
}

export async function fetchAttendanceHistory(month: string, staffId?: string): Promise<AttendanceRecord[]> {
  let url = `${BASE_URL}/api/attendance/history?month=${month}`;
  if (staffId) url += `&staffId=${staffId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('근태 이력을 불러오지 못했습니다.');
  return res.json();
}

export async function adminUpdateScheduleStatus(
  id: string,
  approvalStatus: '승인완료' | '반려',
  approvedBy?: string,
  rejectedReason?: string
): Promise<{ success: boolean; schedule: ScheduleEvent }> {
  const res = await fetch(`${BASE_URL}/api/admin/schedules/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvalStatus, approvedBy, rejectedReason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '승인 처리에 실패했습니다.');
  }
  return res.json();
}

export async function adminUpdateAttendance(
  id: string,
  updates: Partial<AttendanceRecord>
): Promise<{ success: boolean; record: AttendanceRecord }> {
  const res = await fetch(`${BASE_URL}/api/admin/attendance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '근태 수정에 실패했습니다.');
  }
  return res.json();
}

export async function adminCreateManualAttendance(data: {
  staffId: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status?: string;
  note?: string;
  correctionReason?: string;
}): Promise<{ success: boolean; record: AttendanceRecord }> {
  const res = await fetch(`${BASE_URL}/api/admin/attendance/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '수기 근태 등록에 실패했습니다.');
  }
  return res.json();
}

export async function adminDeleteAttendance(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/admin/attendance/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('근태 기록 삭제에 실패했습니다.');
  return res.json();
}

// Clinic Holidays & Special Treatment Schedule API
export async function fetchHolidays(year?: string | number, month?: string): Promise<ClinicHoliday[]> {
  let url = `${BASE_URL}/api/holidays`;
  const params: string[] = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('휴무일 및 진료일정을 불러오지 못했습니다.');
  return res.json();
}

export async function createHoliday(data: {
  date: string;
  name: string;
  type: '전체휴진' | '반일진료' | '정상진료' | '단축진료';
  openTime?: string;
  closeTime?: string;
  isPublicHoliday?: boolean;
  memo?: string;
}): Promise<ClinicHoliday> {
  const res = await fetch(`${BASE_URL}/api/holidays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '휴무일 저장에 실패했습니다.');
  }
  return res.json();
}

export async function updateHoliday(
  id: string,
  updates: Partial<ClinicHoliday>
): Promise<{ success: boolean; holiday: ClinicHoliday }> {
  const res = await fetch(`${BASE_URL}/api/holidays/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '휴무일 수정에 실패했습니다.');
  }
  return res.json();
}

export async function deleteHoliday(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/holidays/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('휴무일 삭제에 실패했습니다.');
  return res.json();
}

export async function resetHolidays(): Promise<{ success: boolean; holidays: ClinicHoliday[] }> {
  const res = await fetch(`${BASE_URL}/api/holidays/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('휴무일 초기화에 실패했습니다.');
  return res.json();
}

// ----------------------------------------------------
// Wi-Fi Routers Management API
// ----------------------------------------------------
export async function fetchWifiRouters(): Promise<ClinicWifiRouter[]> {
  const res = await fetch(`${BASE_URL}/api/wifi-routers`);
  if (!res.ok) throw new Error('공유기 목록을 불러오지 못했습니다.');
  return res.json();
}

export async function createWifiRouter(data: {
  ssid: string;
  bssid?: string;
  location: string;
  ipRange?: string;
  isActive?: boolean;
  description?: string;
}): Promise<ClinicWifiRouter> {
  const res = await fetch(`${BASE_URL}/api/wifi-routers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '공유기 등록에 실패했습니다.');
  }
  return res.json();
}

export async function updateWifiRouter(
  id: string,
  updates: Partial<ClinicWifiRouter>
): Promise<{ success: boolean; router: ClinicWifiRouter }> {
  const res = await fetch(`${BASE_URL}/api/wifi-routers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '공유기 수정에 실패했습니다.');
  }
  return res.json();
}

export async function deleteWifiRouter(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/wifi-routers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('공유기 삭제에 실패했습니다.');
  return res.json();
}

export async function resetWifiRouters(): Promise<{ success: boolean; wifiRouters: ClinicWifiRouter[] }> {
  const res = await fetch(`${BASE_URL}/api/wifi-routers/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('공유기 초기화에 실패했습니다.');
  return res.json();
}

// ----------------------------------------------------
// Manual Attendance Request API (핸드폰 미소지 수기 출퇴근 신청 & 관리자 승인)
// ----------------------------------------------------
export async function fetchManualAttendanceRequests(params?: {
  status?: string;
  staffId?: string;
  date?: string;
  month?: string;
}): Promise<ManualAttendanceRequest[]> {
  let url = `${BASE_URL}/api/attendance/manual-requests`;
  if (params) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.staffId) query.set('staffId', params.staffId);
    if (params.date) query.set('date', params.date);
    if (params.month) query.set('month', params.month);
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('수기 출퇴근 신청 목록을 불러오지 못했습니다.');
  return res.json();
}

export async function submitManualAttendanceRequest(data: {
  staffId: string;
  date: string;
  requestType: '출근' | '퇴근' | '출퇴근동시';
  requestedClockIn?: string;
  requestedClockOut?: string;
  reason: string;
  details?: string;
}): Promise<{ success: boolean; request: ManualAttendanceRequest }> {
  const res = await fetch(`${BASE_URL}/api/attendance/manual-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '수기 출퇴근 신청 제출에 실패했습니다.');
  }
  return res.json();
}

export async function reviewManualAttendanceRequest(
  id: string,
  status: '승인' | '반려',
  reviewedBy?: string,
  rejectReason?: string
): Promise<{ success: boolean; request: ManualAttendanceRequest }> {
  const res = await fetch(`${BASE_URL}/api/attendance/manual-requests/${id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewedBy, rejectReason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '수기 출퇴근 승인 처리에 실패했습니다.');
  }
  return res.json();
}

export async function deleteManualAttendanceRequest(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/api/attendance/manual-requests/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('수기 출퇴근 신청 삭제에 실패했습니다.');
  return res.json();
}


