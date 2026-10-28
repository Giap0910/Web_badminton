import AdministrativeAddressFields from '../components/AdministrativeAddressFields';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import OrderItemOptions from '../components/OrderItemOptions';
import { productImageSource } from '../utils/productMedia.js';
import useCheckoutVoucher from '../components/useCheckoutVoucher';
import { shippingAddressApi } from '../api/shippingAddressApi';
import { formatPrice } from '../utils/formatters';
import {
  buildOrderPayload,
  getOrCreateIdempotencyKey,
  clearStoredCheckoutIntent,
  getOrCreatePaymentLinkKey,
  getOrCreateTransitionKey,
  getStoredTransitionIntent,
  saveTransitionIntent,
  clearStoredTransitionIntent,
} from '../utils/idempotency';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  Tag,
  Zap,
  Check,
  Clock,
  Truck,
  ShoppingBag,
  Edit3,
  Gift,
  BadgeCheck,
  Banknote,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const pendingCheckoutStorageKey = userId => `hg_checkout_submission_${userId}`;

export function readPendingCheckoutSubmission(userId) {
  if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) return null;
  try {
    const raw = sessionStorage.getItem(pendingCheckoutStorageKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const validKey = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(saved?.key || '');
    if (String(saved?.userId) !== String(userId) || !validKey || !Array.isArray(saved?.payload?.items)
        || !saved.payload.items.length || !Array.isArray(saved.lines) || !saved.form || !Number.isFinite(Date.parse(saved.createdAt))
        || saved.lines.some(line => typeof line.id !== 'string' || !line.id || !Number.isInteger(line.quantity) || line.quantity <= 0)) {
      return { invalid: true };
    }
    return saved;
  } catch { return { invalid: true }; }
}

export function savePendingCheckoutSubmission(snapshot) {
  const key = pendingCheckoutStorageKey(snapshot.userId);
  const value = JSON.stringify(snapshot);
  sessionStorage.setItem(key, value);
  if (sessionStorage.getItem(key) !== value) throw new Error('Không lưu được yêu cầu đặt hàng an toàn.');
}

export function clearPendingCheckoutSubmission(userId) {
  sessionStorage.removeItem(pendingCheckoutStorageKey(userId));
}

export function createCheckoutSubmission(userId, payload, items, form) {
  if (!Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) throw new Error('Vui lòng đăng nhập lại trước khi đặt hàng.');
  const snapshot = { userId, key: getOrCreateIdempotencyKey({ userId, payload }).key,
    payload: JSON.parse(JSON.stringify(payload)), form: { ...form }, createdAt: new Date().toISOString(),
    lines: items.map(item => ({ id: item.cartItemId, quantity: item.quantity })),
    displayItems: items.map(({ product, ...item }) => ({ ...item,
      product: { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl } })) };
  savePendingCheckoutSubmission(snapshot);
  return snapshot;
}

export function submittedCartUpdates(cart, lines) {
  return lines.flatMap(line => {
    const current = cart.find(item => item.cartItemId === line.id);
    return current ? [{ id: line.id, quantity: Math.max(0, current.quantity - line.quantity) }] : [];
  });
}

export function checkoutMayProceed(snapshot, ownerId, active) {
  return active && String(snapshot?.userId) === String(ownerId);
}

export function checkoutAddressMatches(address, form) {
  const values = { fullName: form.customerName, phone: form.shippingPhone,
    provinceCode: form.provinceCode, wardCode: form.wardCode, addressDetail: form.addressDetail };
  return Object.entries(values).every(([key, value]) =>
    String(address[key] || '').trim() === String(value || '').trim());
}

export async function saveCheckoutAddress(snapshot, config, isActive = () => true) {
  if (!snapshot.form?.saveInfo || !isActive()) return '';
  try {
    const response = await shippingAddressApi.getMyAddresses(config);
    const addresses = response?.data ?? response;
    if (!Array.isArray(addresses)) throw new Error('Không đọc được sổ địa chỉ.');
    if (!isActive() || addresses.some(address => checkoutAddressMatches(address, snapshot.form))) return '';
    const form = snapshot.form;
    await shippingAddressApi.createAddress({ fullName: form.customerName, phone: form.shippingPhone,
      address: [form.addressDetail, form.ward, form.province].filter(Boolean).join(', '),
      addressDetail: form.addressDetail, province: form.province, provinceCode: form.provinceCode,
      ward: form.ward, wardCode: form.wardCode, isDefault: addresses.length === 0 }, config);
    return '';
  } catch {
    return 'Đơn hàng đã được tạo, nhưng chưa lưu được địa chỉ. Bạn có thể thêm địa chỉ trong Sổ địa chỉ.';
  }
}

/**
 * R9-FE-001: Computes single item subtotal from snapshot.
 * Returns null if the item cannot be completely and safely determined.
 */
export const getItemSnapshotSubtotal = (item) => {
  if (!item || typeof item !== 'object') return null;

  // 1. Authoritative item-level subtotal
  if (typeof item.subtotal === 'number' && Number.isFinite(item.subtotal) && item.subtotal >= 0) {
    return item.subtotal;
  }
  if (typeof item.subtotal === 'string' && item.subtotal.trim() !== '') {
    const numSub = Number(item.subtotal);
    if (Number.isFinite(numSub) && numSub >= 0) {
      return numSub;
    }
    return null;
  }

  // 2. Compute from item.price and item.quantity
  let validPrice = null;
  if (typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0) {
    validPrice = item.price;
  } else if (typeof item.price === 'string' && item.price.trim() !== '') {
    const numPrice = Number(item.price);
    if (Number.isFinite(numPrice) && numPrice >= 0) {
      validPrice = numPrice;
    }
  }

  if (validPrice === null) {
    return null;
  }

  let validQty = null;
  if (typeof item.quantity === 'number' && Number.isInteger(item.quantity) && item.quantity > 0) {
    validQty = item.quantity;
  } else if (typeof item.quantity === 'string' && item.quantity.trim() !== '') {
    const numQty = Number(item.quantity);
    if (Number.isInteger(numQty) && numQty > 0) {
      validQty = numQty;
    }
  }

  if (validQty === null) {
    return null;
  }

  const computed = validPrice * validQty;
  return (Number.isFinite(computed) && computed >= 0) ? computed : null;
};

/**
 * R8-FE-001 & R9-FE-001: Computes the subtotal of a resumed Order strictly from its persisted snapshot.
 * Invariants:
 * 1. Authoritative order.subtotal is used if present and valid (>= 0, finite).
 * 2. Every single order item MUST be completely calculable; any incomplete item invalidates the total (NO partial sum).
 * 3. Never fall back to totalAmount, catalog price, or cart price.
 * 4. Returns null if snapshot data is missing, incomplete, or invalid.
 */
export const calculateOrderSnapshotSubtotal = (order) => {
  if (!order || typeof order !== 'object') return null;

  // 1. Authoritative order-level subtotal if present in response
  if (typeof order.subtotal === 'number' && Number.isFinite(order.subtotal) && order.subtotal >= 0) {
    return order.subtotal;
  }
  if (typeof order.subtotal === 'string' && order.subtotal.trim() !== '') {
    const numOrderSub = Number(order.subtotal);
    if (Number.isFinite(numOrderSub) && numOrderSub >= 0) {
      return numOrderSub;
    }
  }

  // 2. Authoritative item snapshot calculation: ALL items must be valid
  if (Array.isArray(order.items) && order.items.length > 0) {
    let sum = 0;
    for (const item of order.items) {
      const itemSub = getItemSnapshotSubtotal(item);
      if (itemSub === null) {
        // Incomplete snapshot: do NOT return partial sum!
        return null;
      }
      sum += itemSub;
    }
    return (Number.isFinite(sum) && sum >= 0) ? sum : null;
  }

  // 3. Fallback restriction: Missing items or incomplete snapshot must return null
  return null;
};

const CheckoutPage = () => {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { user, profile, token: checkoutToken } = useAuth();
  const checkoutOwnerRef = useRef(user?.id);
  const checkoutTokenRef = useRef(checkoutToken);
  const checkoutActiveRef = useRef(true);
  checkoutOwnerRef.current = user?.id;
  checkoutTokenRef.current = checkoutToken;
  useEffect(() => {
    checkoutActiveRef.current = true;
    return () => { checkoutActiveRef.current = false; };
  }, []);
  const [requestedPoints, setRequestedPoints] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // FIX-057: Canonical resume route check: /checkout?orderId={internalOrderId}
  const searchParams = new URLSearchParams(location.search);
  const resumeOrderIdParam = searchParams.get('orderId');
  const isResumeMode = Boolean(
    resumeOrderIdParam &&
    !isNaN(Number(resumeOrderIdParam)) &&
    Number(resumeOrderIdParam) > 0
  );
  const resumeOrderId = isResumeMode ? Number(resumeOrderIdParam) : null;

  // FIX-057: Resume Unpaid Order Mode State
  const [resumeContext, setResumeContext] = useState(null);
  const [resumeSelectedMethod, setResumeSelectedMethod] = useState(null);
  useEffect(() => {
    setResumeSelectedMethod(resumeContext?.order?.paymentMethod || null);
  }, [resumeOrderId, resumeContext?.order?.paymentMethod]);
  const [resumeLoading, setResumeLoading] = useState(isResumeMode);
  const [resumeError, setResumeError] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionError, setTransitionError] = useState('');
  const [transitionSuccess, setTransitionSuccess] = useState('');
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [requiresContextRecovery, setRequiresContextRecovery] = useState(false);
  const requiresContextRecoveryRef = useRef(false);
  const markRequiresContextRecovery = (val) => {
    requiresContextRecoveryRef.current = Boolean(val);
    setRequiresContextRecovery(Boolean(val));
  };
  const isTransitioningRef = useRef(false);
  const activeResumeOrderIdRef = useRef(resumeOrderId);
  activeResumeOrderIdRef.current = resumeOrderId;

  // Countdown timer for retryAfterSeconds
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  // FIX-057 R3: Centralized security clear helper for 401/403/404 on authoritative checkout-context
  const clearProtectedResumeState = (orderId, status, code) => {
    if (activeResumeOrderIdRef.current !== orderId) return;
    setResumeContext(null);
    clearStoredTransitionIntent(orderId);
    markRequiresContextRecovery(false);
    setRetryCountdown(0);
    setTransitionError('');
    setTransitionSuccess('');

    if (status === 401 || code === 'UNAUTHORIZED') {
      setResumeError('Vui lòng đăng nhập để tiếp tục thanh toán đơn hàng này.');
    } else if (status === 403 || code === 'NOT_ORDER_OWNER') {
      setResumeError('Bạn không có quyền truy cập đơn hàng này.');
    } else if (status === 404 || code === 'ORDER_NOT_FOUND') {
      setResumeError('Không tìm thấy đơn hàng yêu cầu.');
    } else {
      setResumeError('Bạn không có quyền truy cập đơn hàng này.');
    }
  };

  // FIX-057: Authoritative context fetcher
  const fetchResumeContext = async (orderIdToFetch) => {
    if (!orderIdToFetch) return;
    setResumeLoading(true);
    setResumeError('');
    try {
      const res = await orderApi.getCheckoutContext(orderIdToFetch);
      const data = res?.data ?? res;
      // Stale response guard
      if (activeResumeOrderIdRef.current !== orderIdToFetch) return;
      setResumeContext(data);
      markRequiresContextRecovery(false);

      // Clean up or reconcile stored intent based on authoritative backend operation
      if (data?.operation) {
        const opStatus = data.operation.status || data.operation.state;
        if (opStatus === 'APPLIED' || opStatus === 'REJECTED' || opStatus === 'NEEDS_REVIEW') {
          clearStoredTransitionIntent(orderIdToFetch);
        } else if (opStatus === 'VERIFYING') {
          if (data.operation.idempotencyKey) {
            saveTransitionIntent(
              orderIdToFetch,
              data.operation.targetPaymentMethod || 'COD',
              data.operation.expectedStateVersion,
              data.operation.idempotencyKey
            );
          }
          if (data.operation.retryAfterSeconds > 0) {
            setRetryCountdown(Number(data.operation.retryAfterSeconds));
          }
        }
      }
    } catch (err) {
      if (activeResumeOrderIdRef.current !== orderIdToFetch) return;
      const status = err.response?.status || err.status;
      const code = err.response?.data?.code || err.code;
      const msg = err.response?.data?.message || err.message;
      if (status === 401 || status === 403 || status === 404 || code === 'NOT_ORDER_OWNER' || code === 'UNAUTHORIZED' || code === 'ORDER_NOT_FOUND') {
        clearProtectedResumeState(orderIdToFetch, status, code);
      } else {
        setResumeContext(null);
        setResumeError(msg || 'Không thể tải thông tin đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
    } finally {
      if (activeResumeOrderIdRef.current === orderIdToFetch) {
        setResumeLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isResumeMode && resumeOrderId) {
      fetchResumeContext(resumeOrderId);
    } else {
      setResumeContext(null);
      setResumeLoading(false);
      setResumeError('');
      setTransitionError('');
      setTransitionSuccess('');
      setRetryCountdown(0);
      markRequiresContextRecovery(false);
    }
  }, [location.search, isResumeMode, resumeOrderId]);

  const finishResumeTransition = (data) => {
    const order = data?.order;
    if (!order || Number(order.id) !== resumeOrderId || !['COD', 'PAYOS_VIETQR'].includes(order.paymentMethod)) {
      throw new Error('Phản hồi đơn hàng không hợp lệ. Vui lòng tải lại thông tin.');
    }
    clearStoredTransitionIntent(resumeOrderId);
    markRequiresContextRecovery(false);
    const destination = order.paymentMethod === 'PAYOS_VIETQR' && order.status === 'PENDING'
      ? `/payment/qr/${resumeOrderId}` : `/order-success/${resumeOrderId}`;
    navigate(destination, { state: { order, payment: data.payment ?? null, transitioned: true } });
  };

  // FIX-057: PayOS -> COD transition & recovery mutation handler
  const handleExecuteTransition = async ({ isRecovery = false } = {}) => {
    if (isTransitioningRef.current || transitionLoading) return;
    if (!resumeContext || !resumeOrderId) return;

    // FIX-057 Lost-Response Recovery Gate: After ambiguous failure (502/503/504/timeout),
    // next retry MUST inspect backend authoritative checkout-context BEFORE sending any POST.
    if (requiresContextRecoveryRef.current || requiresContextRecovery) {
      isTransitioningRef.current = true;
      setTransitionLoading(true);
      setTransitionError('');
      setTransitionSuccess('');

      try {
        const res = await orderApi.getCheckoutContext(resumeOrderId);
        const data = res?.data ?? res;
        if (activeResumeOrderIdRef.current !== resumeOrderId) return;

        setResumeContext(data);

        const op = data?.operation;
        const opStatus = op?.status || op?.state;

        // Authoritative operation APPLIED / order already COD: do NOT POST again.
        const saved = getStoredTransitionIntent(resumeOrderId);
        const sameIntent = op?.idempotencyKey === saved?.key;
        if ((opStatus === 'APPLIED' && sameIntent) || data?.order?.paymentMethod === saved?.targetMethod) {
          clearStoredTransitionIntent(resumeOrderId);
          markRequiresContextRecovery(false);
          finishResumeTransition(data);
          return;
        }

        // Authoritative operation VERIFYING: adopt backend operation, respect retryAfterSeconds
        if (opStatus === 'VERIFYING') {
          markRequiresContextRecovery(false);
          const storedIntent = getStoredTransitionIntent(resumeOrderId);
          const origKey = op?.idempotencyKey || storedIntent?.key;
          const origVersion = op?.expectedStateVersion !== undefined
            ? Number(op.expectedStateVersion)
            : (storedIntent?.expectedStateVersion !== undefined ? Number(storedIntent.expectedStateVersion) : undefined);
          const targetMethod = op?.targetPaymentMethod || storedIntent?.targetMethod || 'COD';

          if (origKey && origVersion !== undefined) {
            saveTransitionIntent(resumeOrderId, targetMethod, origVersion, origKey);
          }

          if (op?.retryAfterSeconds > 0) {
            setRetryCountdown(Number(op.retryAfterSeconds));
          }

          setTransitionError(
            'Hệ thống đang xác minh giao dịch với cổng thanh toán... Vui lòng không thanh toán lại và bấm "Kiểm tra lại".'
          );
          return;
        }

        // Backend says NEEDS_REVIEW: do not POST again, show authoritative review state
        if (opStatus === 'NEEDS_REVIEW' || data?.payment?.status === 'NEEDS_REVIEW') {
          clearStoredTransitionIntent(resumeOrderId);
          markRequiresContextRecovery(false);
          setTransitionError('Giao dịch cần nhân viên đối soát (NEEDS_REVIEW). Không thể đổi phương thức thanh toán.');
          return;
        }

        // Backend says REJECTED or CANCELLED: terminal failure
        if ((opStatus === 'REJECTED' && sameIntent) || data?.order?.status === 'CANCELLED') {
          clearStoredTransitionIntent(resumeOrderId);
          markRequiresContextRecovery(false);
          setTransitionError('Đơn hàng không thể đổi phương thức thanh toán lúc này.');
          return;
        }

        // No durable operation found: clear recovery flag
        markRequiresContextRecovery(false);
        if (!data?.eligibility?.eligible || !data?.eligibility?.allowedMethods?.includes(resumeSelectedMethod)) {
          setTransitionError('Đơn hàng hiện không đủ điều kiện đổi phương thức thanh toán.');
          return;
        }
        return;
      } catch (err) {
        if (activeResumeOrderIdRef.current !== resumeOrderId) return;
        const status = err.response?.status || err.status;
        const code = err.response?.data?.code || err.code;
        const errMsg = err.response?.data?.message || err.message;

        // FIX-057 R3: Security invariant — 401, 403, 404 on recovery GET must clear all protected resume snapshot and controls
        if (status === 401 || status === 403 || status === 404 || code === 'NOT_ORDER_OWNER' || code === 'UNAUTHORIZED' || code === 'ORDER_NOT_FOUND') {
          clearProtectedResumeState(resumeOrderId, status, code);
          return;
        }

        // GET recovery failed for transient reasons (e.g. 500, 502, 503, 504, timeout) -> DO NOT POST! Keep intent and recovery flag for next retry
        setTransitionError(
          errMsg || 'Không thể kiểm tra trạng thái giao dịch lúc này. Giao dịch được lưu an toàn, vui lòng thử lại sau.'
        );
        return;
      } finally {
        isTransitioningRef.current = false;
        setTransitionLoading(false);
      }
    }

    const currentOp = resumeContext?.operation;
    const isRecovering = isRecovery || Boolean(
      currentOp && (currentOp.status === 'VERIFYING' || currentOp.state === 'VERIFYING')
    );

    let idempotencyKey;
    let targetPaymentMethod = resumeSelectedMethod || resumeContext.order?.paymentMethod;
    let currentVersion;

    if (isRecovering) {
      // RECOVERY PATH: Authoritative backend durable operation identity
      if (retryCountdown > 0) return;

      const storedIntent = getStoredTransitionIntent(resumeOrderId);
      idempotencyKey = currentOp?.idempotencyKey || storedIntent?.key;
      const originalVersion = currentOp?.expectedStateVersion !== undefined
        ? Number(currentOp.expectedStateVersion)
        : (storedIntent?.expectedStateVersion !== undefined ? Number(storedIntent.expectedStateVersion) : undefined);
      targetPaymentMethod = currentOp?.targetPaymentMethod || storedIntent?.targetMethod || 'COD';

      if (!idempotencyKey || originalVersion === undefined || isNaN(originalVersion)) {
        setTransitionError('Không tìm thấy thông tin định danh giao dịch cần xác minh. Vui lòng tải lại trang.');
        return;
      }

      currentVersion = originalVersion;

      // Reconcile storage to authoritative backend durable operation
      saveTransitionIntent(resumeOrderId, targetPaymentMethod, currentVersion, idempotencyKey);
    } else {
      // NEW TRANSITION PATH: Backend eligibility is mandatory
      if (targetPaymentMethod === resumeContext.order?.paymentMethod) {
        if (resumeContext.order?.status === 'PENDING' && resumeContext.payment?.status !== 'NEEDS_REVIEW'
            && !resumeContext.eligibility?.blockedReasons?.includes('PAYMENT_REQUIRES_REVIEW')) finishResumeTransition(resumeContext);
        return;
      }
      if (!resumeContext.eligibility?.eligible || !resumeContext.eligibility?.allowedMethods?.includes(targetPaymentMethod)) {
        setTransitionError('Đơn hàng hiện không đủ điều kiện đổi phương thức thanh toán.');
        return;
      }

      currentVersion = Number(resumeContext.stateVersion);
      try {
        idempotencyKey = getOrCreateTransitionKey(resumeOrderId, targetPaymentMethod, currentVersion);
      } catch {
        setTransitionError('Không thể khởi tạo mã giao dịch an toàn (Web Crypto không khả dụng). Vui lòng thử lại trên trình duyệt hiện đại.');
        return;
      }
    }

    isTransitioningRef.current = true;
    setTransitionLoading(true);
    setTransitionError('');
    setTransitionSuccess('');

    const payload = {
      targetPaymentMethod,
      expectedStateVersion: currentVersion,
    };

    try {
      const res = await orderApi.transitionPaymentMethod(resumeOrderId, payload, idempotencyKey);
      const data = res?.data ?? res;
      const status = res?.status;

      if (activeResumeOrderIdRef.current !== resumeOrderId) return;

      if (status === 202 || data?.operation?.status === 'VERIFYING' || data?.operation?.state === 'VERIFYING') {
        // 202 ACCEPTED / VERIFYING
        setTransitionSuccess('');
        setTransitionError(
          'Hệ thống đang xác minh giao dịch với cổng thanh toán... Vui lòng không thanh toán lại và bấm "Kiểm tra lại".'
        );
        if (data?.operation) {
          setResumeContext((prev) => prev ? { ...prev, operation: data.operation } : prev);
          if (data.operation.idempotencyKey) {
            saveTransitionIntent(
              resumeOrderId,
              data.operation.targetPaymentMethod || targetPaymentMethod,
              data.operation.expectedStateVersion !== undefined ? Number(data.operation.expectedStateVersion) : currentVersion,
              data.operation.idempotencyKey
            );
          }
          if (data.operation.retryAfterSeconds > 0) {
            setRetryCountdown(Number(data.operation.retryAfterSeconds));
          }
        }
      } else if (status === 200 || data?.operation?.status === 'APPLIED' || data?.operation?.state === 'APPLIED') {
        // 200 OK / APPLIED
        clearStoredTransitionIntent(resumeOrderId);
        finishResumeTransition(data);
      }
    } catch (err) {
      if (activeResumeOrderIdRef.current !== resumeOrderId) return;

      const status = err.response?.status || err.status;
      const errData = err.response?.data;
      const errCode = errData?.code || err.code;
      const errMsg = errData?.message || err.message;

      // FIX-057 R3: Authorization loss on mutation also clears protected state
      if (status === 401 || status === 403 || status === 404 || errCode === 'NOT_ORDER_OWNER' || errCode === 'UNAUTHORIZED' || errCode === 'ORDER_NOT_FOUND') {
        clearProtectedResumeState(resumeOrderId, status, errCode);
        return;
      }

      if (status === 409) {
        if (errCode === 'STALE_ORDER_STATE') {
          setTransitionError('Trạng thái đơn hàng đã thay đổi. Đang tải lại dữ liệu mới nhất...');
          fetchResumeContext(resumeOrderId);
        } else if (errCode === 'PAYMENT_ALREADY_SETTLED') {
          setTransitionError('Đơn hàng đã được thanh toán thành công qua cổng thanh toán!');
          fetchResumeContext(resumeOrderId);
        } else if (errCode === 'PAYMENT_REQUIRES_REVIEW') {
          setTransitionError('Giao dịch cần nhân viên đối soát (NEEDS_REVIEW). Không thể đổi phương thức thanh toán.');
          fetchResumeContext(resumeOrderId);
        } else if (errCode === 'IDEMPOTENCY_CONFLICT') {
          clearStoredTransitionIntent(resumeOrderId);
          setTransitionError(errMsg || 'Xung đột mã giao dịch. Vui lòng bấm thử lại.');
          fetchResumeContext(resumeOrderId);
        } else {
          setTransitionError(errMsg || 'Đơn hàng không thể đổi phương thức thanh toán lúc này.');
          fetchResumeContext(resumeOrderId);
        }
      } else if (status === 502 || status === 503 || status === 504 || !status) {
        // Network timeout / gateway unavailable: preserve idempotency intent for safe retry
        saveTransitionIntent(resumeOrderId, targetPaymentMethod, currentVersion, idempotencyKey);
        markRequiresContextRecovery(true);
        setTransitionError(
          errMsg || 'Cổng thanh toán phản hồi chậm hoặc tạm gián đoạn. Giao dịch được lưu an toàn, vui lòng bấm "Kiểm tra lại".'
        );
      } else {
        setTransitionError(errMsg || 'Không thể đổi phương thức thanh toán. Vui lòng thử lại.');
      }
    } finally {
      isTransitioningRef.current = false;
      setTransitionLoading(false);
    }
  };

  const handleConfirmResumePayment = () => handleExecuteTransition({ isRecovery: false });
  const handleRecoverTransition = () => handleExecuteTransition({ isRecovery: true });

  const activeOp = resumeContext?.operation;
  const isVerifyingOperation = Boolean(
    activeOp &&
    (activeOp.status === 'VERIFYING' || activeOp.state === 'VERIFYING')
  );

  // Selected items from CartPage if any (for NEW_CHECKOUT mode)
  const locationState = location.state || {};
  const selectedItemIds = locationState.selectedItemIds || cart.map((i) => i.cartItemId || i.product.id);
  const checkoutItems = cart.filter((i) => selectedItemIds.includes(i.cartItemId || i.product.id));

  // Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Form Fields
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [province, setProvince] = useState('');
  const [ward, setWard] = useState('');
  const [provinceCode, setProvinceCode] = useState(''), [wardCode, setWardCode] = useState('');
  const chooseAddress = value => {
    if (isSubmittingRef.current || pendingSubmissionRef.current) return;
    setProvinceCode(value.provinceCode); setWardCode(value.wardCode); setProvince(value.province); setWard(value.ward);
  };
  const [addressDetail, setAddressDetail] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [saveInfo, setSaveInfo] = useState(true);

  // COD remains the default; customers can choose dynamic PayOS QR.
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // Voucher state
  const [voucherCode, setVoucherCode] = useState(locationState.voucherCode || sessionStorage.getItem('hg_voucher_code') || '');


  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Idempotency & submit guard (FIX-018)
  const isSubmittingRef = useRef(false);
  const [pendingSubmission, setPendingSubmission] = useState(() => readPendingCheckoutSubmission(user?.id));
  const pendingSubmissionRef = useRef(pendingSubmission);
  const currentCartRef = useRef(cart);
  currentCartRef.current = cart;
  const submissionLocked = loading || Boolean(pendingSubmission);

  useEffect(() => {
    const saved = pendingSubmission?.form;
    if (!saved) return;
    setCustomerName(saved.customerName || ''); setShippingPhone(saved.shippingPhone || '');
    setAddressDetail(saved.addressDetail || ''); setProvince(saved.province || ''); setWard(saved.ward || '');
    setProvinceCode(saved.provinceCode || ''); setWardCode(saved.wardCode || '');
    setEmail(saved.email || ''); setPaymentMethod(saved.paymentMethod || 'COD');
    setVoucherCode(saved.voucherCode || ''); setNote(saved.note || '');
    setRequestedPoints(saved.requestedPoints || 0); setSaveInfo(saved.saveInfo !== false);
  }, [pendingSubmission]);

  // Load saved shipping addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await shippingAddressApi.getMyAddresses();
        const addrs = Array.isArray(res) ? res : res?.data || [];
        setSavedAddresses(addrs);
        if (isSubmittingRef.current || pendingSubmissionRef.current) return;

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          if (defaultAddr.fullName) setCustomerName(defaultAddr.fullName);
          if (defaultAddr.phone) setShippingPhone(defaultAddr.phone);
          if (defaultAddr.province) setProvince(defaultAddr.province);
          if (defaultAddr.ward) setWard(defaultAddr.ward);
          setProvinceCode(defaultAddr.provinceCode || ''); setWardCode(defaultAddr.wardCode || '');
          if (defaultAddr.address) setAddressDetail(defaultAddr.addressDetail || defaultAddr.address);
          if (!defaultAddr.addressDetail) { setProvince(''); setWard(''); }
        }
      } catch (err) {
        // quiet fallback
      }
    };
    fetchAddresses();
  }, []);

  // Financial Calculations
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  );
  const isFreeShipping = subtotal >= 1000000;
  const baseShippingFee = subtotal === 0 || isFreeShipping ? 0 : 30000;
  const voucher = useCheckoutVoucher(voucherCode, subtotal,
    JSON.stringify(checkoutItems.map(item => [item.cartItemId, item.quantity, item.product.price])), checkoutItems);
  const { discountAmount, shippingDiscountAmount = 0, finalShippingFee = baseShippingFee,
    error: voucherError, success: voucherSuccess, validating: isValidatingVoucher, apply: handleApplyVoucher } = voucher;
  const shippingFee = finalShippingFee;
  const effectiveDiscount = subtotal > 0 ? Math.min(subtotal, discountAmount) : 0;
  const maximumPoints = Math.min(Number(profile?.loyaltyPoints) || 0, Math.floor((subtotal - effectiveDiscount) / 1000));
  const redeemPoints = Math.min(Math.max(0, requestedPoints), maximumPoints);
  const pointsDiscount = redeemPoints * 100;
  const finalTotal = Math.max(0, subtotal - effectiveDiscount - pointsDiscount + shippingFee);
  const displayItems = pendingSubmission?.displayItems || checkoutItems;
  const orderSummary = pendingSubmission?.form?.totals || { subtotal, effectiveDiscount, shippingDiscountAmount, pointsDiscount, shippingFee, finalTotal, redeemPoints };
  const displayedShippingFee = orderSummary.shippingFee + (orderSummary.shippingDiscountAmount || 0);

  // Live order payload and canonical fingerprint (continuously updated on every render)
  const currentPayload = buildOrderPayload({
    customerName,
    addressDetail,
    ward,
    province,
    shippingPhone,
    paymentMethod,
    voucherCode,
    note,
    checkoutItems,
    redeemPoints,
  });
  const validateNewCheckout = () => {
    if (!['COD', 'PAYOS_VIETQR'].includes(paymentMethod)) {
      return 'Vui lòng chọn thanh toán COD hoặc QR PayOS/VietQR.';
    }
    if (voucherCode.trim() && !voucherSuccess) {
      return 'Vui lòng áp dụng lại mã giảm giá hoặc xóa mã trước khi đặt hàng.';
    }
    if (!customerName || !shippingPhone || !addressDetail || !provinceCode || !wardCode) {
      return 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng.';
    }
    return checkoutItems.length ? '' : 'Không có sản phẩm nào được chọn để thanh toán.';
  };

  const captureCheckoutSubmission = () => createCheckoutSubmission(user?.id, currentPayload, checkoutItems,
    { customerName, shippingPhone, addressDetail, province, ward, provinceCode, wardCode, email,
      paymentMethod, voucherCode, note, requestedPoints, saveInfo,
      totals: { subtotal, effectiveDiscount, shippingDiscountAmount, pointsDiscount, shippingFee, finalTotal, redeemPoints } });

  const prepareOrderPayment = async (orderId, config) => {
    try {
      const response = await orderApi.createPaymentLink(orderId, getOrCreatePaymentLinkKey(orderId), config);
      return { payment: response?.data ?? response, paymentError: null };
    } catch (error) {
      return { payment: null, paymentError: error.response?.data?.message || 'Chưa thể chuẩn bị liên kết thanh toán. Vui lòng kiểm tra lại.' };
    }
  };

  const clearCurrentSubmission = () => {
    clearPendingCheckoutSubmission(user?.id); clearStoredCheckoutIntent();
    pendingSubmissionRef.current = null; setPendingSubmission(null);
  };

  const consumeSubmittedCart = snapshot => {
    submittedCartUpdates(currentCartRef.current, snapshot.lines).forEach(line => {
      if (line.quantity === 0) removeFromCart(line.id); else updateQuantity(line.id, line.quantity);
    });
  };

  const acceptCreatedOrder = async (createdOrder, snapshot) => {
    const token = checkoutTokenRef.current;
    const isActive = () => checkoutMayProceed(snapshot, checkoutOwnerRef.current, checkoutActiveRef.current)
      && (!token || globalThis.localStorage?.getItem('token') === token);
    if (!isActive()) return;
    if (!createdOrder?.id) throw new Error('Máy chủ chưa trả về mã đơn hàng hợp lệ.');
    const addressConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    if (createdOrder.status !== 'CANCELLED') consumeSubmittedCart(snapshot);
    sessionStorage.removeItem('hg_voucher_code');
    const method = createdOrder.paymentMethod || snapshot.payload.paymentMethod;
    const paymentState = method === 'COD' || createdOrder.status === 'CANCELLED' ? {} : await prepareOrderPayment(createdOrder.id, addressConfig);
    if (!isActive()) return;
    const addressSaveWarning = createdOrder.status === 'CANCELLED' ? ''
      : await saveCheckoutAddress(snapshot, addressConfig, isActive);
    if (!isActive()) return;
    const path = createdOrder.status === 'CANCELLED' ? `/orders/${createdOrder.id}`
      : method === 'COD' ? `/order-success/${createdOrder.id}` : `/payment/qr/${createdOrder.id}`;
    navigate(path, { state: { order: createdOrder, ...paymentState, addressSaveWarning } });
    clearCurrentSubmission();
  };

  const handleSubmissionFailure = error => {
    const status = error.response?.status;
    const definitive = [400, 403, 404, 422].includes(status);
    if (definitive) clearCurrentSubmission();
    const message = error.response?.data?.message;
    setErrorMsg(typeof message === 'string' ? message : definitive
      ? 'Yêu cầu chưa được chấp nhận. Vui lòng kiểm tra thông tin trước khi gửi lại.'
      : 'Chưa xác nhận được kết quả đặt hàng. Yêu cầu và giỏ hàng được giữ nguyên; bấm kiểm tra lại để tránh tạo trùng đơn.');
  };

  const submitCheckoutSnapshot = async snapshot => {
    isSubmittingRef.current = true; setLoading(true); setErrorMsg('');
    try {
      const token = checkoutTokenRef.current;
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await orderApi.createOrder(snapshot.payload, snapshot.key, config);
      await acceptCreatedOrder(response?.data ?? response, snapshot);
    } catch (error) { handleSubmissionFailure(error); }
    finally {
      isSubmittingRef.current = false; setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (isSubmittingRef.current || loading) return;
    const pending = pendingSubmissionRef.current;
    if (pending?.invalid) { setErrorMsg('Yêu cầu trước không đọc được. Hãy kiểm tra Lịch sử đơn hàng hoặc liên hệ cửa hàng; chưa tạo đơn mới.'); return; }
    if (!pending && isValidatingVoucher) return;
    const validationError = pending ? '' : validateNewCheckout();
    if (validationError) { setErrorMsg(validationError); return; }
    let snapshot;
    try {
      snapshot = pending || captureCheckoutSubmission();
      pendingSubmissionRef.current = snapshot; setPendingSubmission(snapshot);
    } catch (error) {
      setErrorMsg(error.message?.includes('random') ? 'Không thể khởi tạo mã giao dịch an toàn (Web Crypto không khả dụng).'
        : error.message || 'Không lưu được yêu cầu đặt hàng an toàn. Vui lòng kiểm tra trình duyệt.');
      return;
    }
    await submitCheckoutSnapshot(snapshot);
  };

  // FIX-057: Render RESUME_UNPAID_ORDER Mode
  if (isResumeMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stepper Header */}
          <div className="hidden md:flex items-center justify-center mb-6">
            <nav className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <Link to="/cart" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-700">Giỏ hàng</span>
              </Link>
              <div className="h-[2px] w-12 bg-red-600"></div>
              <div className="flex items-center gap-2 text-slate-900">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs ring-2 ring-red-500/30">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-extrabold text-slate-900">Tiếp tục thanh toán</span>
              </div>
              <div className="h-[2px] w-12 bg-slate-200"></div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
                  3
                </div>
                <span>Hoàn tất</span>
              </div>
            </nav>
          </div>

          {/* Top Breadcrumb */}
          <div className="flex items-center justify-between pb-6">
            <Link
              to="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Quay lại giỏ hàng</span>
            </Link>
            {!resumeError && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-slate-600 text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Đang xử lý đơn hàng #HG-{resumeOrderId}</span>
              </div>
            )}
          </div>

          {/* Loading State */}
          {resumeLoading && (
            <div data-testid="resume-loading-state" className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-3" />
              <p className="text-sm font-bold text-slate-700">Đang tải thông tin đơn hàng #HG-{resumeOrderId}...</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
            </div>
          )}

          {/* Error State */}
          {!resumeLoading && resumeError && (
            <div data-testid="resume-error-state" className="max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Không thể tải thông tin đơn hàng #HG-{resumeOrderId}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{resumeError}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => fetchResumeContext(resumeOrderId)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                >
                  Thử lại
                </button>
                <Link
                  to="/cart"
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Quay lại giỏ hàng
                </Link>
              </div>
            </div>
          )}

          {/* Success Loaded Resume UI */}
          {!resumeLoading && !resumeError && resumeContext && (
            <div className="flex flex-col gap-6">
              <div data-testid="resume-order-banner" className="text-sm text-slate-600">
                Đang tiếp tục đơn hàng <strong className="text-slate-900">#HG-{resumeContext.order?.id}</strong>.
                Thông tin và tổng tiền đã được giữ nguyên.
              </div>

              {/* Transition Error or Success Alert */}
              {transitionError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transitionError}</span>
                </div>
              )}

              {transitionSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{transitionSuccess}</span>
                </div>
              )}

              {/* 2-Column Resume Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Shipping Snapshot & Payment Options (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">

                  {/* Shipping Info Snapshot (Read-only) */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Thông tin nhận hàng</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Thông tin đã lưu theo đơn hàng; chỉ thay đổi phương thức thanh toán</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                        Chỉ đọc
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <label className="text-xs font-bold text-slate-700">Họ và tên người nhận
                        <input readOnly value={resumeContext.order?.customerName || ''} className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-normal" />
                      </label>
                      <label className="text-xs font-bold text-slate-700">Số điện thoại
                        <input readOnly value={resumeContext.order?.shippingPhone || ''} className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-normal" />
                      </label>
                      <label className="sm:col-span-2 text-xs font-bold text-slate-700">Địa chỉ giao hàng
                        <textarea readOnly rows={2} value={resumeContext.order?.shippingAddress ||
                          [resumeContext.order?.addressDetail, resumeContext.order?.ward, resumeContext.order?.province].filter(Boolean).join(', ')}
                          className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-normal resize-none" />
                      </label>
                      <label className="sm:col-span-2 text-xs font-bold text-slate-700">Ghi chú kỹ thuật & giao nhận
                        <textarea readOnly rows={3} value={resumeContext.order?.note || ''} className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-normal resize-none" />
                      </label>
                    </div>
                  </section>

                  {/* Payment Method & Transition Options */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Phương thức thanh toán</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Chọn kênh giao dịch thuận tiện và được bảo toàn an toàn</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                        Xử lý an toàn
                      </span>
                    </div>

                    <fieldset disabled={transitionLoading || isVerifyingOperation || requiresContextRecovery} className="flex flex-col gap-3" aria-label="Chọn phương thức thanh toán">
                      {[
                        ['PAYOS_VIETQR', 'Thanh toán QR Động (PayOS / VietQR)', 'Mã QR được tạo theo số tiền của đơn hàng. Trạng thái thanh toán được xác nhận từ PayOS.'],
                        ['MANUAL', 'Chuyển khoản thủ công — chưa hỗ trợ', 'Vui lòng chọn COD hoặc PayOS.'],
                        ['COD', 'Thanh toán khi nhận hàng (COD)', 'Nhận hàng và thanh toán tiền mặt cho shipper.'],
                      ].map(([method, label, description]) => {
                        const current = method === resumeContext.order?.paymentMethod;
                        const allowed = method !== 'MANUAL' && resumeContext.order?.status === 'PENDING'
                          && resumeContext.payment?.status !== 'PAID' && resumeContext.payment?.status !== 'NEEDS_REVIEW'
                          && (current || (resumeContext.eligibility?.eligible && resumeContext.eligibility?.allowedMethods?.includes(method)));
                        return <label key={method} className={`p-4 rounded-xl border-2 flex items-start gap-3 ${resumeSelectedMethod === method ? 'border-red-600 bg-red-50/20' : 'border-slate-200'} ${allowed ? 'cursor-pointer' : 'opacity-60'}`}>
                          <input type="radio" name="resume_payment_method" data-testid={`resume-method-${method}`} checked={(resumeSelectedMethod || resumeContext.order?.paymentMethod) === method}
                            disabled={!allowed} onChange={() => setResumeSelectedMethod(method)} className="accent-red-600 mt-1 shrink-0" />
                          <span><span className="text-sm font-bold text-slate-900">{label}</span>
                            {current && <span className="ml-2 text-[10px] text-slate-500">Hiện tại</span>}
                            <span className="block text-xs text-slate-500 mt-1 leading-relaxed">{description}</span></span>
                        </label>;
                      })}
                    </fieldset>
                    {isVerifyingOperation || requiresContextRecovery ? (
                      <div data-testid="verifying-recovery-section" className="p-4 bg-amber-50 rounded-xl text-sm text-amber-900">
                        <p>Đang xác minh thay đổi phương thức thanh toán. Đơn hàng và thông tin của bạn vẫn được giữ nguyên.</p>
                        <button type="button" data-testid="recover-transition-btn" onClick={handleRecoverTransition}
                          disabled={transitionLoading || retryCountdown > 0} className="mt-3 w-full py-3 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-50">
                          {retryCountdown > 0 ? `Kiểm tra lại (${retryCountdown}s)` : 'Kiểm tra lại'}
                        </button>
                      </div>
                    ) : resumeContext.order?.status === 'PENDING' && resumeContext.payment?.status !== 'PAID'
                        && resumeContext.payment?.status !== 'NEEDS_REVIEW'
                        && (resumeContext.eligibility?.eligible || resumeContext.eligibility?.allowedMethods?.includes('PAYOS_VIETQR')) ? (
                      <button type="button" data-testid="switch-to-cod-btn" onClick={handleConfirmResumePayment} disabled={transitionLoading || !resumeSelectedMethod}
                        className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                        {transitionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {transitionLoading ? 'Đang xử lý...' : 'Xác nhận phương thức thanh toán'}
                      </button>
                    ) : <p className="text-sm text-amber-800" role="status">Không thể đổi phương thức thanh toán: {
                      resumeContext.payment?.status === 'PAID' ? 'Đơn đã được thanh toán.' :
                      resumeContext.order?.status === 'CANCELLED' ? 'Đơn hàng đã bị hủy.' :
                      resumeContext.payment?.status === 'CREATING' ? 'Liên kết thanh toán đang được khởi tạo.' :
                      resumeContext.eligibility?.blockedReasons?.includes('PAYMENT_TRANSITION_LIMIT_REACHED') ? 'Đơn đã sử dụng lượt đổi từ COD sang PayOS.' :
                      resumeContext.eligibility?.blockedReasons?.includes('MOCK_TRANSITION_UNSUPPORTED') ? 'Chiều chuyển này chưa hỗ trợ trong môi trường mô phỏng.' :
                      'Đơn chưa đủ điều kiện hoặc cần nhân viên kiểm tra giao dịch.'}</p>}
                  </section>

                </div>

                {/* RIGHT COLUMN: Order Items Snapshot & Totals (5 cols) */}
                <aside className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4">

                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-red-600" />
                        <h3 className="text-base font-extrabold text-slate-900">
                          Sản phẩm đơn #HG-{resumeContext.order?.id} ({resumeContext.order?.items?.length || 0})
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {resumeContext.order?.paymentMode === 'MOCK' && (
                          <span
                            data-testid="mock-order-badge"
                            className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
                          >
                            MOCK
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Snapshot
                        </span>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                      {resumeContext.order?.items?.map((item, idx) => {
                        const itemName = item.productName || item.product?.name || `Sản phẩm #${item.productId || idx + 1}`;
                        const itemImg = item.productImageUrl || item.product?.imageUrl || item.product?.image;
                        const itemPrice = item.price || 0; // SNAPSHOT price from orderItem
                        return (
                          <div key={item.id || idx} className="py-3 flex gap-3 items-start">
                            <div className="w-16 h-16 rounded-xl bg-slate-50 shrink-0 overflow-hidden relative flex items-center justify-center p-1 border border-slate-100">
                              {itemImg ? (
                                <img
                                  src={productImageSource(itemImg)}
                                  alt={itemName}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ShoppingBag className="w-6 h-6 text-slate-300" />
                              )}
                              <span className="absolute bottom-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-md">
                                x{item.quantity}
                              </span>
                            </div>
                            <div className="flex flex-col flex-1 min-w-0 gap-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                  {itemName}
                                </h4>
                                <span className="text-xs font-black text-red-600 shrink-0">
                                  {formatPrice(itemPrice * item.quantity)}
                                </span>
                              </div>
                              <OrderItemOptions item={item} />
                              <span className="text-[11px] text-slate-400 font-medium">
                                Đơn giá: {formatPrice(itemPrice)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                      Điểm và giảm giá đã được lưu khi tạo đơn. Không thể thay đổi trong bước tiếp tục thanh toán.
                    </p>

              {/* Cost Breakdown */}
                    {(() => {
                      const resumedSubtotal = calculateOrderSnapshotSubtotal(resumeContext.order);
                      return (
                        <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-2 text-xs text-slate-600 border border-slate-200/60">
                          <div className="flex justify-between">
                            <span>Tạm tính</span>
                            <span className="font-bold text-slate-900" data-testid="resume-subtotal">
                              {resumedSubtotal !== null ? formatPrice(resumedSubtotal) : '—'}
                            </span>
                          </div>
                          {(resumeContext.order?.discountAmount > 0) && (
                            <div className="flex justify-between text-red-600 font-semibold" data-testid="resume-discount">
                              <span>Giảm giá Voucher HG</span>
                              <span>-{formatPrice(resumeContext.order?.discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Phí vận chuyển</span>
                            <span className="text-emerald-600 font-bold" data-testid="resume-shipping">
                              {resumeContext.order?.shippingFee === 0 || !resumeContext.order?.shippingFee
                                ? '0₫ (Miễn phí)'
                                : formatPrice(resumeContext.order?.shippingFee)}
                            </span>
                          </div>
                          <div className="flex justify-between text-red-600" data-testid="resume-points">
                            <span>Đổi {resumeContext.order?.pointsUsed ?? '—'} điểm</span>
                            <span>{resumeContext.order?.pointsDiscount != null ? `-${formatPrice(resumeContext.order.pointsDiscount)}` : '—'}</span>
                          </div>
                <div className="h-px bg-slate-200 my-1"></div>
                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-sm font-black text-slate-900">Tổng thanh toán</span>
                            <span className="text-xl font-black text-red-600 tracking-tight" data-testid="resume-total">
                              {formatPrice(resumeContext.order?.totalAmount || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Trust badges */}
                    <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Kiểm tra mẫu và biến thể trước khi đặt hàng</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Phí giao hàng 30.000đ; miễn phí từ 1.000.000đ tiền hàng</span>
                      </div>
                    </div>

                  </div>
                </aside>

              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Stepper Header */}
        <div className="hidden md:flex items-center justify-center mb-6">
          <nav className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <Link to="/cart" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-700">Giỏ hàng</span>
            </Link>
            <div className="h-[2px] w-12 bg-red-600"></div>
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs ring-2 ring-red-500/30">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">Thanh toán</span>
            </div>
            <div className="h-[2px] w-12 bg-slate-200"></div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
                3
              </div>
              <span>Hoàn tất</span>
            </div>
          </nav>
        </div>

        {/* Top Breadcrumb & Reservation Timer */}
        <div className="flex items-center justify-between pb-6">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Quay lại giỏ hàng</span>
          </Link>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-slate-600 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Tồn kho được kiểm tra khi tạo đơn</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {pendingSubmission && !loading && <div role="status" className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-2">
          <p>{pendingSubmission.invalid ? 'Dữ liệu yêu cầu trước không hợp lệ. Chưa tạo đơn mới để tránh trùng đơn.'
            : 'Đang giữ yêu cầu đặt hàng trước. Thông tin được khóa; bấm kiểm tra lại để nhận kết quả từ máy chủ bằng cùng mã yêu cầu.'}</p>
          <Link to="/my-orders" className="font-bold underline">Kiểm tra lịch sử đơn hàng</Link>
        </div>}

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Customer & Delivery + Payment (~60% / 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <fieldset disabled={submissionLocked} aria-busy={loading} className="min-w-0 flex flex-col gap-6">
            
            {/* SECTION 1: Customer & Delivery Info */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Thông tin giao hàng</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Vui lòng điền địa chỉ để nhận hàng chính xác và nhanh nhất</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  Bước 1/2
                </span>
              </div>

              <div className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                {/* Phone & Email (2-col grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        placeholder="0988 123 456"
                        className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email liên hệ của tài khoản
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        placeholder="nguyenvana@gmail.com"
                        className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Chưa hỗ trợ gửi email xác nhận tự động.</p>
                  </div>
                </div>

                <AdministrativeAddressFields {...{ provinceCode, wardCode }} onChange={chooseAddress} />
                {selectedAddressId && !savedAddresses.find(a => a.id === selectedAddressId)?.addressDetail && <p className="text-xs text-amber-700">Địa chỉ cũ vẫn được giữ. Hãy chọn tỉnh và phường/xã hiện hành, kiểm tra địa chỉ chi tiết trước khi đặt đơn mới.</p>}

                {/* Detailed Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ cụ thể (Số nhà, ngõ ngách, tên đường...) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Số 182 Lê Duẩn, Phường Khâm Thiên"
                    className="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                {/* Technical Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ghi chú kỹ thuật & giao nhận
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      Khuyên dùng cho đơn căng cước
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Căng cước 11kg theo chuẩn Yonex 4 nút trước khi gửi, bọc kỹ quấn cán, gọi điện hẹn giờ trước khi giao..."
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>

                {/* Save info checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Lưu thông tin giao nhận cho lần đặt hàng thi đấu kế tiếp
                  </span>
                </label>
              </div>
            </section>

            {/* SECTION 2: Payment Methods */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Phương thức thanh toán</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Chọn kênh giao dịch thuận tiện và được bảo chứng an toàn</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  Bước 2/2
                </span>
              </div>

              <div className="flex flex-col gap-3">
                
                {/* OPTION 1: Dynamic PayOS QR */}
                <div
                  onClick={() => !submissionLocked && setPaymentMethod('PAYOS_VIETQR')}
                  className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col gap-3 ${paymentMethod === 'PAYOS_VIETQR' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="PAYOS_VIETQR"
                        checked={paymentMethod === 'PAYOS_VIETQR'}
                        onChange={() => setPaymentMethod('PAYOS_VIETQR')}
                        aria-label="Thanh toán QR Động (PayOS / VietQR)"
                        className="w-4 h-4 accent-red-600 mt-1 cursor-pointer"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">
                            Thanh toán QR Động (PayOS / VietQR)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            QR theo đơn hàng
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Mã QR được tạo theo số tiền của đơn hàng. Trạng thái thanh toán được xác nhận từ PayOS.
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0 opacity-60">
                      <QrCode className="w-4 h-4 text-slate-500" />
                      <span className="text-[11px] font-black text-slate-500 tracking-tight">VIET<span className="text-slate-400">QR</span></span>
                    </div>
                  </div>
                </div>

                {/* OPTION 2: Manual Bank Transfer */}
                <label
                  aria-disabled="true"
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    paymentMethod === 'MANUAL_BANK'
                      ? 'border-red-600 bg-red-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        disabled
                        checked={false}
                        className="w-4 h-4 accent-red-600 mt-1 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">
                          Chuyển khoản thủ công — chưa hỗ trợ
                        </span>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Chưa hỗ trợ phương thức này. Vui lòng chọn COD hoặc PayOS khi đã được tích hợp.
                        </p>
                      </div>
                    </div>
                    <Building className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </label>

                {/* OPTION 3: Cash On Delivery (COD) */}
                <label
                  onClick={() => !submissionLocked && setPaymentMethod('COD')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    paymentMethod === 'COD'
                      ? 'border-red-600 bg-red-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="w-4 h-4 accent-red-600 mt-1 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            Thanh toán khi nhận hàng (COD)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Đồng kiểm
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Nhận hàng, kiểm tra tem niêm phong và ngoại quan vợt trước khi thanh toán tiền mặt cho shipper.
                        </p>
                      </div>
                    </div>
                    <Truck className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </label>

              </div>
            </section>
            </fieldset>

            {/* Main Primary CTA Button */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={loading || pendingSubmission?.invalid || (!pendingSubmission && isValidatingVoucher)}
                className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-base uppercase tracking-wider rounded-xl shadow-xl shadow-red-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>ĐANG KHỞI TẠO ĐƠN HÀNG...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>{pendingSubmission ? 'KIỂM TRA LẠI YÊU CẦU ĐẶT HÀNG' : `ĐẶT HÀNG NGAY (${formatPrice(finalTotal)})`}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 px-1 text-xs text-slate-400">
                <p>
                  Bằng cách nhấn Đặt hàng, bạn đồng ý với <span className="text-blue-600 hover:underline cursor-pointer">Điều khoản mua hàng</span> và <span className="text-blue-600 hover:underline cursor-pointer">Chính sách bảo mật</span> của HG Badminton.
                </p>
                <div className="flex items-center gap-1 shrink-0 text-slate-600 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Xác minh thanh toán từ máy chủ</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Order Summary (~40% / 5 cols) */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4">
              
              {/* Summary Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Đơn hàng của bạn ({displayItems.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)
                  </h3>
                </div>
                <Link
                  to="/cart"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Sửa</span>
                  <Edit3 className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {displayItems.map((item) => {
                  const itemId = item.cartItemId || item.product.id;
                  const itemPrice = item.product.price || 0;
                  return (
                    <div key={itemId} className="py-3 flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 shrink-0 overflow-hidden relative flex items-center justify-center p-1 border border-slate-100">
                        <img
                          src={productImageSource(item.product.imageUrl || item.product.image)}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-md">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {item.product.name}
                          </h4>
                          <span className="text-xs font-black text-red-600 shrink-0">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 font-semibold">
                          {item.selectedWeight && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.selectedWeight}</span>}
                          {item.selectedSize && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Size {item.selectedSize}</span>}
                          {item.selectedColor && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.selectedColor}</span>}
                          {item.stringingService && item.stringingService !== 'none' && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                              Căng: {item.stringingService}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Voucher Input & Applied Box */}
              <div className="pt-2 flex flex-col gap-2">
                <form onSubmit={event => { if (submissionLocked) event.preventDefault(); else handleApplyVoucher(event); }} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={voucherCode}
                      disabled={submissionLocked}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Mã giảm giá"
                      className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl text-xs font-bold uppercase text-slate-800 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submissionLocked || isValidatingVoucher}
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
                  >
                    Áp dụng
                  </button>
                </form>

                {voucherSuccess && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 text-red-600 font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{voucherSuccess}</span>
                    </div>
                    <span className="text-red-600 font-extrabold">-{formatPrice(shippingDiscountAmount || effectiveDiscount)}</span>
                  </div>
                )}
                {voucherError && (
                  <p className="text-[11px] font-semibold text-red-600">{voucherError}</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-3 text-xs space-y-2">
                <label htmlFor="redeem-points" className="font-bold text-slate-900">Dùng điểm tích lũy</label>
                <p>Khả dụng: {profile?.loyaltyPoints ?? 0} điểm. 1 điểm = 100 đồng; tối đa 10% tiền hàng sau voucher.</p>
                <input id="redeem-points" type="number" min="0" max={maximumPoints} step="1" value={redeemPoints}
                  disabled={submissionLocked || maximumPoints === 0 || isValidatingVoucher}
                  onChange={event => setRequestedPoints(Math.min(maximumPoints, Math.max(0, Math.trunc(Number(event.target.value) || 0))))}
                  className="w-full rounded-lg border p-2" />
              </div>

              {/* Cost Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-2 text-xs text-slate-600 border border-slate-200/60">
                <div className="flex justify-between">
                  <span>Tạm tính ({displayItems.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)</span>
                  <span className="font-bold text-slate-900">{formatPrice(orderSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Giảm tiền hàng Voucher HG</span>
                  <span>-{formatPrice(orderSummary.effectiveDiscount)}</span>
                </div>
                {orderSummary.shippingDiscountAmount > 0 && <div className="flex justify-between text-red-600 font-semibold">
                  <span>Giảm phí vận chuyển Voucher HG</span><span>-{formatPrice(orderSummary.shippingDiscountAmount)}</span>
                </div>}
                {orderSummary.pointsDiscount > 0 && <div className="flex justify-between text-red-600 font-semibold">
                  <span>Đổi điểm ({orderSummary.redeemPoints} điểm)</span><span>-{formatPrice(orderSummary.pointsDiscount)}</span>
                </div>}
                <div className="flex justify-between">
                  <span>{orderSummary.shippingDiscountAmount > 0 ? 'Phí vận chuyển trước ưu đãi' : 'Phí vận chuyển'}</span>
                  <span className="text-emerald-600 font-bold">
                    {displayedShippingFee === 0 ? '0₫ (Miễn phí)' : formatPrice(displayedShippingFee)}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-black text-slate-900">Tổng thanh toán</span>
                  <span className="text-xl font-black text-red-600 tracking-tight">
                    {formatPrice(orderSummary.finalTotal)}
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kiểm tra mẫu và biến thể trước khi đặt hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Phí giao hàng 30.000đ; miễn phí từ 1.000.000đ tiền hàng</span>
                </div>
              </div>

            </div>
          </aside>

        </div>

      </div>
    </div>
  );
};

export default CheckoutPage;
