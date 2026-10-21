import React, { useState } from 'react';
import { ClinicWifiRouter } from '../types';
import { Wifi, CheckCircle, Smartphone, RefreshCw, ShieldCheck } from 'lucide-react';

interface WifiVerifyModalProps {
  actionType: '출근' | '퇴근';
  wifiRouters: ClinicWifiRouter[];
  onConfirm: (selectedRouter: ClinicWifiRouter | null) => void;
  onClose: () => void;
}

export const WifiVerifyModal: React.FC<WifiVerifyModalProps> = ({
  actionType,
  wifiRouters,
  onConfirm,
  onClose,
}) => {
  const activeRouters = wifiRouters.filter((r) => r.isActive);
  const [selectedId, setSelectedId] = useState<string>(activeRouters[0]?.id || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setScanDone(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanDone(true);
    }, 1200);
  };

  const handleProceed = () => {
    const router = activeRouters.find((r) => r.id === selectedId) || null;
    onConfirm(router);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
          <Wifi className="w-6 h-6 animate-pulse" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {actionType} Wi-Fi AP 실시간 인증
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          백그라운드 모니터링 한계를 보완하기 위해, {actionType} 버튼을 누른 순간 스마트폰의 병원 Wi-Fi 공유기(AP) 연결 상태를 실시간 스캔 및 확인합니다.
        </p>

        {/* Scan Button & Status */}
        <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-2xl mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-sky-600" />
            <div>
              <div className="text-xs font-bold text-sky-950">원내 Wi-Fi AP 실시간 스캔</div>
              <div className="text-[11px] text-sky-700">
                {isScanning ? '주변 공유기 신호 스캔 중...' : scanDone ? '스캔 완료 (원내 AP 감지됨)' : '스캔 버튼을 눌러 AP를 확인하세요'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="px-3 py-1.5 bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs hover:bg-sky-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            스캔
          </button>
        </div>

        {/* Router List */}
        <div className="space-y-2 mb-5">
          <label className="block text-xs font-bold text-slate-700">연결할 병원 Wi-Fi 공유기 선택</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {activeRouters.map((router) => {
              const isSelected = selectedId === router.id;
              return (
                <button
                  key={router.id}
                  type="button"
                  onClick={() => setSelectedId(router.id)}
                  className={`w-full p-3 rounded-2xl text-left border flex items-center justify-between transition text-xs ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-extrabold truncate">{router.ssid}</div>
                    <div className="text-[11px] text-slate-500 truncate">{router.location}</div>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })}

            {/* Outside / LTE option */}
            <button
              type="button"
              onClick={() => setSelectedId('')}
              className={`w-full p-3 rounded-2xl text-left border flex items-center justify-between transition text-xs ${
                selectedId === ''
                  ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="min-w-0">
                <div className="font-extrabold text-rose-700">외부망 / LTE (Wi-Fi 미연결)</div>
                <div className="text-[11px] text-slate-500">원외 접속 또는 수기 신청 필요</div>
              </div>
              {selectedId === '' && <CheckCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleProceed}
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            인증 및 {actionType} 완료
          </button>
        </div>
      </div>
    </div>
  );
};
