import React, { useState, useRef } from 'react';
import { orderApi } from '../api/orderApi';
import { getOrCreateMockActionKey } from '../utils/idempotency';
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import { MOCK_SCENARIOS } from '../utils/mockPayOSScenarios.js';
export { MOCK_SCENARIOS };

/**
 * Component MockPayOSControls
 * CHỈ hiển thị khi simulationControlsAllowed === true và người dùng có vai trò ADMIN
 */
const MockPayOSControls = ({ orderId, onActionApplied }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [loadingScenario, setLoadingScenario] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const inFlightRef = useRef(false);

  const handleTriggerAction = async (scenario) => {
    if (!orderId || inFlightRef.current || loadingScenario) return;

    inFlightRef.current = true;
    setLoadingScenario(scenario);
    setErrorMessage('');
    setLastResult(null);

    try {
      // 1 scenario intent = 1 idempotency key cố định (tái sử dụng nếu retry)
      const idempotencyKey = getOrCreateMockActionKey(orderId, scenario);
      const res = await orderApi.triggerMockAction(orderId, scenario, idempotencyKey);
      const data = res?.data ?? res;

      setLastResult({
        scenario,
        status: data?.action?.status || 'COMPLETED',
        message: data?.action?.status === 'VERIFYING'
          ? 'Kịch bản đang xử lý (VERIFYING). Vui lòng đợi kết quả...'
          : `Đã áp dụng kịch bản ${scenario} thành công!`,
        data,
      });

      if (typeof onActionApplied === 'function') {
        onActionApplied(data);
      }
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.message || resp?.code || err.message || 'Thao tác mô phỏng thất bại.';
      setErrorMessage(msg);
    } finally {
      inFlightRef.current = false;
      setLoadingScenario(null);
    }
  };

  return (
    <div
      data-testid="mock-payos-admin-panel"
      className="w-full max-w-[540px] mt-6 bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-4 sm:p-5 text-slate-800 shadow-sm"
    >
      <div className="flex items-center justify-between pb-3 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                Bảng kiểm thử mô phỏng PayOS
              </span>
              <span className="text-[10px] font-extrabold bg-amber-200 text-amber-800 px-1.5 py-0.2 rounded uppercase">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium">
              Chỉ khả dụng trong môi trường thử nghiệm MOCK. Không tác động đến tiền thật.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Thu gọn bảng kiểm thử mô phỏng PayOS' : 'Mở rộng bảng kiểm thử mô phỏng PayOS'}
          className="text-amber-700 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100 transition"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Thông báo kết quả hoặc lỗi */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-semibold flex items-start gap-2"
            >
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {lastResult && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">{lastResult.message}</p>
                {lastResult.data?.action?.actionId && (
                  <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                    Action ID: {lastResult.data.action.actionId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Các nhóm kịch bản */}
          <div className="space-y-3.5">
            {MOCK_SCENARIOS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800/80 px-1">
                  {group.category}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const isRunning = loadingScenario === item.scenario;
                    let btnColorClass =
                      'bg-white hover:bg-amber-100/50 text-slate-800 border-amber-200';
                    if (item.variant === 'emerald') {
                      btnColorClass =
                        'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200';
                    } else if (item.variant === 'rose') {
                      btnColorClass =
                        'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200';
                    } else if (item.variant === 'amber') {
                      btnColorClass =
                        'bg-amber-100/70 hover:bg-amber-200 text-amber-900 border-amber-300';
                    } else if (item.variant === 'blue') {
                      btnColorClass =
                        'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200';
                    }

                    return (
                      <button
                        key={item.scenario}
                        type="button"
                        data-testid={`mock-action-${item.scenario.toLowerCase()}`}
                        disabled={Boolean(loadingScenario)}
                        onClick={() => handleTriggerAction(item.scenario)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 shadow-xs disabled:opacity-50 ${btnColorClass}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold leading-tight">
                            {item.label}
                          </span>
                          {isRunning && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal leading-snug">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MockPayOSControls;
