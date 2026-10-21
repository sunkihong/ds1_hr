import React, { useState } from 'react';
import { Lock, User, ShieldAlert, CheckCircle } from 'lucide-react';

interface AdminLoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onSuccess, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Default admin credentials: admin / 1234
    if (username === 'admin' && password === '1234') {
      sessionStorage.setItem('dangsan_admin_logged_in', 'true');
      onSuccess();
    } else {
      setError('관리자 ID 또는 비밀번호가 올바르지 않습니다. (기본: admin / 1234)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">관리자 전용 로그인</h2>
        <p className="text-xs text-slate-500 mb-5">
          치과 최고관리자(원장·실장) 페이지에 접근하려면 관리자 계정으로 로그인해주세요.
        </p>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">관리자 아이디</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="1234"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            💡 기본 관리자 계정 정보: ID <strong className="text-slate-700">admin</strong> / PW <strong className="text-slate-700">1234</strong>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
