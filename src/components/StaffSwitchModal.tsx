import React from 'react';
import { Staff } from '../types';
import { X, Check, User } from 'lucide-react';

interface StaffSwitchModalProps {
  staffList: Staff[];
  currentStaff: Staff | null;
  onSelectStaff: (staff: Staff) => void;
  onClose: () => void;
}

export const StaffSwitchModal: React.FC<StaffSwitchModalProps> = ({
  staffList,
  currentStaff,
  onSelectStaff,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">내 프로필 선택</h3>
            <p className="text-xs text-slate-500">
              현재 이 기기(스마트폰)에서 사용할 직원을 선택하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Staff List */}
        <div className="overflow-y-auto py-3 space-y-2 divide-y divide-slate-50 flex-1">
          {staffList.map((member) => {
            const isSelected = currentStaff?.id === member.id;
            return (
              <button
                key={member.id}
                onClick={() => {
                  onSelectStaff(member);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left ${
                  isSelected
                    ? 'bg-sky-50 border border-sky-200 text-sky-950 font-semibold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{member.name}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>{member.department}</span>
                      <span>·</span>
                      <span>연차 잔여 {member.totalLeaveDays - member.usedLeaveDays}일</span>
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <User className="w-4 h-4 text-slate-300" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center shrink-0">
          선택한 정보는 이 휴대폰에 자동 저장되어 다음 접속 시 유지됩니다.
        </div>
      </div>
    </div>
  );
};
