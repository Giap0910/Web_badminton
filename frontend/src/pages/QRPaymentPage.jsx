import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { formatPrice, formatTimer, isOrderPaid } from '../utils/formatters';
import { getOrCreatePaymentLinkKey } from '../utils/idempotency';
import {
  QrCode,
  Copy,
  Check,
  Clock,
  ArrowLeft,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  CheckCircle2,
  Download,
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import MockPayOSControls from '../components/MockPayOSControls';

export function saveRenderedQr(svg, orderId) {
  if (!svg) throw new Error('Chưa có mã QR để tải.');
  const content = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([content], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const link = document.createElement('a');
    link.href = url; link.download = `thanh-toan-HG-${orderId}.svg`;
    link.click();
  } finally { URL.revokeObjectURL(url); }
}

const QRPaymentPage = ({ isQREnabled: propQREnabled } = {}) => {
  const qrContainerRef = useRef(null);
  const isQRSuspended = propQREnabled === false;

  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const returnParams = new URLSearchParams(location.search);
  const isProviderCancelReturn = returnParams.get('cancelled') === '1' || returnParams.get('cancel') === 'true';

  // Validate initial location.state strictly matches current route orderId
  const initialOrder =
    location.state?.order && String(location.state.order.id) === String(orderId)
      ? location.state.order
      : null;
  const initialPayment =
    location.state?.payment &&
    initialOrder &&
    (!location.state.payment.orderId || String(location.state.payment.orderId) === String(orderId))
      ? location.state.payment
      : null;

  const [order, setOrder] = useState(initialOrder);
  const [payment, setPayment] = useState(initialPayment);
  const [loading, setLoading] = useState(!initialOrder && !initialPayment);
  const [error, setError] = useState(location.state?.paymentError || '');
  const [copiedField, setCopiedField] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentEnv, setPaymentEnv] = useState(null);
  const [envStatus, setEnvStatus] = useState('LOADING'); // 'LOADING' | 'VERIFIED' | 'ERROR'
  const [envError, setEnvError] = useState('');
  const [isRetryingEnv, setIsRetryingEnv] = useState(false);
  const isEnvCheckingRef = useRef(false);
  const envGenerationRef = useRef(0);
  const orderFetchGenerationRef = useRef(0);

  // Synchronous route change guard (React pattern: adjust state during render)
  // Ensures no stale order/payment data from previous route can ever render on the new route
  const [activeOrderId, setActiveOrderId] = useState(orderId);
  if (activeOrderId !== orderId) {
    setActiveOrderId(orderId);
    setOrder(null);
    setPayment(null);
    setError('');
    setLoading(true);
  }

  // Request & loop guards
  const isCheckingRef = useRef(false);
  const hasInitialRecoveredRef = useRef(false);
  const currentOrderIdRef = useRef(orderId);
  currentOrderIdRef.current = orderId;
  const isMountedRef = useRef(true);
  const pollGenerationRef = useRef(0);
  const orderRef = useRef(order);
  orderRef.current = order;

  // Shared Authorization Epoch & Lifecycle Guards (FIX-058 R4 & R5)
  const authEpochRef = useRef(1);
  const authRevokedOrderIdRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const pollIntervalRef = useRef(null);

  if (activeOrderId !== orderId) {
    if (typeof authRevokedOrderIdRef !== 'undefined') {
      authRevokedOrderIdRef.current = null;
    }
    if (typeof authEpochRef !== 'undefined') {
      authEpochRef.current++;
    }
    if (typeof hasNavigatedRef !== 'undefined') {
      hasNavigatedRef.current = false;
    }
    if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  const isRequestValid = (reqEpoch, targetOrderId) => {
    if (typeof isMountedRef !== 'undefined' && !isMountedRef.current) return false;
    if (typeof currentOrderIdRef !== 'undefined' && currentOrderIdRef.current !== targetOrderId && String(currentOrderIdRef.current) !== String(targetOrderId)) return false;
    if (typeof authEpochRef !== 'undefined' && authEpochRef.current !== reqEpoch) return false;
    if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) return false;
    return true;
  };

  const revokeAuthorization = (targetOrderId, errorMsg) => {
    if (typeof currentOrderIdRef !== 'undefined' && currentOrderIdRef.current !== targetOrderId && String(currentOrderIdRef.current) !== String(targetOrderId)) return;
    if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (typeof authRevokedOrderIdRef !== 'undefined') {
      authRevokedOrderIdRef.current = String(targetOrderId);
    }
    if (typeof authEpochRef !== 'undefined') {
      authEpochRef.current++;
    }
    setOrder(null);
    setPayment(null);
    if (typeof setError === 'function') {
      setError(errorMsg);
    }
    if (typeof setLoading === 'function') {
      setLoading(false);
    }
    if (typeof setIsVerifying === 'function') {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch and verify payment environment (FIX-058 Fail-Closed)
  const fetchPaymentEnvironment = async ({ force = false } = {}) => {
    if (isEnvCheckingRef.current && !force) return;
    const currentGen = ++envGenerationRef.current;
    isEnvCheckingRef.current = true;
    setIsRetryingEnv(true);
    try {
      const res = await orderApi.getPaymentEnvironment();
      const data = res?.data ?? res;
      if (!isMountedRef.current || envGenerationRef.current !== currentGen) return;

      // Fail-closed validation: must be an object with valid paymentMode ('MOCK' | 'REAL')
      if (
        !data ||
        typeof data !== 'object' ||
        !data.paymentMode ||
        (data.paymentMode !== 'MOCK' && data.paymentMode !== 'REAL')
      ) {
        setPaymentEnv(null);
        setEnvStatus('ERROR');
        setEnvError('Chưa thể xác minh môi trường thanh toán. Vui lòng thử lại. Đơn hàng của bạn vẫn được giữ nguyên.');
      } else {
        setPaymentEnv(data);
        setEnvStatus('VERIFIED');
        setEnvError('');
      }
    } catch {
      // Fail-closed fallback: never fallback to REAL. Set UNKNOWN/ERROR
      if (isMountedRef.current && envGenerationRef.current === currentGen) {
        setPaymentEnv(null);
        setEnvStatus('ERROR');
        setEnvError('Chưa thể xác minh môi trường thanh toán. Vui lòng thử lại. Đơn hàng của bạn vẫn được giữ nguyên.');
      }
    } finally {
      if (isMountedRef.current && envGenerationRef.current === currentGen) {
        setIsRetryingEnv(false);
      }
      isEnvCheckingRef.current = false;
    }
  };

  useEffect(() => {
    fetchPaymentEnvironment({ force: true });
  }, [orderId]);

  // Time remaining countdown (15 minutes default)
  const [secondsRemaining, setSecondsRemaining] = useState(
    order?.timeRemainingSeconds ?? 900
  );

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Fetch order details & latest payment attempt
  const fetchOrder = async () => {
    if (typeof isProviderCancelReturn !== 'undefined' && isProviderCancelReturn) {
      navigate(`/order-success/${orderId}?cancelled=1`, { replace: true });
      return;
    }
    const targetOrderId = orderId;
    const fetchGen = typeof orderFetchGenerationRef !== 'undefined' ? ++orderFetchGenerationRef.current : 0;
    const reqEpoch = typeof authEpochRef !== 'undefined' ? ++authEpochRef.current : 0;
    if (typeof authRevokedOrderIdRef !== 'undefined') {
      authRevokedOrderIdRef.current = null;
    }

    const isStepValid = () => {
      if (typeof isRequestValid === 'function') {
        if (!isRequestValid(reqEpoch, targetOrderId)) return false;
      } else {
        if (typeof isMountedRef !== 'undefined' && !isMountedRef.current) return false;
        if (typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) !== String(targetOrderId)) return false;
      }
      if (typeof orderFetchGenerationRef !== 'undefined' && orderFetchGenerationRef.current !== fetchGen) return false;
      return true;
    };

    const triggerRevoke = (msg) => {
      if (typeof revokeAuthorization === 'function') {
        revokeAuthorization(targetOrderId, msg);
      } else {
        setOrder(null);
        setPayment(null);
        if (typeof setError === 'function') setError(msg);
      }
    };

    try {
      setError('');
      const res = await orderApi.getOrderById(targetOrderId);
      const data = res?.data ?? res;
      if (!isStepValid()) {
        return;
      }

      if (!data || String(data.id) !== String(targetOrderId)) {
        triggerRevoke('Không tìm thấy đơn hàng.');
        return;
      }

      setOrder(data);
      if (data && data.timeRemainingSeconds !== undefined) {
        setSecondsRemaining(data.timeRemainingSeconds);
      }

      if (isOrderPaid(data)) {
        if (!isStepValid() || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
        if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
        navigate(`/order-success/${targetOrderId}`, { state: { order: data } });
        return;
      }

      // Fetch latest payment attempt
      let payData = null;
      let getFailed404 = false;
      try {
        const payRes = await orderApi.getOrderPayment(targetOrderId);
        payData = payRes && 'data' in payRes ? payRes.data : payRes;
      } catch (payErr) {
        if (!isStepValid()) {
          return;
        }
        const payStatus = payErr.response?.status;
        if (payStatus === 404) {
          getFailed404 = true;
        } else if (payStatus === 401 || payStatus === 403) {
          triggerRevoke(
            payErr.response?.data?.message || 'Không có quyền truy cập thông tin thanh toán.'
          );
          return;
        } else {
          setError(payErr.response?.data?.message || 'Không thể đồng bộ trạng thái thanh toán.');
          return;
        }
      }

      if (!isStepValid()) {
        return;
      }

      // Handle null (BUG A: 200 with null body) or 404 -> no payment attempt yet
      if (payData == null || payData === '' || getFailed404) {
        const isSuspendedInFetch = typeof isQRSuspended !== 'undefined' && isQRSuspended;
        const environmentVerified = typeof envStatus === 'undefined' || envStatus === 'VERIFIED';

        if (!isSuspendedInFetch && environmentVerified && !hasInitialRecoveredRef.current && data?.status === 'PENDING'
            && (!data.paymentMethod || data.paymentMethod === 'PAYOS_VIETQR')) {
          hasInitialRecoveredRef.current = true;
          try {
            const paymentKey = getOrCreatePaymentLinkKey(targetOrderId);
            const createdPayRes = await orderApi.createPaymentLink(targetOrderId, paymentKey);
            const createdPay = createdPayRes && 'data' in createdPayRes ? createdPayRes.data : createdPayRes;
            if (!isStepValid()) {
              return;
            }
            setPayment(createdPay);
            if (createdPay?.status === 'PAID') {
              if (!isStepValid() || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
              if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
              navigate(`/order-success/${targetOrderId}`, { state: { order: data } });
              return;
            }
          } catch (createErr) {
            if (!isStepValid()) {
              return;
            }
            const createStatus = createErr.response?.status;
            if (createStatus === 401 || createStatus === 403) {
              triggerRevoke(
                createErr.response?.data?.message || 'Không có quyền tạo liên kết thanh toán.'
              );
              return;
            } else {
              setError(
                createErr.response?.data?.message ||
                  'Chưa thể chuẩn bị liên kết thanh toán. Vui lòng kiểm tra lại.'
              );
            }
          }
        } else {
          setPayment(null);
        }
      } else {
        setPayment(payData);
        if (payData.status === 'PAID') {
          if (!isStepValid() || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
          if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
          navigate(`/order-success/${targetOrderId}`, { state: { order: data } });
          return;
        }
      }
    } catch (err) {
      if (!isStepValid()) {
        return;
      }
      const status = err.response?.status;
      if (status === 401 || status === 403 || status === 404) {
        triggerRevoke(
          err.response?.data?.message ||
            (status === 403
              ? 'Bạn không có quyền truy cập đơn hàng này.'
              : status === 401
              ? 'Vui lòng đăng nhập để xem thông tin thanh toán.'
              : status === 404
              ? 'Không tìm thấy đơn hàng.'
              : 'Không thể tải đơn hàng để xác minh thanh toán.')
        );
        return;
      } else {
        // Transient error: if order state does not match targetOrderId, clear it to prevent bleed
        if (typeof orderRef !== 'undefined' && orderRef?.current && String(orderRef.current.id) !== String(targetOrderId)) {
          setOrder(null);
          setPayment(null);
        }
      }
      setError(
        err.response?.data?.message ||
          'Không thể tải đơn hàng để xác minh thanh toán.'
      );
    } finally {
      if (typeof isMountedRef !== 'undefined' && isMountedRef.current && typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) === String(targetOrderId)) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    hasInitialRecoveredRef.current = false;
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [orderId, envStatus, location.search]);

  // Polling check order status every 4 seconds
  useEffect(() => {
    if (typeof isProviderCancelReturn !== 'undefined' && isProviderCancelReturn) return;
    let cancelled = false;
    const targetOrderId = orderId;
    const generation = typeof pollGenerationRef !== 'undefined' ? ++pollGenerationRef.current : 0;

    const stopThisInterval = () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof pollGenerationRef !== 'undefined' && pollGenerationRef.current === generation) {
        pollGenerationRef.current++;
      }
      if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current === interval) {
        pollIntervalRef.current = null;
      }
    };

    const isStale = () => {
      if (cancelled) return true;
      if (typeof pollGenerationRef !== 'undefined' && pollGenerationRef.current !== generation) {
        cancelled = true;
        clearInterval(interval);
        if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current === interval) {
          pollIntervalRef.current = null;
        }
        return true;
      }
      return false;
    };

    const checkValid = (ep) => {
      if (typeof isRequestValid === 'function') {
        return isRequestValid(ep, targetOrderId);
      }
      if (typeof isMountedRef !== 'undefined' && !isMountedRef.current) return false;
      if (typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) !== String(targetOrderId)) return false;
      return true;
    };

    const triggerRevoke = (msg) => {
      stopThisInterval();
      if (typeof revokeAuthorization === 'function') {
        revokeAuthorization(targetOrderId, msg);
      } else {
        setOrder(null);
        setPayment(null);
        if (typeof setError === 'function') setError(msg);
      }
    };

    const interval = setInterval(async () => {
      if (isStale()) return;
      if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) {
        stopThisInterval();
        return;
      }
      const reqEpoch = typeof authEpochRef !== 'undefined' ? authEpochRef.current : 0;
      if (!checkValid(reqEpoch)) {
        stopThisInterval();
        return;
      }
      if (isStale()) return;

      const currentOrder = typeof orderRef !== 'undefined' ? orderRef?.current : order;
      if (
        currentOrder &&
        (isOrderPaid(currentOrder) ||
          (currentOrder.status && currentOrder.status !== 'PENDING') ||
          (currentOrder.paymentMethod && currentOrder.paymentMethod !== 'PAYOS_VIETQR'))
      ) {
        stopThisInterval();
        return;
      }

      try {
        const res = await orderApi.getOrderById(targetOrderId);
        if (isStale()) return;
        if (!checkValid(reqEpoch)) {
          stopThisInterval();
          return;
        }

        const latest = res && 'data' in res ? res.data : res;
        if (!latest || String(latest.id) !== String(targetOrderId)) {
          triggerRevoke('Không tìm thấy đơn hàng.');
          return;
        }

        setOrder(latest);
        if (latest?.timeRemainingSeconds !== undefined) {
          setSecondsRemaining(latest.timeRemainingSeconds);
        }
        if (isOrderPaid(latest)) {
          if (!checkValid(reqEpoch) || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
          if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
          stopThisInterval();
          navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
          return;
        }

        // Terminal status: CANCELLED, FAILED, EXPIRED, or non-VietQR method
        if (
          (latest.status && latest.status !== 'PENDING') ||
          (latest.paymentMethod && latest.paymentMethod !== 'PAYOS_VIETQR')
        ) {
          stopThisInterval();
          return;
        }

        try {
          const payRes = await orderApi.getOrderPayment(targetOrderId);
          if (isStale()) return;
          if (!checkValid(reqEpoch)) {
            stopThisInterval();
            return;
          }

          const latestPay = payRes && 'data' in payRes ? payRes.data : payRes;
          if (latestPay) {
            if (latestPay.orderId && String(latestPay.orderId) !== String(targetOrderId)) {
              return;
            }
            setPayment(latestPay);
            if (latestPay.status === 'PAID') {
              if (!checkValid(reqEpoch) || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
              if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
              stopThisInterval();
              navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
              return;
            }
            // Terminal payment status: CANCELLED, EXPIRED, FAILED
            if (
              latestPay.status === 'CANCELLED' ||
              latestPay.status === 'EXPIRED' ||
              latestPay.status === 'FAILED'
            ) {
              stopThisInterval();
              return;
            }
          }
        } catch (pErr) {
          if (isStale()) return;
          if (!checkValid(reqEpoch)) {
            stopThisInterval();
            return;
          }
          const pStatus = pErr.response?.status;
          if (pStatus === 401 || pStatus === 403) {
            triggerRevoke(
              pErr.response?.data?.message || 'Không có quyền truy cập thông tin thanh toán.'
            );
            return;
          } else if (pStatus === 404) {
            setPayment(null);
          }
          // quiet fallback for transient error
        }
      } catch (e) {
        if (isStale()) return;
        if (!checkValid(reqEpoch)) {
          stopThisInterval();
          return;
        }
        const status = e.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          triggerRevoke(
            e.response?.data?.message ||
              (status === 403
                ? 'Bạn không có quyền truy cập đơn hàng này.'
                : status === 401
                ? 'Vui lòng đăng nhập để xem thông tin thanh toán.'
                : 'Không tìm thấy đơn hàng.')
          );
          return;
        }
        // quiet fallback for transient error
      }
    }, 4000);

    if (typeof pollIntervalRef !== 'undefined') {
      if (pollIntervalRef.current && pollIntervalRef.current !== interval) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = interval;
    }

    return () => {
      stopThisInterval();
    };
  }, [orderId]);

  // 1-second interval countdown
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatTimerDisplay = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isOrderOwnedByRoute = Boolean(order && String(order.id) === String(orderId));
  const isPaymentOwnedByRoute = Boolean(
    payment &&
    isOrderOwnedByRoute &&
    (!payment.orderId || String(payment.orderId) === String(orderId))
  );

  // Polling Session Manager for Reauthorization Recovery (FIX-058 R5, R6 & R7)
  const startPollingSession = (targetOrderId) => {
    if (!targetOrderId) return;
    if (typeof isMountedRef !== 'undefined' && !isMountedRef.current) return;
    if (typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) !== String(targetOrderId)) return;
    if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) return;

    if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    let cancelled = false;
    let myInterval = null;
    const generation = typeof pollGenerationRef !== 'undefined' ? ++pollGenerationRef.current : 0;

    const stopSession = () => {
      cancelled = true;
      if (myInterval) {
        clearInterval(myInterval);
      }
      if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current === myInterval) {
        pollIntervalRef.current = null;
      }
      if (typeof pollGenerationRef !== 'undefined' && pollGenerationRef.current === generation) {
        pollGenerationRef.current++;
      }
    };

    const isStale = () => {
      if (cancelled) return true;
      if (typeof pollGenerationRef !== 'undefined' && pollGenerationRef.current !== generation) {
        cancelled = true;
        if (myInterval) {
          clearInterval(myInterval);
        }
        if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current === myInterval) {
          pollIntervalRef.current = null;
        }
        return true;
      }
      return false;
    };

    const checkValid = (ep) => {
      if (typeof isRequestValid === 'function') {
        return isRequestValid(ep, targetOrderId);
      }
      if (typeof isMountedRef !== 'undefined' && !isMountedRef.current) return false;
      if (typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) !== String(targetOrderId)) return false;
      return true;
    };

    const triggerRevoke = (msg) => {
      stopSession();
      if (typeof revokeAuthorization === 'function') {
        revokeAuthorization(targetOrderId, msg);
      } else {
        setOrder(null);
        setPayment(null);
        if (typeof setError === 'function') setError(msg);
      }
    };

    const pollTick = async () => {
      if (isStale()) return;
      if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) {
        stopSession();
        return;
      }
      const reqEpoch = typeof authEpochRef !== 'undefined' ? authEpochRef.current : 0;
      if (!checkValid(reqEpoch)) {
        stopSession();
        return;
      }
      if (isStale()) return;

      const currentOrder = typeof orderRef !== 'undefined' ? orderRef?.current : order;
      if (
        currentOrder &&
        (isOrderPaid(currentOrder) ||
          (currentOrder.status && currentOrder.status !== 'PENDING') ||
          (currentOrder.paymentMethod && currentOrder.paymentMethod !== 'PAYOS_VIETQR'))
      ) {
        stopSession();
        return;
      }

      try {
        const res = await orderApi.getOrderById(targetOrderId);
        if (isStale()) return;
        if (!checkValid(reqEpoch)) {
          stopSession();
          return;
        }

        const latest = res && 'data' in res ? res.data : res;
        if (!latest || String(latest.id) !== String(targetOrderId)) {
          triggerRevoke('Không tìm thấy đơn hàng.');
          return;
        }

        setOrder(latest);
        if (latest?.timeRemainingSeconds !== undefined) {
          setSecondsRemaining(latest.timeRemainingSeconds);
        }
        if (isOrderPaid(latest)) {
          if (!checkValid(reqEpoch) || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
          if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
          stopSession();
          navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
          return;
        }

        // Terminal order status: CANCELLED, FAILED, EXPIRED, or non-VietQR method
        if (
          (latest.status && latest.status !== 'PENDING') ||
          (latest.paymentMethod && latest.paymentMethod !== 'PAYOS_VIETQR')
        ) {
          stopSession();
          return;
        }

        try {
          const payRes = await orderApi.getOrderPayment(targetOrderId);
          if (isStale()) return;
          if (!checkValid(reqEpoch)) {
            stopSession();
            return;
          }

          const latestPay = payRes && 'data' in payRes ? payRes.data : payRes;
          if (latestPay) {
            if (latestPay.orderId && String(latestPay.orderId) !== String(targetOrderId)) {
              return;
            }
            setPayment(latestPay);
            if (latestPay.status === 'PAID') {
              if (!checkValid(reqEpoch) || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
              if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
              stopSession();
              navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
              return;
            }
            // Terminal payment status: CANCELLED, EXPIRED, FAILED
            if (
              latestPay.status === 'CANCELLED' ||
              latestPay.status === 'EXPIRED' ||
              latestPay.status === 'FAILED'
            ) {
              stopSession();
              return;
            }
          }
        } catch (pErr) {
          if (isStale()) return;
          if (!checkValid(reqEpoch)) {
            stopSession();
            return;
          }
          const pStatus = pErr.response?.status;
          if (pStatus === 401 || pStatus === 403) {
            triggerRevoke(
              pErr.response?.data?.message || 'Không có quyền truy cập thông tin thanh toán.'
            );
            return;
          } else if (pStatus === 404) {
            setPayment(null);
          }
        }
      } catch (e) {
        if (isStale()) return;
        if (!checkValid(reqEpoch)) {
          stopSession();
          return;
        }
        const status = e.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          triggerRevoke(
            e.response?.data?.message ||
              (status === 403
                ? 'Bạn không có quyền truy cập đơn hàng này.'
                : status === 401
                ? 'Vui lòng đăng nhập để xem thông tin thanh toán.'
                : 'Không tìm thấy đơn hàng.')
          );
          return;
        }
      }
    };

    const newInterval = setInterval(pollTick, 4000);
    myInterval = newInterval;
    if (typeof pollIntervalRef !== 'undefined') {
      pollIntervalRef.current = newInterval;
    }
  };

  // Manual verify check / retry
  const handleCheckPayment = async () => {
    if (isCheckingRef.current || isVerifying) return; // Guard double-click & overlapping requests

    const targetOrderId = orderId;
    isCheckingRef.current = true;
    setIsVerifying(true);

    const reqEpoch = typeof authEpochRef !== 'undefined' ? ++authEpochRef.current : 0;

    const checkValid = () => {
      if (typeof isMountedRef !== 'undefined' && !isMountedRef.current) return false;
      if (typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) !== String(targetOrderId)) return false;
      if (typeof authEpochRef !== 'undefined' && authEpochRef.current !== reqEpoch) return false;
      return true;
    };

    const triggerRevoke = (msg) => {
      if (typeof pollIntervalRef !== 'undefined' && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (typeof revokeAuthorization === 'function') {
        revokeAuthorization(targetOrderId, msg);
      } else {
        setOrder(null);
        setPayment(null);
        if (typeof setError === 'function') setError(msg);
      }
    };

    try {
      setError('');
      if (typeof envStatus !== 'undefined' && (envStatus !== 'VERIFIED' || !paymentEnv)) {
        if (typeof fetchPaymentEnvironment === 'function') {
          await fetchPaymentEnvironment({ force: true });
        }
        return;
      }
      const res = await orderApi.getOrderById(targetOrderId);
      if (!checkValid()) return;

      const latest = res?.data ?? res;
      if (!latest || String(latest.id) !== String(targetOrderId)) {
        triggerRevoke('Không tìm thấy đơn hàng.');
        return;
      }

      setOrder(latest);

      if (isOrderPaid(latest)) {
        if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) {
          authRevokedOrderIdRef.current = null;
        }
        if (!checkValid() || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
        if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
        navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
        return;
      }

      let payData = null;
      let getFailed404 = false;
      try {
        const payRes = await orderApi.getOrderPayment(targetOrderId);
        if (!checkValid()) return;
        payData = payRes && 'data' in payRes ? payRes.data : payRes;
      } catch (pErr) {
        if (!checkValid()) return;
        const pStatus = pErr.response?.status;
        if (pStatus === 404) {
          getFailed404 = true;
        } else if (pStatus === 401 || pStatus === 403) {
          triggerRevoke(
            pErr.response?.data?.message || 'Không có quyền truy cập thông tin thanh toán.'
          );
          return;
        } else {
          throw pErr;
        }
      }

      if (!checkValid()) return;

      if (payData?.status === 'PAID') {
        if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) {
          authRevokedOrderIdRef.current = null;
        }
        setPayment(payData);
        if (!checkValid() || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
        if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
        navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
        return;
      }

      // If payment is null (200 + null or 404) OR status is CREATING:
      // In PayOS-enabled mode: Must call POST payment-link with SAME orderId and SAME payment key to trigger creation / provider recovery
      // In demo COD mode: read-only status check, NO POST payment-link call
      if (payData == null || payData === '' || getFailed404 || payData.status === 'CREATING') {
        const isSuspendedInCheck = typeof isQRSuspended !== 'undefined' && isQRSuspended;

        const canCreateLink = latest.status === 'PENDING' &&
          (!latest.paymentMethod || latest.paymentMethod === 'PAYOS_VIETQR');
        if (!isSuspendedInCheck && canCreateLink) {
          const key = getOrCreatePaymentLinkKey(targetOrderId);
          const postRes = await orderApi.createPaymentLink(targetOrderId, key);
          if (!checkValid()) return;
          const updatedPayment = postRes && 'data' in postRes ? postRes.data : postRes;
          setPayment(updatedPayment);

          if (updatedPayment?.status === 'PAID') {
            if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) {
              authRevokedOrderIdRef.current = null;
            }
            if (!checkValid() || (typeof hasNavigatedRef !== 'undefined' && hasNavigatedRef.current)) return;
            if (typeof hasNavigatedRef !== 'undefined') hasNavigatedRef.current = true;
            navigate(`/order-success/${targetOrderId}`, { state: { order: latest } });
            return;
          } else if (updatedPayment?.status === 'CREATING') {
            setError('');
          } else if (updatedPayment?.status === 'PENDING') {
            setError('');
          }
        } else {
          // Demo COD mode: read-only status check
          setPayment(payData);
          if (payData?.status === 'CREATING') {
            setError('Thanh toán QR tạm hoãn trong bản demo. Quý khách vui lòng chuyển sang COD.');
          }
        }
      } else if (payData.status === 'PENDING') {
        setPayment(payData);
      } else {
        setPayment(payData);
      }

      // Commit successful reauthorization session (FIX-058 R5)
      if (typeof authRevokedOrderIdRef !== 'undefined' && authRevokedOrderIdRef.current && String(authRevokedOrderIdRef.current) === String(targetOrderId)) {
        authRevokedOrderIdRef.current = null;
      }

      // Resume polling lifecycle after successful reauthorization for PENDING order
      if (
        !isOrderPaid(latest) &&
        latest.status === 'PENDING' &&
        (!latest.paymentMethod || latest.paymentMethod === 'PAYOS_VIETQR')
      ) {
        if (typeof startPollingSession === 'function') {
          startPollingSession(targetOrderId);
        }
      }
    } catch (err) {
      if (!checkValid()) return;
      const status = err.response?.status;
      if (status === 401 || status === 403 || status === 404) {
        triggerRevoke(
          err.response?.data?.message ||
            (status === 403
              ? 'Bạn không có quyền truy cập đơn hàng này.'
              : status === 401
              ? 'Vui lòng đăng nhập để xem thông tin thanh toán.'
              : 'Không tìm thấy đơn hàng.')
        );
        return;
      }
      if (typeof orderRef !== 'undefined' && orderRef?.current && String(orderRef.current.id) !== String(targetOrderId)) {
        setOrder(null);
        setPayment(null);
      }
      setError(
        err.response?.data?.message ||
          'Không thể kiểm tra thanh toán. Vui lòng thử lại.'
      );
    } finally {
      if (typeof isMountedRef !== 'undefined' && isMountedRef.current && typeof currentOrderIdRef !== 'undefined' && String(currentOrderIdRef.current) === String(targetOrderId)) {
        setIsVerifying(false);
      }
      isCheckingRef.current = false;
    }
  };

  const displayOrderCode = (isPaymentOwnedByRoute && payment?.orderCode)
    ? `#${payment.orderCode}`
    : (isOrderOwnedByRoute && order?.orderCode)
    ? order.orderCode
    : `#HG-${orderId || '89241'}`;
  const displayAmount = (isPaymentOwnedByRoute && payment?.amount !== undefined)
    ? payment.amount
    : (isOrderOwnedByRoute && order?.totalAmount !== undefined)
    ? order.totalAmount
    : 0;

  // Derive authoritative payment mode with fail-closed checks (FIX-058 R1)
  let resolvedPaymentMode = 'UNKNOWN';
  if (envStatus === 'VERIFIED' && paymentEnv?.paymentMode && isOrderOwnedByRoute) {
    const envMode = paymentEnv.paymentMode;
    if (envMode === 'MOCK' || envMode === 'REAL') {
      const payMode = isPaymentOwnedByRoute ? payment?.paymentMode : null;
      const ordMode = order?.paymentMode;
      // If metadata conflicts between environment and order/payment facts -> fail-closed to UNKNOWN
      const hasConflict = (payMode && payMode !== envMode) || (ordMode && ordMode !== envMode);
      if (!hasConflict) {
        resolvedPaymentMode = envMode;
      }
    }
  }

  const isMockMode = resolvedPaymentMode === 'MOCK';
  const isRealMode = resolvedPaymentMode === 'REAL';
  const isUnknownMode = resolvedPaymentMode === 'UNKNOWN';
  const simulationControlsAllowed = Boolean(isMockMode && paymentEnv?.simulationControlsAllowed);

  if (isProviderCancelReturn) return <p className="p-8" role="status">Đang xác minh trạng thái thanh toán với PayOS...</p>;
  if (loading) return <p className="p-8" role="status">Đang tải đơn hàng...</p>;
  if (isOrderOwnedByRoute && payment && ['CANCELLED', 'EXPIRED', 'FAILED', 'NEEDS_REVIEW', 'PAID'].includes(payment.status)) {
    return <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-xl font-bold">Liên kết thanh toán không còn sử dụng được</h1>
      <p>Vui lòng xem trạng thái đã được ghi nhận trước khi tiếp tục thanh toán hoặc đổi phương thức.</p>
      <Link className="block text-blue-600 underline" to={`/order-success/${orderId}`}>Xem trạng thái thanh toán</Link>
      {order?.status === 'PENDING' && order?.paymentMethod === 'PAYOS_VIETQR' && ['CANCELLED', 'EXPIRED', 'FAILED'].includes(payment.status) &&
        <Link className="block text-red-600 underline" to={`/checkout?orderId=${orderId}`}>Đổi phương thức thanh toán</Link>}
    </div>;
  }
  if (!isOrderOwnedByRoute || error || (order && order.status !== 'PENDING') || secondsRemaining <= 0) {
    return <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-xl font-bold">Thanh toán đơn hàng #{orderId}</h1>
      <p role="alert">{error || (!isOrderOwnedByRoute
        ? 'Chưa có thông tin đơn hàng được xác thực.'
        : order?.status === 'PENDING'
        ? 'Chưa có mã thanh toán được xác thực. Vui lòng không chuyển tiền theo thông tin mẫu.'
        : 'Đơn hàng không ở trạng thái chờ thanh toán.')}</p>
      <button className="border rounded px-4 py-2" onClick={handleCheckPayment}>Kiểm tra lại</button>
      <Link className="block text-red-600 underline" to="/my-orders">Xem đơn hàng</Link>
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between antialiased selection:bg-red-500 selection:text-white">

      {/* Inline scanner animation styles */}
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 96%; opacity: 0.8; }
        }
        .scanner-line {
          animation: scanline 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }
      `}</style>

      {/* Header Tối Giản */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-wider text-slate-900 leading-tight">
                HG<span className="text-red-600">BADMINTON</span>
              </span>
              <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] -mt-0.5">
                PRO SPORT & GEAR
              </span>
            </div>
          </Link>

          {/* Stepper mini */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1 text-slate-500">
              <Check className="w-4 h-4 text-emerald-500" />
              Giỏ hàng
            </span>
            <span className="w-6 h-[1.5px] bg-emerald-300"></span>
            <span className="flex items-center gap-1.5 text-blue-600 font-bold">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                2
              </span>
              Thanh toán QR
            </span>
            <span className="w-6 h-[1.5px] bg-slate-200"></span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center">
                3
              </span>
              Hoàn tất
            </span>
          </div>

          {/* Hotline & Security */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Thanh toán qua cổng PayOS</span>
            </div>
            <a
              href="/my-orders"
              className="flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition"
            >
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <span>Lịch sử đơn hàng</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - Căn giữa tối giản */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        {String(location.state?.order?.id) === String(orderId) && location.state?.addressSaveWarning &&
          <p role="status" className="w-full max-w-[540px] mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {location.state.addressSaveWarning}
          </p>}

        {/* Link quay lại & Thông báo */}
        <div className="w-full max-w-[540px] flex items-center justify-between mb-4">
          {(!payment || (payment.status !== 'PAID' && payment.status !== 'NEEDS_REVIEW')) && order?.status === 'PENDING' ? (
            <Link
              to={`/checkout?orderId=${orderId}`}
              data-testid="change-payment-method-link"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Đổi phương thức thanh toán</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed">
              <ArrowLeft className="w-4 h-4" />
              <span>Không thể đổi phương thức thanh toán</span>
            </span>
          )}
          <span className="text-xs text-slate-400 font-medium">Đơn hàng {displayOrderCode}</span>
        </div>

        {/* Card Trắng Lớn Ở Giữa */}
        <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200 p-6 sm:p-8 flex flex-col items-center relative overflow-hidden">

          {/* Viền màu thương hiệu trang trí trên đỉnh card */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-slate-900 to-red-600"></div>

          {/* Banner CHẾ ĐỘ THANH TOÁN MÔ PHỎNG (FIX-058) */}
          {isMockMode && (
            <div
              data-testid="mock-payment-banner"
              className="w-full bg-amber-100 border-2 border-amber-300 text-amber-900 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold mb-4 flex items-center justify-center gap-2 text-center shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>CHẾ ĐỘ THANH TOÁN MÔ PHỎNG — KHÔNG CHUYỂN TIỀN THẬT</span>
            </div>
          )}

          {/* Trạng thái mô phỏng Mock Provider (nếu có) */}
          {isMockMode && payment?.mockProviderStatus && (
            <div
              data-testid="mock-provider-status-badge"
              className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-bold text-amber-800 mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Trạng thái mô phỏng: {payment.mockProviderStatus}</span>
            </div>
          )}
          {/* Trạng thái thanh toán */}
          {error ? (
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-red-800 mb-5 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>{error}</span>
            </div>
          ) : payment?.status === 'NEEDS_REVIEW' ? (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 mb-5 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Giao dịch cần được đối soát bởi quản trị viên</span>
            </div>
          ) : payment?.status === 'FAILED' ? (
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-red-800 mb-5 shadow-sm">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Giao dịch thanh toán thất bại</span>
            </div>
          ) : payment?.status === 'EXPIRED' ? (
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-red-800 mb-5 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Mã thanh toán đã hết hạn</span>
            </div>
          ) : payment?.status === 'CANCELLED' ? (
            <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 mb-5 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>Giao dịch đã hủy trên cổng thanh toán</span>
            </div>
          ) : payment?.status === 'CREATING' ? (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 mb-5 shadow-sm">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Chưa nhận được mã QR từ PayOS</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 mb-5 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Đang chờ thanh toán...</span>
            </div>
          )}

          {/* Tiêu đề phía trên mã QR */}
          <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 text-center mb-1">
            {isUnknownMode
              ? 'Xác minh thanh toán'
              : isMockMode
              ? 'Mô phỏng thanh toán QR'
              : 'Quét mã để thanh toán'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 text-center mb-6 max-w-sm">
            {isUnknownMode
              ? 'Hệ thống đang kiểm tra và bảo vệ môi trường giao dịch an toàn.'
              : isMockMode
              ? 'Giao diện mô phỏng PayOS phục vụ kiểm thử. Vui lòng không quét để chuyển tiền thật.'
              : 'Sử dụng ứng dụng ngân hàng hoặc ví điện tử bất kỳ hỗ trợ VietQR / PayOS'}
          </p>

          {/* Khung Mã QR To Ở Giữa */}
          <div className="relative bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 shadow-md flex flex-col items-center mb-5 group w-full max-w-[340px]">

            {/* Header frame */}
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                  {isUnknownMode ? 'BẢO MẬT' : isMockMode ? 'MOCK PAYOS' : 'VietQR'}
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {isUnknownMode ? 'CHỜ XÁC MINH' : isMockMode ? 'SANDBOX' : 'Napas 247'}
                </span>
              </div>
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isUnknownMode ? 'text-amber-600' : isMockMode ? 'text-amber-600' : 'text-emerald-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isUnknownMode ? 'bg-amber-500' : isMockMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                {isUnknownMode ? 'Xác minh an toàn' : isMockMode ? 'Mô phỏng' : 'QR Động'}
              </span>
            </div>

            {/* Hình QR & Tia quét scanner animation */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 bg-slate-50 rounded-xl flex items-center justify-center p-2 overflow-hidden border border-slate-100">
              {!isUnknownMode && (
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent scanner-line z-10 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              )}

              {isQRSuspended ? (
                /* DEMO COD SUSPENDED: Tuyệt đối không hiển thị QR có thể thanh toán hay link mở PayOS */
                <div
                  data-testid="suspended-qr-placeholder"
                  className="flex flex-col items-center justify-center p-4 w-full h-full text-center gap-2"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                    <QrCode className="w-9 h-9" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    TẠM HOÃN THANH TOÁN QR
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium max-w-[200px] leading-tight">
                    Thanh toán QR tạm chưa hỗ trợ trong bản demo. Quý khách vui lòng chuyển sang COD.
                  </p>
                </div>
              ) : isUnknownMode ? (
                /* FAIL-CLOSED: Environment UNKNOWN -> Tuyệt đối không render QR thật hay PayOS link */
                <div
                  data-testid="unknown-env-card"
                  className="flex flex-col items-center justify-center p-4 w-full h-full text-center gap-2.5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <p role="alert" className="text-xs text-slate-600 font-semibold max-w-[220px] leading-relaxed">
                    {envError || 'Chưa thể xác minh môi trường thanh toán. Vui lòng thử lại. Đơn hàng của bạn vẫn được giữ nguyên.'}
                  </p>
                  <button
                    type="button"
                    data-testid="retry-env-btn"
                    onClick={() => fetchPaymentEnvironment({ force: true })}
                    disabled={isRetryingEnv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 mt-1 cursor-pointer"
                  >
                    {isRetryingEnv ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xác minh...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại xác minh thanh toán</span>
                      </>
                    )}
                  </button>
                </div>
              ) : isMockMode ? (
                /* MOCK MODE: Hiển thị placeholder mô phỏng an toàn, không có QR chuyển tiền thật */
                <div
                  data-testid="mock-qr-placeholder"
                  className="flex flex-col items-center justify-center p-4 w-full h-full text-center gap-2"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                    <QrCode className="w-9 h-9" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    MÃ QR MÔ PHỎNG
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium max-w-[200px] leading-tight">
                    Chế độ thử nghiệm hệ thống. Không quét chuyển tiền thật.
                  </p>
                </div>
              ) : payment?.status === 'CREATING' ? (
                <div className="text-center p-4 flex flex-col items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mb-2" />
                  <p className="text-xs font-medium text-slate-500">Chưa nhận được mã QR từ PayOS. Bấm Kiểm tra lại để xác minh và thử lại an toàn trên đơn này. Không chuyển tiền khi chưa có mã QR hợp lệ.</p>
                </div>
              ) : isRealMode && payment?.qrPayload ? (
                <div ref={qrContainerRef} className="flex flex-col items-center justify-center p-1 w-full h-full">
                  <QRCodeSVG
                    value={payment.qrPayload}
                    size={210}
                    level="M"
                    className="max-w-full max-h-full aspect-square"
                  />
                </div>
              ) : isRealMode && payment?.status === 'PENDING' && payment?.checkoutUrl ? (
                <div className="text-center p-4 flex flex-col items-center justify-center gap-2">
                  <QrCode className="w-16 h-16 text-slate-700" />
                  <a
                    href={payment.checkoutUrl}
                    target="_self"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Mở cổng thanh toán PayOS
                  </a>
                </div>
              ) : (
                /* Authentic QR Status */
                <p className="text-xs text-slate-500 text-center p-4">
                  {error || 'Chưa có mã QR được xác thực.'}
                </p>
              )}
            </div>

            {/* Supported Banks Text */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium w-full">
              {isUnknownMode ? (
                <span className="text-slate-500 font-semibold text-center">
                  Đang chờ xác minh môi trường thanh toán an toàn
                </span>
              ) : isMockMode ? (
                <span className="text-amber-700 font-semibold text-center">
                  Chế độ kiểm thử (Sandbox) — Không liên kết tài khoản ngân hàng thực tế
                </span>
              ) : (
                <>
                  <span className="text-slate-400">Hỗ trợ tự động:</span>
                  <span className="font-bold text-slate-700">Vietcombank</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700">MB Bank</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700">Techcombank</span>
                  <span>•</span>
                  <span className="font-bold text-pink-600">MoMo</span>
                </>
              )}
            </div>
          </div>

          {/* Số tiền cần thanh toán */}
          <div className="text-center mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              Số tiền thanh toán
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-red-600 tracking-tight">
              {formatPrice(displayAmount)}
            </div>
          </div>

          {/* Thông tin Mã đơn hàng & Đồng hồ đếm ngược */}
          <div className="w-full bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 mb-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-400">Mã đơn hàng</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 tracking-wide">
                  {displayOrderCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayOrderCode, 'orderCode')}
                  title="Sao chép mã"
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                >
                  {copiedField === 'orderCode' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-200"></div>

            {/* Đồng hồ đếm ngược */}
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-slate-400">Thời gian còn lại</span>
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm sm:text-base">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="font-mono tracking-wider font-extrabold text-blue-600">
                  {formatTimerDisplay(secondsRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Bước Đơn Giản - Chỉ hiển thị khi môi trường đã xác minh */}
          {!isUnknownMode && (
            <div className="w-full mb-6">
              <div className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                3 Bước Đơn Giản
              </div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-700 bg-blue-50/60 border border-blue-100 rounded-lg py-2.5 px-3">
                <span className="flex items-center gap-1 text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Mở app ngân hàng
                </span>
                <span className="text-slate-300 font-normal">›</span>
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  Quét QR
                </span>
                <span className="text-slate-300 font-normal">›</span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                  Xác nhận
                </span>
              </div>
            </div>
          )}

          {/* Tiếp tục thanh toán và thao tác phụ */}
          <div className="w-full flex flex-col gap-2.5">
            {!isQRSuspended && isRealMode && payment?.status === 'PENDING' && payment?.checkoutUrl && (
              <a
                href={payment.checkoutUrl}
                target="_self"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
              >
                <span>Tiếp tục thanh toán qua PayOS</span>
              </a>
            )}
            {isQRSuspended && (
              <div
                data-testid="payos-suspended-notice"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-500 font-medium text-xs text-center border border-slate-200"
              >
                Cổng thanh toán PayOS tạm hoãn trong bản demo.
              </div>
            )}
            {(!payment || payment.status === 'CREATING') && (
              <button type="button" onClick={handleCheckPayment} disabled={isVerifying}
                className="w-full py-3 px-5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{isVerifying ? 'Đang kiểm tra giao dịch...' : 'Kiểm tra lại'}</span>
              </button>
            )}

            {/* Thao tác phụ: Tải ảnh QR / Quay lại checkout */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-1">
              <button
                type="button"
                disabled={!isRealMode || !payment?.qrPayload || payment?.status !== 'PENDING'}
                onClick={() => {
                  try { saveRenderedQr(qrContainerRef.current?.querySelector('svg'), orderId); }
                  catch (error) { setError(error.message || 'Không tải được mã QR.'); }
                }}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải mã QR (SVG)</span>
              </button>
              <Link
                to={`/checkout?orderId=${orderId}`}
                data-testid="return-checkout-link"
                className="hover:text-slate-800 transition font-medium"
              >
                Quay lại checkout
              </Link>
            </div>

            {/* Helper text giải thích rõ nghĩa hành động quay lại checkout */}
            {payment?.status === 'PENDING' && (
              <p className="text-[11px] text-slate-400 text-center pt-1" data-testid="checkout-return-note">
                Quay lại checkout không tự động hủy giao dịch thanh toán hiện tại.
              </p>
            )}
          </div>

        </div>

        {/* Admin Mock Simulation Panel (FIX-058) */}
        {simulationControlsAllowed && (
          <MockPayOSControls
            orderId={orderId}
            onActionApplied={() => fetchOrder()}
          />
        )}

        {/* Hỗ trợ & Thông báo bảo mật chân trang card */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 text-center">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tự động kích hoạt đơn hàng trong 3-5 giây</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Gặp sự cố? Kiểm tra <strong className="font-bold text-slate-700">Lịch sử đơn hàng</strong></span>
          </div>
        </div>

      </main>

      {/* Footer Tối Giản */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2025 HG Badminton Store Co., Ltd. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
            <span>Xác minh thanh toán từ máy chủ</span>
            <span>•</span>
            <span>VietQR Powered</span>
            <span>•</span>
            <span>Chính sách hoàn tiền</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default QRPaymentPage;
