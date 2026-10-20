import React, { useState } from 'react';
import { ClinicNotice, Staff } from '../types';
import { createNotice, deleteNotice } from '../api';
import {
  MessageSquare,
  Pin,
  Send,
  Trash2,
  AlertTriangle,
  Megaphone,
  CheckCircle,
} from 'lucide-react';

interface ClinicNoticesViewProps {
  notices: ClinicNotice[];
  currentStaff: Staff | null;
  onRefresh: () => void;
}

export const ClinicNoticesView: React.FC<ClinicNoticesViewProps> = ({
  notices,
  currentStaff,
  onRefresh,
}) => {
  const [content, setContent] = useState('');
  const [noticeType, setNoticeType] = useState<'인수인계' | '공지사항' | '특이사항'>('인수인계');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createNotice({
        staffId: currentStaff?.id || 'staff-01',
        content: content.trim(),
        type: noticeType,
        pinned: isPinned,
      });
      setContent('');
      setIsPinned(false);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('해당 메모를 삭제하시겠습니까?')) return;
    try {
      await deleteNotice(id);
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. New Handover / Notice Input Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              인수인계 & 치과 공지 작성
            </h2>
            <p className="text-[11px] text-slate-500">
              작성 즉시 모든 직원의 스마트폰 앱에 공유됩니다
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Segmented type control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['인수인계', '공지사항', '특이사항'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNoticeType(t)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  noticeType === t
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              rows={3}
              placeholder="환자 특이사항, 진료실 기구 소독 상태, 재료 발주 등 전할 내용을 입력하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <span className="flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                상단 고정 공지로 등록
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? '저장 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Notice List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>인수인계 및 공유 사항</span>
          <span className="text-xs text-slate-400 font-normal">
            총 {notices.length}개
          </span>
        </h3>

        {notices.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            등록된 인수인계 내용이 없습니다. 새로운 내용을 공유해보세요!
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => {
              const dateStr = new Date(n.createdAt).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    n.pinned
                      ? 'bg-amber-50/70 border-amber-200/80'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {n.pinned && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5 fill-current" /> 중요
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          n.type === '공지사항'
                            ? 'bg-sky-100 text-sky-800'
                            : n.type === '특이사항'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {n.type}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {n.staffName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dateStr}
                      </span>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-md"
                        title="메모 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-1">
                    {n.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
