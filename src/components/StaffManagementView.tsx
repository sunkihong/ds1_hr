import React, { useState } from 'react';
import { ClinicSettings, Staff } from '../types';
import { addStaffMember, updateStaffMember, deleteStaffMember, updateClinicSettings } from '../api';
import {
  Users,
  Download,
  Building,
  Calendar,
  Phone,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
} from 'lucide-react';

interface StaffManagementViewProps {
  staffList: Staff[];
  clinicSettings: ClinicSettings;
  currentStaff: Staff | null;
  onRefresh: () => void;
  onSelectStaff: (staff: Staff) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList,
  clinicSettings,
  currentStaff,
  onRefresh,
  onSelectStaff,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));

  // New staff form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<Staff['role']>('치과위생사');
  const [department, setDepartment] = useState<Staff['department']>('치위생팀');
  const [phone, setPhone] = useState('');
  const [totalLeaveDays, setTotalLeaveDays] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clinic settings edit toggle
  const [showSettingsEdit, setShowSettingsEdit] = useState(false);
  const [settingsForm, setSettingsForm] = useState(clinicSettings);

  const handleAddOrEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaffMember(editingStaff.id, {
          name,
          role,
          department,
          phone,
          totalLeaveDays,
        });
      } else {
        await addStaffMember({
          name,
          role,
          department,
          phone,
          totalLeaveDays,
          usedLeaveDays: 0,
        });
      }
      setShowAddModal(false);
      setEditingStaff(null);
      setName('');
      setPhone('');
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '처리에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!confirm(`정말 '${staffName}' 직원을 목록에서 삭제하시겠습니까?`)) return;
    try {
      await deleteStaffMember(id);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '삭제에 실패했습니다.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateClinicSettings(settingsForm);
      setShowSettingsEdit(false);
      onRefresh();
      alert('치과 기본 진료 설정이 저장되었습니다.');
    } catch (err: unknown) {
      alert((err as Error).message || '설정 저장에 실패했습니다.');
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/export/attendance.csv?month=${exportMonth}`;
  };

  return (
    <div className="space-y-4 pb-20 text-xs">
      {/* 1. Monthly Attendance CSV Report Download Card */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold">월별 근태 보고서 엑셀(CSV)</h3>
          </div>
          <span className="text-[11px] text-sky-200">원장실 / 총괄실장용</span>
        </div>
        <p className="text-[11px] text-slate-300 mb-3">
          서버에 동기화된 전 직원의 일자별 출퇴근 시간 및 지각/휴가 내역을 엑셀로 다운로드합니다.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
          <button
            onClick={handleExportCSV}
            className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            다운로드
          </button>
        </div>
      </div>

      {/* 2. Dental Clinic 10 Staff List with Leave Quota */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              치과 근무 직원 명부 & 연차 현황 ({staffList.length}명)
            </h3>
          </div>
          <button
            onClick={() => {
              setEditingStaff(null);
              setName('');
              setPhone('');
              setTotalLeaveDays(15);
              setShowAddModal(true);
            }}
            className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" /> 직원 추가
          </button>
        </div>

        <div className="space-y-2">
          {staffList.map((member) => {
            const remaining = member.totalLeaveDays - member.usedLeaveDays;
            const isMe = currentStaff?.id === member.id;

            return (
              <div
                key={member.id}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                  isMe
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {/* Left profile info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {member.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {member.role}
                      </span>
                      {isMe && (
                        <span className="bg-sky-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                          현재 내 계정
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{member.department}</span>
                      <span>·</span>
                      <span className="font-mono">{member.phone || '연락처 없음'}</span>
                    </div>

                    {/* Leave Bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">
                        연차: 사용 {member.usedLeaveDays}일 / 잔여
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          remaining <= 3 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {remaining}일
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!isMe && (
                    <button
                      onClick={() => onSelectStaff(member)}
                      className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
                    >
                      전환
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingStaff(member);
                      setName(member.name);
                      setRole(member.role);
                      setDepartment(member.department);
                      setPhone(member.phone);
                      setTotalLeaveDays(member.totalLeaveDays);
                      setShowAddModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg"
                    title="정보 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {staffList.length > 1 && (
                    <button
                      onClick={() => handleDeleteStaff(member.id, member.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg"
                      title="직원 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Dental Clinic Hours & Hospital Info Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              치과의원 진료 시간 & 설정
            </h3>
          </div>
          <button
            onClick={() => {
              setSettingsForm(clinicSettings);
              setShowSettingsEdit(!showSettingsEdit);
            }}
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
          >
            {showSettingsEdit ? '취소' : '설정 변경'}
          </button>
        </div>

        {showSettingsEdit ? (
          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">치과 명칭</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">진료 시작 (지각 기준)</label>
                <input
                  type="time"
                  value={settingsForm.openTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, openTime: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">진료 마감</label>
                <input
                  type="time"
                  value={settingsForm.closeTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, closeTime: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">점심시간 시작</label>
                <input
                  type="time"
                  value={settingsForm.lunchStart}
                  onChange={(e) => setSettingsForm({ ...settingsForm, lunchStart: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">점심시간 종료</label>
                <input
                  type="time"
                  value={settingsForm.lunchEnd}
                  onChange={(e) => setSettingsForm({ ...settingsForm, lunchEnd: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">야간진료 마감 시간</label>
              <input
                type="time"
                value={settingsForm.nightClinicCloseTime}
                onChange={(e) => setSettingsForm({ ...settingsForm, nightClinicCloseTime: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-sky-600 text-white font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> 설정 저장
            </button>
          </form>
        ) : (
          <div className="space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">치과명</span>
              <span className="font-bold text-slate-800">{clinicSettings.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">정규 진료 시간</span>
              <span className="font-semibold text-slate-800">
                {clinicSettings.openTime} ~ {clinicSettings.closeTime}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">점심 시간</span>
              <span>{clinicSettings.lunchStart} ~ {clinicSettings.lunchEnd}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">야간진료 요일 및 시간</span>
              <span className="font-semibold text-indigo-700">
                매주 {clinicSettings.nightClinicDays.join(', ')}요일 (~{clinicSettings.nightClinicCloseTime})
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">원내 대표 번호</span>
              <span>{clinicSettings.phone}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Staff Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              {editingStaff ? '직원 정보 수정' : '신규 치과 직원 추가'}
            </h3>
            <form onSubmit={handleAddOrEditStaff} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">직원 이름</label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">직책</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                  >
                    <option value="대표원장">대표원장</option>
                    <option value="원장">원장</option>
                    <option value="총괄실장">총괄실장</option>
                    <option value="데스크주임">데스크주임</option>
                    <option value="치과위생사">치과위생사</option>
                    <option value="치과기공사">치과기공사</option>
                    <option value="진료보조">진료보조</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">부서</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200"
                  >
                    <option value="치위생팀">치위생팀</option>
                    <option value="진료부">진료부</option>
                    <option value="경영지원">경영지원(데스크)</option>
                    <option value="기공실">기공실</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">연락처</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">연간 부여 연차일수</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={totalLeaveDays}
                  onChange={(e) => setTotalLeaveDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl font-semibold text-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700"
                >
                  {editingStaff ? '수정 저장' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
