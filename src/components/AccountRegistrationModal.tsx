import React, { useState } from 'react';
import { Staff } from '../types';
import { Smartphone, CheckCircle, ShieldCheck, User, Phone, Lock } from 'lucide-react';

interface AccountRegistrationModalProps {
  staffList: Staff[];
  onRegister: (staff: Staff) => void;
  onAdminLogin: () => void;
}

export const AccountRegistrationModal: React.FC<AccountRegistrationModalProps> = ({
  staffList,
  onRegister,
  onAdminLogin,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      setErrorMsg('이름과 휴대폰 번호를 모두 입력해주세요.');
      return;
    }

    // Match against staff list created by admin
    const matched = staffList.find(
      (s) => s.name === trimmedName && (s.phone === trimmedPhone || s.phone.replace(/-/g, '') === trimmedPhone.replace(/-/g, ''))
    );

    if (!matched) {
      setErrorMsg('관리자에 의해 등록된 직원 정보와 일치하지 않습니다. 이름과 번호를 확인하거나 관리자에게 문의하세요.');
      return;
    }

    onRegister(matched);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onAdminLogin}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-indigo-200 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            관리자 로그인
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">모바일 개인계정 본인확인</h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          치과 관리자가 등록한 직원 명단과 대조하여 본인 계정을 연결합니다. 이름과 연락처를 정확히 입력해주세요.
        </p>

        {errorMsg && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
            <span className="font-bold">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              직원 성명
            </label>
            <input
              type="text"
              placeholder="예: 강다은"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              휴대폰 번호
            </label>
            <input
              type="text"
              placeholder="예: 010-7819-5005"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-98 mt-2"
          >
            <CheckCircle className="w-4 h-4" />
            계정 확인 및 접속하기
          </button>
        </form>
      </div>
    </div>
  );
};
