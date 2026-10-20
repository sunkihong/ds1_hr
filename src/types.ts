export interface Staff {
  id: string;
  name: string;
  role: '대표원장' | '원장' | '총괄실장' | '데스크주임' | '치과위생사' | '치과기공사' | '진료보조';
  department: '진료부' | '경영지원' | '치위생팀' | '기공실';
  phone: string;
  color: string;
  totalLeaveDays: number;
  usedLeaveDays: number;
  joinDate: string;
  avatarIcon: string;
  birthDate?: string;
  zodiac?: string;
  motto?: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  clockInTime: string | null; // HH:mm:ss
  clockOutTime: string | null; // HH:mm:ss
  status: '출근전' | '근무중' | '지각' | '정상출근' | '퇴근완료' | '휴가' | '반차';
  note?: string;
  location?: string;
  correctionStatus?: '정상' | '지각소명요청' | '소명승인' | '퇴근누락수정' | '관리자수기등록';
  correctionReason?: string;
}

export interface ScheduleEvent {
  id: string;
  staffId: string;
  title: string;
  type: '연차' | '오전반차' | '오후반차' | '야간진료' | '학회' | '병가' | '당직' | '기타';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
  approvalStatus?: '승인대기' | '승인완료' | '반려';
  approvedBy?: string;
  rejectedReason?: string;
}

export interface ClinicNotice {
  id: string;
  staffId: string;
  staffName: string;
  type: '공지사항' | '인수인계' | '특이사항';
  content: string;
  createdAt: string;
  pinned?: boolean;
}

export interface ClinicHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // e.g. "삼일절 반일진료", "개천절", "치과 개원기념일"
  type: '전체휴진' | '반일진료' | '정상진료' | '단축진료';
  openTime?: string; // "09:30"
  closeTime?: string; // "13:30"
  isPublicHoliday?: boolean;
  memo?: string;
}

export interface ClinicSettings {
  name: string;
  openTime: string;
  closeTime: string;
  lunchStart: string;
  lunchEnd: string;
  nightClinicDays: string[];
  nightClinicCloseTime: string;
  saturdayType?: '반일진료' | '정상진료' | '전체휴진';
  saturdayCloseTime?: string;
  sundayType?: '전체휴진' | '반일진료' | '정상진료';
  address: string;
  phone: string;
  adminPin?: string;
}

export interface TodayStaffStatus {
  staff: Staff;
  record: AttendanceRecord | null;
  todaySchedule: ScheduleEvent | null;
  status: '출근전' | '근무중' | '지각' | '정상출근' | '퇴근완료' | '휴가' | '반차';
}
