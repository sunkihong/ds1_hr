import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallBar: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running in standalone PWA app mode, hide prompt
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Top Banner Notice for Installing App */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-3 py-2 text-xs flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <Smartphone className="w-4 h-4 shrink-0 text-sky-200 animate-pulse" />
          <span className="truncate font-medium">
            스마트폰에 앱으로 설치하여 출퇴근·일정을 실시간 확인하세요
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={handleInstallClick}
            className="bg-white text-sky-700 px-2.5 py-1 rounded-md font-semibold hover:bg-sky-50 active:scale-95 transition-all text-xs flex items-center gap-1 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            앱 설치
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="닫기"
            className="p-1 text-sky-100 hover:text-white rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Installation Guide Modal (Especially optimized for iOS & Android) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
                  DW
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    스마트폰 앱 설치 방법
                  </h3>
                  <p className="text-xs text-slate-500">안드로이드 및 아이폰 모두 지원</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3.5 text-xs text-slate-700">
              {isIOS ? (
                // iOS Safari Guide
                <div className="space-y-3 bg-sky-50/70 p-3.5 rounded-xl border border-sky-100">
                  <div className="flex items-center gap-1.5 text-sky-900 font-semibold text-sm">
                    <span className="text-base">🍎</span> 아이폰(iOS Safari) 설치 가이드
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      1
                    </div>
                    <div className="leading-relaxed">
                      Safari 브라우저 하단 툴바의 <strong>공유 버튼</strong>
                      <span className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded bg-white border border-slate-200 text-sky-600 font-mono text-[10px]">
                        <Share2 className="w-3 h-3 inline mr-0.5" /> 공유
                      </span>
                      을 탭합니다.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      2
                    </div>
                    <div className="leading-relaxed">
                      공유 메뉴를 아래로 내려 <strong>'홈 화면에 추가'</strong>
                      <span className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded bg-white border border-slate-200 text-slate-700 text-[10px]">
                        <PlusSquare className="w-3 h-3 inline mr-0.5 text-slate-500" /> 홈 화면에 추가
                      </span>
                      를 누릅니다.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      3
                    </div>
                    <div className="leading-relaxed">
                      우측 상단 <strong>'추가'</strong>를 누르면 바탕화면에 치과 전용 어플 아이콘이 생성됩니다.
                    </div>
                  </div>
                </div>
              ) : (
                // Android Chrome / Standard Guide
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
                    <span className="text-base">🤖</span> 안드로이드(Android Chrome) 설치
                  </div>
                  {isInstallable ? (
                    <button
                      onClick={async () => {
                        await install();
                        setShowGuideModal(false);
                      }}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> 지금 바로 원클릭 앱 설치하기
                    </button>
                  ) : (
                    <div className="space-y-2 text-slate-600">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          Chrome 브라우저 우측 상단 <strong>더보기 메뉴 (⋮)</strong>를 누르세요.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>'앱 설치'</strong> 또는 <strong>'홈 화면에 추가'</strong>를 누르면 설치가 완료됩니다.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-slate-400 text-center pt-1">
                앱으로 설치하면 주소창 없이 네이티브 앱처럼 빠르고 쾌적하게 사용 가능합니다.
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 active:scale-[0.99] transition"
            >
              확인 완료
            </button>
          </div>
        </div>
      )}
    </>
  );
};
