import React, { useState, useMemo } from 'react';
import { Staff, ClinicNotice } from '../types';
import {
  Sparkles,
  ArrowRight,
  Pin,
  Calendar,
  Heart,
  Coffee,
  CheckCircle2,
  ChevronRight,
  Smile,
  Megaphone,
} from 'lucide-react';

interface DailyGreetingScreenProps {
  currentStaff: Staff | null;
  notices: ClinicNotice[];
  onSkip: () => void;
}

export const DailyGreetingScreen: React.FC<DailyGreetingScreenProps> = ({
  currentStaff,
  notices,
  onSkip,
}) => {
  const [dontShowToday, setDontShowToday] = useState(false);

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // Deterministic daily fortune algorithm based on staff ID + date
  const fortuneData = useMemo(() => {
    if (!currentStaff) {
      return {
        score: 95,
        rating: '대길(大吉)',
        message: '동료들과 따뜻한 미소를 나누며 즐겁게 진료하는 하루가 될 것입니다!',
        luckyChair: '중앙 진료실',
        luckyColor: '스카이 블루',
        luckyItem: '상쾌한 모닝 커피',
      };
    }

    const daySeed = today.getFullYear() * 1000 + (today.getMonth() + 1) * 35 + today.getDate();
    let charCodeSum = 0;
    for (let i = 0; i < currentStaff.name.length; i++) {
      charCodeSum += currentStaff.name.charCodeAt(i);
    }
    const seed = (daySeed + charCodeSum) % 100;
    const score = 88 + (seed % 12); // 88 ~ 99점

    // Role-tailored fortune messages
    const roleMessages: Record<string, string[]> = {
      치과위생사: [
        '섬세한 손길과 따뜻한 눈맞춤으로 환자분들의 치과 공포를 눈 녹듯 없애주는 날입니다. 원장님과의 어시스트 호흡이 찰떡같이 들어맞을 거예요!',
        '스케일링과 예방 진료에서 환자분께 큰 칭찬과 감사의 인사를 받게 됩니다. 기분 좋은 성취감이 함께하는 날입니다.',
        '체어 사이드 동선이 물 흐르듯 매끄럽고 기구 인계가 완벽합니다. 오늘 당신은 당산원치과의 특급 에이스입니다!',
      ],
      대표원장: [
        '진단과 정밀 치료의 통찰력이 최고조에 달하는 날입니다. 복잡한 임플란트 및 보존 케이스도 순조롭고 안전하게 완성됩니다.',
        '원내 모든 구성원들과의 소통이 원활하고 환자분들의 신뢰도가 200% 상승하는 뜻깊은 진료의 날입니다.',
      ],
      원장: [
        '정밀한 핸드피스 조작과 세심한 진료로 환자분의 만족도가 극대화됩니다. 동료 스태프들과의 팀워크가 빛을 발합니다.',
        '환자의 통증을 경청하고 어루만지는 진심 어린 진료로 큰 신뢰를 쌓는 보람찬 하루가 될 것입니다.',
      ],
      총괄실장: [
        '상담실에서의 한마디 한마디가 환자의 마음에 신뢰의 씨앗을 심습니다. 치료 동의율과 예약 조율이 마법처럼 술술 풀리는 날입니다!',
        '원내 직원들의 사기를 북돋우고 치과 전체의 운영이 가장 매끄럽게 돌아가는 리더십의 날입니다.',
      ],
      데스크주임: [
        '당산원치과의 첫인상인 데스크에서 당신의 밝은 미소가 빛납니다. 수납과 예약 안내가 오차 없이 완벽하게 진행됩니다!',
        '친절하고 정확한 전화 응대로 신환 유입과 기존 환자분들의 안심 지수가 크게 상승하는 날입니다.',
      ],
      치과기공사: [
        '마진 적합도와 교합 정밀도가 0%의 오차에 수렴하는 장인의 날! 제작한 보철물이 환자 구강에 맞춤옷처럼 들어맞습니다.',
        '기공실의 맑은 기운 속에 집중력이 폭발합니다. 자연치아를 능가하는 심미적 완성도가 탄생할 거예요.',
      ],
      진료보조: [
        '체어 멸균 및 기구 세팅이 빈틈없이 이루어져 진료실의 든든한 날개가 되어주는 날입니다. 당신의 헌신에 모두가 감사합니다!',
        '동선 예측과 빠른 서포트로 원내 전원이 쾌적하고 안전하게 진료에 임할 수 있는 특급 지원의 날입니다.',
      ],
    };

    const messages = roleMessages[currentStaff.role] || roleMessages['치과위생사'];
    const message = messages[seed % messages.length];

    const chairs = ['1번 체어', '2번 체어', '3번 체어', '5번 VIP실', '중앙 데스크', '예방치과실'];
    const colors = ['클리어 스카이 블루', '민트 라임', '소프트 라벤더', '에너제틱 피치', '코랄 핑크'];
    const items = ['달콤한 커피 한 잔', '부드러운 미소', '깨끗하게 소독된 미러', '동료와의 하이파이브'];

    return {
      score,
      rating: score >= 95 ? '대길(大吉) 🌟' : '상길(上吉) ✨',
      message,
      luckyChair: chairs[(seed + 1) % chairs.length],
      luckyColor: colors[(seed + 2) % colors.length],
      luckyItem: items[(seed + 3) % items.length],
    };
  }, [currentStaff, today]);

  const handleProceed = () => {
    if (dontShowToday) {
      const todayDateStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('dangsan_greeting_skip_date', todayDateStr);
    }
    onSkip();
  };

  const topNotice = notices.find((n) => n.pinned) || notices[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative overflow-hidden text-slate-900 selection:bg-sky-500 selection:text-white">
      {/* Background soft ambient gradient blobs */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-sky-400/20 via-sky-200/10 to-transparent pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none" />
      <div className="absolute top-48 -left-16 w-44 h-44 rounded-full bg-sky-300/15 blur-2xl pointer-events-none" />

      {/* Top Bar: Brand & Quick Skip */}
      <header className="relative z-10 px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            🦷
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-tight">
              당산원치과
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              모바일 스마트 근태 & 일정
            </p>
          </div>
        </div>

        {/* Prominent Quick Skip Button */}
        <button
          onClick={handleProceed}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-sky-700 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs transition active:scale-95"
        >
          <span>스킵</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Middle Content: Scrollable on compact mobile screens */}
      <div className="relative z-10 flex-1 px-5 py-2 space-y-3.5 overflow-y-auto">
        {/* Date & Friendly Welcome Header */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-sky-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateFormatted} 모닝 브리핑</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
            {currentStaff ? (
              <>
                <span className="text-sky-700">{currentStaff.name}</span>님,
                <br />
                좋은 아침입니다! 오늘도 파이팅 😊
              </>
            ) : (
              '오늘도 활기찬 하루 되세요 😊'
            )}
          </h2>
        </div>

        {/* 1. Personalized Profile & Daily Dental Fortune Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-sky-100/80 relative overflow-hidden">
          {/* Subtle accent ribbon */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-400/10 to-indigo-500/10 rounded-bl-full pointer-events-none" />

          {/* Profile mini header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0"
                style={{ backgroundColor: currentStaff?.color || '#0284c7' }}
              >
                {currentStaff?.name.slice(0, 1) || '치'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">
                    {currentStaff?.name}
                  </span>
                  <span className="text-xs text-sky-700 font-semibold">
                    {currentStaff?.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <span>{currentStaff?.department}</span>
                  {currentStaff?.zodiac && (
                    <>
                      <span>·</span>
                      <span>{currentStaff.zodiac}</span>
                    </>
                  )}
                  {currentStaff?.birthDate && (
                    <>
                      <span>·</span>
                      <span>{currentStaff.birthDate.slice(0, 4)}년생</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Score Pill */}
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">근무 운세 지수</div>
              <div className="text-base font-extrabold text-sky-700 tabular-nums">
                {fortuneData.score}
                <span className="text-xs font-normal text-slate-500">점</span>
              </div>
            </div>
          </div>

          {/* Daily Fortune Content */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
              <Sparkles className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span>오늘의 치과 근무 운세: {fortuneData.rating}</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-sky-50/60 p-3 rounded-2xl border border-sky-100/70">
              {fortuneData.message}
            </p>

            {/* Lucky Tokens */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                <div className="text-[10px] text-slate-400">행운의 체어</div>
                <div className="font-bold text-slate-800 truncate mt-0.5">
                  {fortuneData.luckyChair}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                <div className="text-[10px] text-slate-400">행운의 컬러</div>
                <div className="font-bold text-slate-800 truncate mt-0.5">
                  {fortuneData.luckyColor}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                <div className="text-[10px] text-slate-400">힐링 아이템</div>
                <div className="font-bold text-slate-800 truncate mt-0.5">
                  {fortuneData.luckyItem}
                </div>
              </div>
            </div>

            {/* Staff Motto / Clinical Mindset */}
            {currentStaff?.motto && (
              <div className="text-[11px] text-slate-500 italic text-center pt-1">
                &ldquo;{currentStaff.motto}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* 2. Today's Clinic Notices & Handover Section */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-900">
                당산원치과 주요 공지 & 인수인계
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              최근 {notices.length}건
            </span>
          </div>

          {topNotice ? (
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                  {topNotice.pinned && (
                    <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <Pin className="w-2.5 h-2.5 fill-current" /> 필독
                    </span>
                  )}
                  <span className="text-amber-800">[{topNotice.type}]</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {topNotice.staffName}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {topNotice.content}
                </p>
              </div>

              {notices.length > 1 && (
                <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                  <span>외 {notices.length - 1}개의 인수인계 사항이 있습니다</span>
                  <span className="text-sky-600 font-semibold cursor-pointer" onClick={handleProceed}>
                    메인에서 확인 &gt;
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              오늘 등록된 특이사항 없이 원내 평온하게 진료 준비 중입니다.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Area */}
      <footer className="relative z-10 p-5 pt-2 pb-6 space-y-2.5 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
        {/* Full-width primary CTA */}
        <button
          onClick={handleProceed}
          className="w-full h-13 bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition"
        >
          <span>출퇴근 & 근태 관리 시작하기</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Skip reminder checkbox */}
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
            />
            <span>오늘 하루 이 첫 화면 자동으로 건너뛰기</span>
          </label>
        </div>
      </footer>
    </div>
  );
};
