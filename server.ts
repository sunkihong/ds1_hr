import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Persistent database storage path
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'clinic-database.json');

// Types
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
  createdAt: string; // ISO string
  pinned?: boolean;
}

export interface ClinicSettings {
  name: string;
  openTime: string; // "09:30"
  closeTime: string; // "18:30"
  lunchStart: string; // "13:00"
  lunchEnd: string; // "14:00"
  nightClinicDays: string[]; // e.g. ["화", "목"]
  nightClinicCloseTime: string; // "20:30"
  address: string;
  phone: string;
  adminPin?: string;
}

export interface DatabaseSchema {
  settings: ClinicSettings;
  staff: Staff[];
  attendance: AttendanceRecord[];
  schedules: ScheduleEvent[];
  notices: ClinicNotice[];
}

// 10 Dental clinic staff initial preset
const initialStaff: Staff[] = [
  {
    id: 'staff-01',
    name: '박진우',
    role: '대표원장',
    department: '진료부',
    phone: '010-3841-1001',
    color: '#0284c7', // Sky Blue
    totalLeaveDays: 15,
    usedLeaveDays: 2,
    joinDate: '2020-03-01',
    avatarIcon: 'tooth',
  },
  {
    id: 'staff-02',
    name: '이서진',
    role: '원장',
    department: '진료부',
    phone: '010-4921-2002',
    color: '#0369a1', // Deep Blue
    totalLeaveDays: 15,
    usedLeaveDays: 3,
    joinDate: '2022-01-10',
    avatarIcon: 'stethoscope',
  },
  {
    id: 'staff-03',
    name: '정미래',
    role: '총괄실장',
    department: '경영지원',
    phone: '010-5219-3003',
    color: '#7c3aed', // Purple
    totalLeaveDays: 15,
    usedLeaveDays: 4,
    joinDate: '2021-05-15',
    avatarIcon: 'briefcase',
  },
  {
    id: 'staff-04',
    name: '한소희',
    role: '데스크주임',
    department: '경영지원',
    phone: '010-6712-4004',
    color: '#db2777', // Pink
    totalLeaveDays: 15,
    usedLeaveDays: 1.5,
    joinDate: '2023-04-01',
    avatarIcon: 'user-check',
  },
  {
    id: 'staff-05',
    name: '강다은',
    role: '치과위생사',
    department: '치위생팀',
    phone: '010-7819-5005',
    color: '#059669', // Emerald (팀장)
    totalLeaveDays: 15,
    usedLeaveDays: 5,
    joinDate: '2021-09-01',
    avatarIcon: 'shield-check',
  },
  {
    id: 'staff-06',
    name: '윤지민',
    role: '치과위생사',
    department: '치위생팀',
    phone: '010-8910-6006',
    color: '#10b981', // Green
    totalLeaveDays: 15,
    usedLeaveDays: 3,
    joinDate: '2022-06-15',
    avatarIcon: 'heart-pulse',
  },
  {
    id: 'staff-07',
    name: '최유나',
    role: '치과위생사',
    department: '치위생팀',
    phone: '010-9011-7007',
    color: '#14b8a6', // Teal
    totalLeaveDays: 15,
    usedLeaveDays: 2.5,
    joinDate: '2023-02-20',
    avatarIcon: 'smile',
  },
  {
    id: 'staff-08',
    name: '오승현',
    role: '치과위생사',
    department: '치위생팀',
    phone: '010-2134-8008',
    color: '#06b6d4', // Cyan
    totalLeaveDays: 15,
    usedLeaveDays: 1,
    joinDate: '2024-01-08',
    avatarIcon: 'activity',
  },
  {
    id: 'staff-09',
    name: '백현우',
    role: '치과기공사',
    department: '기공실',
    phone: '010-4321-9009',
    color: '#ea580c', // Orange
    totalLeaveDays: 15,
    usedLeaveDays: 4,
    joinDate: '2021-11-10',
    avatarIcon: 'tool',
  },
  {
    id: 'staff-10',
    name: '김태린',
    role: '진료보조',
    department: '치위생팀',
    phone: '010-5432-0010',
    color: '#64748b', // Slate
    totalLeaveDays: 15,
    usedLeaveDays: 2,
    joinDate: '2024-03-02',
    avatarIcon: 'users',
  },
];

const initialSettings: ClinicSettings = {
  name: '당산원치과',
  openTime: '09:30',
  closeTime: '18:30',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  nightClinicDays: ['화', '목'],
  nightClinicCloseTime: '20:30',
  address: '서울특별시 영등포구 당산로 123 메디컬타워 4층',
  phone: '02-2633-2875',
};

// Initial database seed
function getInitialData(): DatabaseSchema {
  const today = new Date().toISOString().split('T')[0];

  // Seed sample schedules for this week/month
  const sampleSchedules: ScheduleEvent[] = [
    {
      id: 'sch-01',
      staffId: 'staff-06', // 윤지민
      title: '연차 휴가 (가족 행사)',
      type: '연차',
      startDate: today,
      endDate: today,
      description: '사전 승인 완료, 대체근무 최유나 위생사',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sch-02',
      staffId: 'staff-05', // 강다은
      title: '화요일 야간진료 당직',
      type: '야간진료',
      startDate: today,
      endDate: today,
      description: '20:30까지 야간진료 어시스트',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sch-03',
      staffId: 'staff-01', // 박진우 원장
      title: '야간진료 (화)',
      type: '야간진료',
      startDate: today,
      endDate: today,
      description: '임플란트 및 일반 야간진료',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sch-04',
      staffId: 'staff-07', // 최유나
      title: '오후 반차 (병원 검진)',
      type: '오후반차',
      startDate: today,
      endDate: today,
      description: '14:00 이후 퇴근 예정',
      createdAt: new Date().toISOString(),
    },
  ];

  // Sample attendance for today
  const sampleAttendance: AttendanceRecord[] = [
    {
      id: `att-staff-01-${today}`,
      staffId: 'staff-01',
      date: today,
      clockInTime: '09:12:30',
      clockOutTime: null,
      status: '근무중',
      note: '원내 WiFi 연결 확인',
      location: '진료실 1',
    },
    {
      id: `att-staff-03-${today}`,
      staffId: 'staff-03',
      date: today,
      clockInTime: '09:05:15',
      clockOutTime: null,
      status: '근무중',
      note: '데스크 정상 오픈',
      location: '데스크/상담실',
    },
    {
      id: `att-staff-04-${today}`,
      staffId: 'staff-04',
      date: today,
      clockInTime: '09:18:40',
      clockOutTime: null,
      status: '근무중',
      note: '접수대 오픈 완료',
      location: '데스크',
    },
    {
      id: `att-staff-05-${today}`,
      staffId: 'staff-05',
      date: today,
      clockInTime: '09:10:02',
      clockOutTime: null,
      status: '근무중',
      note: '체어 1~5번 소독 점검',
      location: '중앙진료실',
    },
    {
      id: `att-staff-06-${today}`,
      staffId: 'staff-06',
      date: today,
      clockInTime: null,
      clockOutTime: null,
      status: '휴가',
      note: '연차 휴가',
    },
    {
      id: `att-staff-09-${today}`,
      staffId: 'staff-09',
      date: today,
      clockInTime: '08:58:10',
      clockOutTime: null,
      status: '근무중',
      note: '보철물 마운팅 작업 중',
      location: '기공실',
    },
  ];

  const sampleNotices: ClinicNotice[] = [
    {
      id: 'not-01',
      staffId: 'staff-03',
      staffName: '정미래 실장',
      type: '공지사항',
      content: '📌 [알림] 이번 주 목요일 오후 1시 30분 월간 감염관리 소독 교육이 회의실에서 진행됩니다.',
      createdAt: new Date().toISOString(),
      pinned: true,
    },
    {
      id: 'not-02',
      staffId: 'staff-05',
      staffName: '강다은 팀장',
      type: '인수인계',
      content: '오후 4시 30분 3번 체어 김*식 환자분 임플란트 2차 수술 시 특수 어버트먼트 준비 부탁드립니다.',
      createdAt: new Date().toISOString(),
      pinned: false,
    },
  ];

  return {
    settings: initialSettings,
    staff: initialStaff,
    attendance: sampleAttendance,
    schedules: sampleSchedules,
    notices: sampleNotices,
  };
}

// Database helper functions with safe JSON persistence
function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initData = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initData, null, 2), 'utf-8');
      return initData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database, reverting to initial:', err);
    return getInitialData();
  }
}

function writeDB(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Clinic Settings & Info
app.get('/api/clinic', (_req: Request, res: Response) => {
  const db = readDB();
  res.json({
    settings: db.settings,
    serverTime: new Date().toISOString(),
  });
});

app.put('/api/clinic/settings', (req: Request, res: Response) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// 2. Staff Management
app.get('/api/staff', (_req: Request, res: Response) => {
  const db = readDB();
  res.json(db.staff);
});

app.post('/api/staff', (req: Request, res: Response) => {
  const db = readDB();
  const newStaff: Staff = {
    id: `staff-${Date.now()}`,
    name: req.body.name,
    role: req.body.role || '치과위생사',
    department: req.body.department || '치위생팀',
    phone: req.body.phone || '',
    color: req.body.color || '#0284c7',
    totalLeaveDays: Number(req.body.totalLeaveDays) || 15,
    usedLeaveDays: Number(req.body.usedLeaveDays) || 0,
    joinDate: req.body.joinDate || new Date().toISOString().split('T')[0],
    avatarIcon: req.body.avatarIcon || 'smile',
  };
  db.staff.push(newStaff);
  writeDB(db);
  res.status(201).json(newStaff);
});

app.put('/api/staff/:id', (req: Request, res: Response) => {
  const db = readDB();
  const index = db.staff.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
  }
  db.staff[index] = { ...db.staff[index], ...req.body };
  writeDB(db);
  res.json(db.staff[index]);
});

app.delete('/api/staff/:id', (req: Request, res: Response) => {
  const db = readDB();
  db.staff = db.staff.filter((s) => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// 3. Attendance Management
app.get('/api/attendance/today', (req: Request, res: Response) => {
  const db = readDB();
  const today = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const records = db.attendance.filter((a) => a.date === today);

  // Combine with staff list to give full view of all 10 employees today
  const fullStatus = db.staff.map((staff) => {
    const record = records.find((r) => r.staffId === staff.id);
    const schedule = db.schedules.find(
      (s) => s.staffId === staff.id && s.startDate <= today && s.endDate >= today
    );

    return {
      staff,
      record: record || null,
      todaySchedule: schedule || null,
      status: record?.status || (schedule ? (schedule.type.includes('반차') ? '반차' : '휴가') : '출근전'),
    };
  });

  res.json({
    date: today,
    records: fullStatus,
    serverTime: new Date().toISOString(),
  });
});

app.get('/api/attendance/history', (req: Request, res: Response) => {
  const db = readDB();
  const { staffId, month } = req.query; // month in format 'YYYY-MM'
  let records = db.attendance;

  if (month && typeof month === 'string') {
    records = records.filter((r) => r.date.startsWith(month));
  }
  if (staffId && typeof staffId === 'string') {
    records = records.filter((r) => r.staffId === staffId);
  }

  res.json(records);
});

// Clock-in endpoint
app.post('/api/attendance/clock-in', (req: Request, res: Response) => {
  const { staffId, note, location } = req.body;
  if (!staffId) {
    return res.status(400).json({ error: '직원 ID가 필요합니다.' });
  }

  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0]; // "HH:mm:ss"

  let record = db.attendance.find((a) => a.staffId === staffId && a.date === today);

  // Check if late based on clinic open time (e.g. 09:30)
  const [openH, openM] = db.settings.openTime.split(':').map(Number);
  const isLate = now.getHours() > openH || (now.getHours() === openH && now.getMinutes() > openM);
  const status = isLate ? '지각' : '정상출근';

  if (record) {
    record.clockInTime = currentTime;
    record.status = status;
    if (note) record.note = note;
    if (location) record.location = location;
  } else {
    record = {
      id: `att-${staffId}-${today}`,
      staffId,
      date: today,
      clockInTime: currentTime,
      clockOutTime: null,
      status,
      note: note || '',
      location: location || '치과의원 원내',
    };
    db.attendance.push(record);
  }

  writeDB(db);
  res.json({ success: true, record, message: `${currentTime} 출근이 정상 기록되었습니다.` });
});

// Clock-out endpoint
app.post('/api/attendance/clock-out', (req: Request, res: Response) => {
  const { staffId, note } = req.body;
  if (!staffId) {
    return res.status(400).json({ error: '직원 ID가 필요합니다.' });
  }

  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0];

  let record = db.attendance.find((a) => a.staffId === staffId && a.date === today);

  if (!record) {
    // If not clocked in yet, create record with clockOut
    record = {
      id: `att-${staffId}-${today}`,
      staffId,
      date: today,
      clockInTime: null,
      clockOutTime: currentTime,
      status: '퇴근완료',
      note: note || '퇴근 처리',
    };
    db.attendance.push(record);
  } else {
    record.clockOutTime = currentTime;
    record.status = '퇴근완료';
    if (note) {
      record.note = record.note ? `${record.note} | ${note}` : note;
    }
  }

  writeDB(db);
  res.json({ success: true, record, message: `${currentTime} 퇴근이 정상 기록되었습니다.` });
});

// 4. Schedules & Leave Management
app.get('/api/schedules', (req: Request, res: Response) => {
  const db = readDB();
  const { month } = req.query; // YYYY-MM
  let schedules = db.schedules;

  if (month && typeof month === 'string') {
    schedules = schedules.filter(
      (s) => s.startDate.startsWith(month) || s.endDate.startsWith(month)
    );
  }

  res.json(schedules);
});

app.post('/api/schedules', (req: Request, res: Response) => {
  const { staffId, title, type, startDate, endDate, description } = req.body;
  if (!staffId || !type || !startDate) {
    return res.status(400).json({ error: '필수 입력 항목이 누락되었습니다.' });
  }

  const db = readDB();
  const staff = db.staff.find((s) => s.id === staffId);
  const isHighAdmin = staff?.role === '대표원장' || staff?.role === '총괄실장';
  const approvalStatus = req.body.approvalStatus || (isHighAdmin ? '승인완료' : '승인대기');

  const newSchedule: ScheduleEvent = {
    id: `sch-${Date.now()}`,
    staffId,
    title: title || `${type} 신청`,
    type,
    startDate,
    endDate: endDate || startDate,
    description: description || '',
    createdAt: new Date().toISOString(),
    approvalStatus,
    approvedBy: isHighAdmin ? `${staff?.name} ${staff?.role}` : undefined,
  };

  db.schedules.push(newSchedule);

  // If approved already, update staff's usedLeaveDays
  if (approvalStatus === '승인완료' && staff) {
    if (type === '연차') {
      staff.usedLeaveDays += 1;
    } else if (type === '오전반차' || type === '오후반차') {
      staff.usedLeaveDays += 0.5;
    }
  }

  writeDB(db);
  res.status(201).json(newSchedule);
});

app.delete('/api/schedules/:id', (req: Request, res: Response) => {
  const db = readDB();
  const schedule = db.schedules.find((s) => s.id === req.params.id);
  if (schedule) {
    // If it was leave and was approved, revert used days
    const staff = db.staff.find((s) => s.id === schedule.staffId);
    if (staff && schedule.approvalStatus !== '반려') {
      if (schedule.type === '연차') {
        staff.usedLeaveDays = Math.max(0, staff.usedLeaveDays - 1);
      } else if (schedule.type === '오전반차' || schedule.type === '오후반차') {
        staff.usedLeaveDays = Math.max(0, staff.usedLeaveDays - 0.5);
      }
    }
    db.schedules = db.schedules.filter((s) => s.id !== req.params.id);
    writeDB(db);
  }
  res.json({ success: true });
});

// Admin Route 1: Approve or Reject Vacation/Schedule
app.put('/api/admin/schedules/:id/status', (req: Request, res: Response) => {
  const { approvalStatus, approvedBy, rejectedReason } = req.body;
  const db = readDB();
  const schedule = db.schedules.find((s) => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
  }

  const prevStatus = schedule.approvalStatus || '승인대기';
  schedule.approvalStatus = approvalStatus;
  schedule.approvedBy = approvedBy || '최상위 관리자';
  if (rejectedReason) schedule.rejectedReason = rejectedReason;

  const staff = db.staff.find((s) => s.id === schedule.staffId);
  if (staff) {
    if (approvalStatus === '승인완료' && prevStatus !== '승인완료') {
      if (schedule.type === '연차') staff.usedLeaveDays += 1;
      else if (schedule.type === '오전반차' || schedule.type === '오후반차') staff.usedLeaveDays += 0.5;
    } else if (approvalStatus === '반려' && prevStatus === '승인완료') {
      if (schedule.type === '연차') staff.usedLeaveDays = Math.max(0, staff.usedLeaveDays - 1);
      else if (schedule.type === '오전반차' || schedule.type === '오후반차') staff.usedLeaveDays = Math.max(0, staff.usedLeaveDays - 0.5);
    }
  }

  writeDB(db);
  res.json({ success: true, schedule });
});

// Admin Route 2: Correct Abnormal Attendance (e.g. approve late excuse, set missing clockout)
app.put('/api/admin/attendance/:id', (req: Request, res: Response) => {
  const { clockInTime, clockOutTime, status, note, correctionStatus, correctionReason } = req.body;
  const db = readDB();
  const index = db.attendance.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '근태 기록을 찾을 수 없습니다.' });
  }

  const record = db.attendance[index];
  if (clockInTime !== undefined) record.clockInTime = clockInTime;
  if (clockOutTime !== undefined) record.clockOutTime = clockOutTime;
  if (status !== undefined) record.status = status;
  if (note !== undefined) record.note = note;
  if (correctionStatus !== undefined) record.correctionStatus = correctionStatus;
  if (correctionReason !== undefined) record.correctionReason = correctionReason;

  writeDB(db);
  res.json({ success: true, record });
});

// Admin Route 3: Manually Create/Register Attendance
app.post('/api/admin/attendance/manual', (req: Request, res: Response) => {
  const { staffId, date, clockInTime, clockOutTime, status, note, correctionReason } = req.body;
  if (!staffId || !date) {
    return res.status(400).json({ error: '직원과 날짜는 필수 항목입니다.' });
  }

  const db = readDB();
  let record = db.attendance.find((a) => a.staffId === staffId && a.date === date);

  if (record) {
    if (clockInTime) record.clockInTime = clockInTime;
    if (clockOutTime) record.clockOutTime = clockOutTime;
    if (status) record.status = status;
    if (note) record.note = note;
    record.correctionStatus = '관리자수기등록';
    record.correctionReason = correctionReason || '관리자 수기 보정';
  } else {
    record = {
      id: `att-${staffId}-${date}`,
      staffId,
      date,
      clockInTime: clockInTime || '09:15:00',
      clockOutTime: clockOutTime || '18:30:00',
      status: status || '정상출근',
      note: note || '관리자 수기 등록',
      location: '당산원치과 원내',
      correctionStatus: '관리자수기등록',
      correctionReason: correctionReason || '관리자 수기 등록',
    };
    db.attendance.push(record);
  }

  writeDB(db);
  res.status(201).json({ success: true, record });
});

// Admin Route 4: Delete Attendance Record
app.delete('/api/admin/attendance/:id', (req: Request, res: Response) => {
  const db = readDB();
  db.attendance = db.attendance.filter((a) => a.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// 5. Notices and Dental Handover notes
app.get('/api/notices', (_req: Request, res: Response) => {
  const db = readDB();
  // Sort pinned first, then newest
  const sorted = [...db.notices].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  res.json(sorted);
});

app.post('/api/notices', (req: Request, res: Response) => {
  const { staffId, content, type, pinned } = req.body;
  if (!content) {
    return res.status(400).json({ error: '내용을 입력하세요.' });
  }

  const db = readDB();
  const staff = db.staff.find((s) => s.id === staffId);
  const newNotice: ClinicNotice = {
    id: `not-${Date.now()}`,
    staffId: staffId || 'staff-01',
    staffName: staff ? `${staff.name} ${staff.role}` : '치과의원',
    type: type || '인수인계',
    content,
    createdAt: new Date().toISOString(),
    pinned: !!pinned,
  };

  db.notices.push(newNotice);
  writeDB(db);
  res.status(201).json(newNotice);
});

app.delete('/api/notices/:id', (req: Request, res: Response) => {
  const db = readDB();
  db.notices = db.notices.filter((n) => n.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// 6. CSV Export of Monthly Attendance
app.get('/api/export/attendance.csv', (req: Request, res: Response) => {
  const db = readDB();
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  const monthlyRecords = db.attendance.filter((a) => a.date.startsWith(month));

  let csv = '\uFEFF날짜,직원명,직책,부서,출근시간,퇴근시간,상태,비고\n';
  monthlyRecords.forEach((rec) => {
    const staff = db.staff.find((s) => s.id === rec.staffId);
    const staffName = staff ? staff.name : rec.staffId;
    const role = staff ? staff.role : '';
    const dept = staff ? staff.department : '';
    csv += `"${rec.date}","${staffName}","${role}","${dept}","${rec.clockInTime || '-'}","${rec.clockOutTime || '-'}","${rec.status}","${rec.note || ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.csv"`);
  res.send(csv);
});

// Vite Middleware mounting for Development, or Static Serving for Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DentalWork Server] Running on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
