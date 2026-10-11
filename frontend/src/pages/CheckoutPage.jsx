import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import OrderItemOptions from '../components/OrderItemOptions';
import { voucherApi } from '../api/voucherApi';
import { shippingAddressApi } from '../api/shippingAddressApi';
import { formatPrice } from '../utils/formatters';
import {
  buildOrderPayload,
  isResponseStale,
  canonicalStringify,
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
  const { cart, removeFromCart } = useCart();
  const { user } = useAuth();
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
        if (opStatus === 'APPLIED' || data?.order?.paymentMethod === 'COD') {
          clearStoredTransitionIntent(resumeOrderId);
          markRequiresContextRecovery(false);
          const updatedOrder = data?.order || { ...(resumeContext.order || {}), paymentMethod: 'COD' };
          setTransitionSuccess('Đã chuyển sang phương thức Thanh toán khi nhận hàng (COD) thành công!');
          navigate(`/order-success/${resumeOrderId}`, {
            state: { order: updatedOrder, transitioned: true },
          });
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
          setTransitionError('Giao dịch cần nhân viên đối soát (NEEDS_REVIEW). Không thể đổi sang COD.');
          return;
        }

        // Backend says REJECTED or CANCELLED: terminal failure
        if (opStatus === 'REJECTED' || data?.order?.status === 'CANCELLED') {
          clearStoredTransitionIntent(resumeOrderId);
          markRequiresContextRecovery(false);
          setTransitionError('Đơn hàng không thể đổi phương thức thanh toán lúc này.');
          return;
        }

        // No durable operation found: clear recovery flag
        markRequiresContextRecovery(false);
        if (!data?.eligibility?.eligible || !data?.eligibility?.allowedMethods?.includes('COD')) {
          setTransitionError('Đơn hàng hiện không đủ điều kiện đổi sang phương thức COD.');
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
    let targetPaymentMethod = 'COD';
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
      if (!resumeContext.eligibility?.eligible || !resumeContext.eligibility?.allowedMethods?.includes('COD')) {
        setTransitionError('Đơn hàng hiện không đủ điều kiện đổi sang phương thức COD.');
        return;
      }

      currentVersion = Number(resumeContext.stateVersion);
      try {
        idempotencyKey = getOrCreateTransitionKey(resumeOrderId, 'COD', currentVersion);
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
      targetPaymentMethod: 'COD',
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
        const updatedOrder = data?.order || { ...(resumeContext.order || {}), paymentMethod: 'COD' };
        setResumeContext((prev) => prev ? {
          ...prev,
          order: updatedOrder,
          payment: data?.payment || prev.payment,
          stateVersion: data?.stateVersion !== undefined ? data.stateVersion : prev.stateVersion,
          operation: data?.operation,
          eligibility: {
            eligible: false,
            allowedMethods: [],
            blockedReasons: ['ALREADY_COD'],
          },
        } : prev);
        setTransitionSuccess('Đã chuyển sang phương thức Thanh toán khi nhận hàng (COD) thành công!');
        navigate(`/order-success/${resumeOrderId}`, {
          state: { order: updatedOrder, transitioned: true },
        });
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
          setTransitionError('Giao dịch cần nhân viên đối soát (NEEDS_REVIEW). Không thể đổi sang COD.');
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

  const handleTransitionToCOD = () => handleExecuteTransition({ isRecovery: false });
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
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressDetail, setAddressDetail] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [saveInfo, setSaveInfo] = useState(true);

  // Payment Method: FIX-048 defaults to 'COD' for new demo orders
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // Voucher state
  const [voucherCode, setVoucherCode] = useState(locationState.voucherCode || '');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Idempotency & submit guard (FIX-018)
  const isSubmittingRef = useRef(false);

  // Load saved shipping addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await shippingAddressApi.getMyAddresses();
        const addrs = Array.isArray(res) ? res : res?.data || [];
        setSavedAddresses(addrs);

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          if (defaultAddr.fullName) setCustomerName(defaultAddr.fullName);
          if (defaultAddr.phone) setShippingPhone(defaultAddr.phone);
          if (defaultAddr.province) setProvince(defaultAddr.province);
          if (defaultAddr.district) setDistrict(defaultAddr.district);
          if (defaultAddr.ward) setWard(defaultAddr.ward);
          if (defaultAddr.address) setAddressDetail(defaultAddr.address);
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
  const shippingFee = subtotal === 0 || isFreeShipping ? 0 : 30000;
  const voucherKey = JSON.stringify([voucherCode, checkoutItems.map((item) =>
    [item.cartItemId, item.quantity, item.product.price])]);
  const voucherKeyRef = useRef(voucherKey);
  voucherKeyRef.current = voucherKey;
  useEffect(() => {
    setDiscountAmount(0);
    setVoucherSuccess('');
    setVoucherError('');
    setIsValidatingVoucher(false);
  }, [voucherKey]);
  const effectiveDiscount = subtotal > 0 ? Math.min(subtotal, discountAmount) : 0;
  const finalTotal = Math.max(0, subtotal - effectiveDiscount + shippingFee);

  // Live order payload and canonical fingerprint (continuously updated on every render)
  const currentPayload = buildOrderPayload({
    customerName,
    addressDetail,
    ward,
    district,
    province,
    shippingPhone,
    paymentMethod,
    voucherCode,
    note,
    checkoutItems,
  });
  const currentFingerprint = canonicalStringify(currentPayload);
  const currentFingerprintRef = useRef(currentFingerprint);
  currentFingerprintRef.current = currentFingerprint;

  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    const requestKey = voucherKey;
    setDiscountAmount(0);
    setIsValidatingVoucher(true);
    setVoucherError('');
    setVoucherSuccess('');

    try {
      const res = await voucherApi.validateVoucher(voucherCode.trim(), subtotal);
      if (voucherKeyRef.current !== requestKey) return;
      const vData = res?.data ?? res;
      if (vData && vData.valid) {
        setDiscountAmount(vData.discountAmount || 0);
        setVoucherSuccess(`Áp dụng mã ${vData.code} thành công! Giảm ${formatPrice(vData.discountAmount)}`);
      } else {
        setDiscountAmount(0);
        setVoucherError('Mã giảm giá không hợp lệ.');
      }
    } catch (err) {
      if (voucherKeyRef.current !== requestKey) return;
      setDiscountAmount(0);
      setVoucherError(err.response?.data?.message || 'Không thể xác thực mã giảm giá.');
    } finally {
      if (voucherKeyRef.current === requestKey) setIsValidatingVoucher(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (isSubmittingRef.current || loading || isValidatingVoucher) return;
    // FIX-048: Enforce COD payment method for new checkout demo orders
    if (paymentMethod !== 'COD') {
      setErrorMsg('Thanh toán QR tạm chưa hỗ trợ trong bản demo. Vui lòng chọn phương thức Thanh toán khi nhận hàng (COD).');
      return;
    }
    if (voucherCode.trim() && !voucherSuccess) {
      setErrorMsg('Vui lòng áp dụng lại mã giảm giá hoặc xóa mã trước khi đặt hàng.');
      return;
    }
    if (!customerName || !shippingPhone || !addressDetail) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng.');
      return;
    }

    if (checkoutItems.length === 0) {
      setErrorMsg('Không có sản phẩm nào được chọn để thanh toán.');
      return;
    }

    const payload = currentPayload;
    const submittedFingerprint = currentFingerprint;

    // FIX-018: 1 checkout intent = 1 UUID. Reuse key if unchanged; generate new UUID if changed.
    let idempotencyKey;
    try {
      const intent = getOrCreateIdempotencyKey(payload);
      idempotencyKey = intent.key;
    } catch {
      setErrorMsg('Không thể khởi tạo mã giao dịch an toàn (Web Crypto không khả dụng). Vui lòng thử lại trên trình duyệt hiện đại.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await orderApi.createOrder(payload, idempotencyKey);
      const createdOrder = res?.data ?? res;

      if (!createdOrder?.id) throw new Error('Máy chủ chưa trả về mã đơn hàng hợp lệ.');

      // STALE RESPONSE GUARD:
      // Compare submitted fingerprint with current live fingerprint of the UI.
      // If user altered form fields or cart items while request was in-flight, response is stale.
      if (isResponseStale(submittedFingerprint, currentFingerprintRef.current)) {
        return;
      }

      // Success (both 201 Created and 200 Replay) for CURRENT checkout intent:
      // Clear persisted idempotency intent so subsequent orders don't reuse this key
      clearStoredCheckoutIntent();

      checkoutItems.forEach((item) => removeFromCart(item.cartItemId));

      // Route based on payment method
      if (paymentMethod === 'COD') {
        navigate(`/order-success/${createdOrder.id}`, { state: { order: createdOrder } });
      } else {
        // PAYOS_VIETQR or electronic payment
        let paymentAttempt = null;
        let paymentError = null;
        try {
          const paymentKey = getOrCreatePaymentLinkKey(createdOrder.id);
          const payRes = await orderApi.createPaymentLink(createdOrder.id, paymentKey);
          paymentAttempt = payRes?.data ?? payRes;
        } catch (payErr) {
          // Note: DO NOT re-create order! Order has already been created and cart cleared.
          paymentError =
            payErr.response?.data?.message ||
            'Chưa thể chuẩn bị liên kết thanh toán. Vui lòng kiểm tra lại.';
        }

        navigate(`/payment/qr/${createdOrder.id}`, {
          state: {
            order: createdOrder,
            payment: paymentAttempt,
            paymentError: paymentError,
          },
        });
      }
    } catch (err) {
      // Stale response guard for errors: do not overwrite UI state with stale failure
      if (isResponseStale(submittedFingerprint, currentFingerprintRef.current)) {
        return;
      }

      const isConflict = err.response?.status === 409 || err.response?.data?.code === 'IDEMPOTENCY_CONFLICT';
      const apiMessage = err.response?.data?.message;

      if (isConflict) {
        // Invalidate stored key for this conflict so subsequent submit creates a fresh UUID
        clearStoredCheckoutIntent();
        setErrorMsg(
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Yêu cầu đặt hàng bị xung đột hoặc thông tin đã thay đổi. Vui lòng kiểm tra lại thông tin và thử lại.'
        );
      } else {
        // Network timeout / connection error / 5xx / 400 validation:
        // DO NOT clear cart!
        // DO NOT clear stored idempotency intent!
        // Preserves key so retry with same payload reuses the same Idempotency-Key.
        setErrorMsg(
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Không thể tạo đơn hàng. Giỏ hàng được giữ nguyên, vui lòng thử lại.'
        );
      }
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
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
                <span>Đang xử lý đơn hàng #{resumeOrderId}</span>
              </div>
            )}
          </div>

          {/* Loading State */}
          {resumeLoading && (
            <div data-testid="resume-loading-state" className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-3" />
              <p className="text-sm font-bold text-slate-700">Đang tải thông tin đơn hàng #{resumeOrderId}...</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
            </div>
          )}

          {/* Error State */}
          {!resumeLoading && resumeError && (
            <div data-testid="resume-error-state" className="max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Không thể tải thông tin đơn hàng #{resumeOrderId}</h2>
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
              {/* Banner */}
              <div
                data-testid="resume-order-banner"
                className="p-4 sm:p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-blue-950">
                      Đang tiếp tục đơn hàng #{resumeContext.order?.id}
                    </h2>
                    <p className="text-xs text-blue-700 mt-0.5 font-medium">
                      Mã tham chiếu: <span className="font-bold">{resumeContext.order?.orderCode || resumeContext.order?.id}</span> • Trạng thái: <span className="font-bold">{resumeContext.order?.status}</span>
                    </p>
                  </div>
                </div>
                <div className="text-xs font-semibold px-3 py-1 bg-white border border-blue-200 rounded-full text-blue-800 shrink-0">
                  Phiên bản: #{resumeContext.stateVersion ?? 0}
                </div>
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
                          <p className="text-xs text-slate-500 mt-0.5">Dữ liệu cố định theo đơn hàng đã khởi tạo</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                        Chỉ đọc
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="font-bold text-slate-500">Họ và tên người nhận:</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {resumeContext.order?.customerName || '—'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="font-bold text-slate-500">Số điện thoại:</span>
                        <span className="font-bold text-slate-900">
                          {resumeContext.order?.shippingPhone || '—'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="font-bold text-slate-500">Địa chỉ giao hàng:</span>
                        <span className="font-medium text-slate-800 text-right max-w-sm">
                          {resumeContext.order?.shippingAddress ||
                            [
                              resumeContext.order?.addressDetail,
                              resumeContext.order?.ward,
                              resumeContext.order?.district,
                              resumeContext.order?.province,
                            ].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                      {resumeContext.order?.note && (
                        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-100 gap-1">
                          <span className="font-bold text-slate-500">Ghi chú:</span>
                          <span className="font-medium text-slate-700 italic">
                            {resumeContext.order?.note}
                          </span>
                        </div>
                      )}
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
                          <p className="text-xs text-slate-500 mt-0.5">Trạng thái và các lựa chọn tiếp tục thanh toán</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                        Xử lý an toàn
                      </span>
                    </div>

                    {/* Current Method: PAYOS_VIETQR */}
                    {resumeContext.order?.paymentMethod === 'PAYOS_VIETQR' && (
                      <div className="flex flex-col gap-4">
                        {/* Current Box */}
                        <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/30 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <QrCode className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                                  Phương thức hiện tại
                                </span>
                                <h4 className="text-sm font-extrabold text-slate-900">
                                  Thanh toán QR Động (PayOS / VietQR)
                                </h4>
                              </div>
                            </div>
                            {resumeContext.payment?.status && (
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                resumeContext.payment.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : resumeContext.payment.status === 'NEEDS_REVIEW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : resumeContext.payment.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {resumeContext.payment.status}
                              </span>
                            )}
                          </div>

                          {/* Link back to QR Page if order is payable (Disabled in Demo COD) */}
                          {resumeContext.order?.status === 'PENDING' && resumeContext.payment?.status !== 'PAID' && (
                            <div className="pt-2 flex items-center justify-between border-t border-blue-100">
                              <span className="text-xs text-slate-500">Thanh toán QR tạm hoãn trong bản demo</span>
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed"
                                title="Thanh toán QR tạm hoãn trong bản demo"
                              >
                                <span>VietQR (Tạm hoãn)</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Transition to COD / Recovery Section */}
                        {resumeContext.eligibility?.eligible && resumeContext.eligibility?.allowedMethods?.includes('COD') ? (
                          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <Truck className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                  Đổi sang Thanh toán khi nhận hàng (COD)
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                  Hệ thống sẽ xác minh và đóng liên kết QR PayOS cũ, chuyển đơn hàng sang nhận hàng thanh toán tiền mặt. Không tạo đơn mới.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid="switch-to-cod-btn"
                              onClick={handleTransitionToCOD}
                              disabled={transitionLoading}
                              className="mt-2 w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                              {transitionLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>{requiresContextRecovery ? 'ĐANG KIỂM TRA TRẠNG THÁI...' : 'ĐANG XỬ LÝ CHUYỂN ĐỔI...'}</span>
                                </>
                              ) : requiresContextRecovery ? (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  <span>KIỂM TRA LẠI GIAO DỊCH</span>
                                </>
                              ) : (
                                <>
                                  <Truck className="w-4 h-4" />
                                  <span>XÁC NHẬN ĐỔI SANG COD</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : isVerifyingOperation ? (
                          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col gap-3" data-testid="verifying-recovery-section">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5 text-amber-700" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                  Đang xác minh thay đổi phương thức thanh toán
                                </h4>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                  Yêu cầu chuyển sang phương thức COD đang được hệ thống xác minh với cổng thanh toán. Vui lòng bấm &ldquo;Kiểm tra lại&rdquo; để hoàn tất cập nhật.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid="recover-transition-btn"
                              onClick={handleRecoverTransition}
                              disabled={transitionLoading || retryCountdown > 0}
                              className="mt-2 w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                              {transitionLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>ĐANG KIỂM TRA LẠI...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  <span>{retryCountdown > 0 ? `Kiểm tra lại (${retryCountdown}s)` : 'Kiểm tra lại'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 font-bold">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Không thể đổi phương thức thanh toán</span>
                            </div>
                            <p className="text-slate-600 pl-6 leading-relaxed">
                              {resumeContext.payment?.status === 'PAID'
                                ? 'Đơn hàng này đã được thanh toán thành công.'
                                : resumeContext.payment?.status === 'NEEDS_REVIEW'
                                ? 'Giao dịch đang trong trạng thái rà soát đối soát (NEEDS_REVIEW).'
                                : resumeContext.order?.status === 'CANCELLED'
                                ? 'Đơn hàng đã bị hủy.'
                                : resumeContext.payment?.status === 'CREATING'
                                ? 'Liên kết thanh toán đang được khởi tạo.'
                                : resumeContext.eligibility?.blockedReasons?.join(', ') || 'Đơn hàng không đủ điều kiện chuyển đổi.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current Method: COD */}
                    {resumeContext.order?.paymentMethod === 'COD' && (
                      <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                              Phương thức hiện tại
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              Thanh toán khi nhận hàng (COD)
                            </h4>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Đơn hàng được giao tận nơi và thanh toán tiền mặt khi nhận hàng. Không hỗ trợ chuyển đổi sang PayOS.
                        </p>
                      </div>
                    )}
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
                          Sản phẩm đơn #{resumeContext.order?.id} ({resumeContext.order?.items?.length || 0})
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
                                  src={itemImg}
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
                        <span>Cam kết 100% chính hãng BWF - Đền gấp 10 nếu giả</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Giao hàng hỏa tốc 2H tại Hà Nội & TP.HCM</span>
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

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Customer & Delivery + Payment (~60% / 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
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
                      Email xác nhận hóa đơn <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nguyenvana@gmail.com"
                        className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Region dropdowns (3-cols grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tỉnh / Thành phố <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Bắc Ninh">Bắc Ninh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Quận / Huyện <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Quận Đống Đa">Quận Đống Đa</option>
                      <option value="Quận Ba Đình">Quận Ba Đình</option>
                      <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                      <option value="Quận Hoàn Kiếm">Quận Hoàn Kiếm</option>
                      <option value="Quận Thanh Xuân">Quận Thanh Xuân</option>
                      <option value="Quận 1">Quận 1</option>
                      <option value="Quận 3">Quận 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phường / Xã <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Phường Khâm Thiên">Phường Khâm Thiên</option>
                      <option value="Phường Văn Chương">Phường Văn Chương</option>
                      <option value="Phường Ô Chợ Dừa">Phường Ô Chợ Dừa</option>
                      <option value="Phường Hàng Bột">Phường Hàng Bột</option>
                      <option value="Phường Bến Nghé">Phường Bến Nghé</option>
                    </select>
                  </div>
                </div>

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
                
                {/* OPTION 1: Dynamic QR (FIX-048: Tạm vô hiệu hóa trong bản demo) */}
                <div
                  aria-disabled="true"
                  className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        disabled={true}
                        checked={false}
                        className="w-4 h-4 accent-red-600 mt-1 cursor-not-allowed"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">
                            Thanh toán QR Động (PayOS / VietQR)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            Tạm chưa hỗ trợ (Demo)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Thanh toán QR tạm chưa hỗ trợ trong bản demo. Vui lòng chọn phương thức Thanh toán khi nhận hàng (COD).
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
                  onClick={() => setPaymentMethod('COD')}
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

            {/* Main Primary CTA Button */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={loading || isValidatingVoucher}
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
                    <span>ĐẶT HÀNG NGAY ({formatPrice(finalTotal)})</span>
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
                  <span>Bảo mật PCI-DSS</span>
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
                    Đơn hàng của bạn ({checkoutItems.length} sản phẩm)
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
                {checkoutItems.map((item) => {
                  const itemId = item.cartItemId || item.product.id;
                  const itemPrice = item.product.price || 0;
                  return (
                    <div key={itemId} className="py-3 flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 shrink-0 overflow-hidden relative flex items-center justify-center p-1 border border-slate-100">
                        <img
                          src={item.product.imageUrl || item.product.image}
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
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                          <Gift className="w-3 h-3 text-emerald-500" />
                          <span>Tặng bao vợt Pro + quấn cán (0₫)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Voucher Input & Applied Box */}
              <div className="pt-2 flex flex-col gap-2">
                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Mã giảm giá"
                      className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl text-xs font-bold uppercase text-slate-800 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isValidatingVoucher}
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
                    <span className="text-red-600 font-extrabold">-{formatPrice(effectiveDiscount)}</span>
                  </div>
                )}
                {voucherError && (
                  <p className="text-[11px] font-semibold text-red-600">{voucherError}</p>
                )}
              </div>

              {/* Cost Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-2 text-xs text-slate-600 border border-slate-200/60">
                <div className="flex justify-between">
                  <span>Tạm tính ({checkoutItems.length} sản phẩm)</span>
                  <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Giảm giá Voucher HG</span>
                  <span>-{formatPrice(effectiveDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span className="text-emerald-600 font-bold">
                    {shippingFee === 0 ? '0₫ (Miễn phí HG VIP)' : formatPrice(shippingFee)}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-black text-slate-900">Tổng thanh toán</span>
                  <span className="text-xl font-black text-red-600 tracking-tight">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cam kết 100% chính hãng BWF - Đền gấp 10 nếu giả</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Giao hàng hỏa tốc 2H tại Hà Nội & TP.HCM</span>
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
