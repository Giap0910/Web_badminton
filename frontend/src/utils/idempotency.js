/**
 * Idempotency utilities for order creation (FIX-018)
 * Ensures 1 checkout intent = 1 UUID
 * Persists key across retry/timeout/reload if payload is unchanged
 * Generates new UUID if payload changes or after 409 conflict
 * Strictly uses Web Crypto (crypto.randomUUID or crypto.getRandomValues)
 * Fails safely without insecure fallback
 */

export const IDEMPOTENCY_STORAGE_KEY = 'hg_checkout_idempotency';

/**
 * Generate RFC4122 v4 UUID using cryptographically secure randomness.
 * Throws controlled error if Web Crypto is completely unavailable.
 */
export const generateUUID = () => {
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof crypto !== 'undefined'
      ? crypto
      : null;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC4122 v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx (8, 9, a, or b)
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error('Secure random source is not available.');
};

/**
 * Deterministic JSON stringify by lexicographically sorting object keys.
 * Does not depend on insertion order or object reference.
 */
export const canonicalStringify = (val) => {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  const pairs = keys.map((key) => JSON.stringify(key) + ':' + canonicalStringify(val[key]));
  return '{' + pairs.join(',') + '}';
};

/**
 * Deterministically constructs createOrder payload from form & cart state.
 * Shared between live state tracking and actual submission to avoid duplicate logic.
 */
export const buildOrderPayload = ({
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
}) => {
  const fullShippingAddress = `${addressDetail || ''}, ${ward || ''}, ${district || ''}, ${province || ''}`;
  return {
    customerName: customerName || '',
    shippingAddress: fullShippingAddress,
    shippingPhone: shippingPhone || '',
    paymentMethod: paymentMethod || 'PAYOS_VIETQR',
    voucherCode: voucherCode?.trim() || null,
    note: [note, ...(checkoutItems || []).map((item, index) => {
      const extra = [item.options?.gender, item.options?.capacity, item.options?.packaging].filter(Boolean);
      return extra.length ? `Dòng ${index + 1} - ${item.product?.name || ''}: ${extra.join(', ')}` : '';
    })].filter(Boolean).join('\n'),
    items: (checkoutItems || []).map((item) => ({
      productId: item.product?.id,
      quantity: item.quantity,
      selectedSize: item.selectedSize || '',
      selectedColor: item.selectedColor || '',
      selectedWeight: item.selectedWeight || '',
      stringingService: item.stringingService || '',
      stringTension: item.stringTension || '',
    })),
  };
};

/**
 * Evaluates whether an async order response is stale compared to the current UI payload.
 */
export const isResponseStale = (submittedFingerprint, currentFingerprint) => {
  return submittedFingerprint !== currentFingerprint;
};

/**
 * Safe sessionStorage read
 */
export const getStoredCheckoutIntent = () => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.key === 'string' && typeof parsed.fingerprint === 'string') {
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
};

/**
 * Safe sessionStorage write
 */
export const saveCheckoutIntent = (key, fingerprint) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      IDEMPOTENCY_STORAGE_KEY,
      JSON.stringify({ key, fingerprint })
    );
  } catch {
    // Ignore storage write errors (e.g. quota, private browsing)
  }
};

/**
 * Safe sessionStorage clear
 */
export const clearStoredCheckoutIntent = () => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // Ignore storage remove errors
  }
};

/**
 * Get existing key if payload fingerprint matches, or create a new UUID and persist.
 * @param {object} payload - Actual order creation payload
 * @returns {{ key: string, fingerprint: string, isReused: boolean }}
 */
export const getOrCreateIdempotencyKey = (payload) => {
  const currentFingerprint = canonicalStringify(payload);
  const stored = getStoredCheckoutIntent();

  if (stored && stored.key && stored.fingerprint === currentFingerprint) {
    return {
      key: stored.key,
      fingerprint: currentFingerprint,
      isReused: true,
    };
  }

  const newKey = generateUUID();
  saveCheckoutIntent(newKey, currentFingerprint);
  return {
    key: newKey,
    fingerprint: currentFingerprint,
    isReused: false,
  };
};

/**
 * Idempotency utilities for PayOS payment link creation (FIX-002)
 * Ensures 1 payment operation per order = 1 distinct UUID
 * Persists key across retry/timeout/reload for the same orderId
 * Completely separated from order creation storage (hg_checkout_idempotency)
 */
export const PAYMENT_LINK_STORAGE_KEY = 'hg_payment_link_idempotency';

/**
 * Safe sessionStorage read for payment link intent
 */
export const getStoredPaymentLinkIntent = () => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(PAYMENT_LINK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.key === 'string' && parsed.orderId != null) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Safe sessionStorage write for payment link intent
 */
export const savePaymentLinkIntent = (orderId, key) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      PAYMENT_LINK_STORAGE_KEY,
      JSON.stringify({ orderId: String(orderId), key })
    );
  } catch {
    // Ignore storage write errors
  }
};

/**
 * Safe sessionStorage clear for payment link intent
 */
export const clearStoredPaymentLinkIntent = (orderId) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (orderId != null) {
      const stored = getStoredPaymentLinkIntent();
      if (stored && String(stored.orderId) !== String(orderId)) {
        return; // Preserve intent if for another order
      }
    }
    sessionStorage.removeItem(PAYMENT_LINK_STORAGE_KEY);
  } catch {
    // Ignore storage remove errors
  }
};

/**
 * Get existing payment idempotency key if orderId matches, or create a new UUID and persist.
 * Ensures 1 payment operation per order uses the same UUID across timeout/retry/reload.
 * @param {string|number} orderId - Order identifier
 * @returns {string} - Idempotency key (UUID)
 */
export const getOrCreatePaymentLinkKey = (orderId) => {
  const strOrderId = String(orderId);
  const stored = getStoredPaymentLinkIntent();

  if (stored && stored.key && String(stored.orderId) === strOrderId) {
    return stored.key;
  }

  const newKey = generateUUID();
  savePaymentLinkIntent(strOrderId, newKey);
  return newKey;
};

/**
 * Idempotency utilities for Admin Payment Reconciliation (FIX-003)
 * Ensures 1 reconciliation intent (paymentAttemptId + reason) = 1 distinct UUID
 * Reuses the same UUID across retry/timeout/202 for the same intent
 * Completely separated namespace from order creation and payment link storage
 */
export const RECONCILIATION_STORAGE_KEY = 'hg_reconciliation_idempotency';

/**
 * Safe sessionStorage read for reconciliation intent
 */
export const getStoredReconciliationIntent = (paymentAttemptId) => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(RECONCILIATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.key === 'string' &&
      parsed.paymentAttemptId != null &&
      (paymentAttemptId == null || String(parsed.paymentAttemptId) === String(paymentAttemptId))
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Safe sessionStorage write for reconciliation intent
 */
export const saveReconciliationIntent = (paymentAttemptId, reason, key) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      RECONCILIATION_STORAGE_KEY,
      JSON.stringify({
        paymentAttemptId: String(paymentAttemptId),
        reason: typeof reason === 'string' ? reason.trim() : '',
        key,
      })
    );
  } catch {
    // Ignore storage write errors
  }
};

/**
 * Safe sessionStorage clear for reconciliation intent
 */
export const clearStoredReconciliationIntent = (paymentAttemptId) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (paymentAttemptId != null) {
      const stored = getStoredReconciliationIntent();
      if (stored && String(stored.paymentAttemptId) !== String(paymentAttemptId)) {
        return; // Preserve intent if for another payment
      }
    }
    sessionStorage.removeItem(RECONCILIATION_STORAGE_KEY);
  } catch {
    // Ignore storage remove errors
  }
};

/**
 * Get existing reconciliation key if paymentAttemptId and reason match, or create a new UUID and persist.
 * Ensures same payment + same reason after timeout/202 reuses the same UUID.
 * Changed reason or paymentAttemptId generates a new UUID.
 * @param {string|number} paymentAttemptId - Payment attempt identifier
 * @param {string} reason - Reconciliation reason
 * @returns {string} - Idempotency key (UUID)
 */
export const getOrCreateReconciliationKey = (paymentAttemptId, reason) => {
  const strId = String(paymentAttemptId);
  const normReason = typeof reason === 'string' ? reason.trim() : '';
  const stored = getStoredReconciliationIntent(strId);

  if (
    stored &&
    stored.key &&
    String(stored.paymentAttemptId) === strId &&
    stored.reason === normReason
  ) {
    return stored.key;
  }

  const newKey = generateUUID();
  saveReconciliationIntent(strId, normReason, newKey);
  return newKey;
};

/**
 * Idempotency utilities for Payment Method Transition (FIX-057)
 * Ensures 1 transition intent (orderId + targetMethod + expectedStateVersion) = 1 distinct UUID
 * Reuses the same UUID across retry/timeout/202 for the same intent
 * Completely separated namespace from order creation, payment link, and reconciliation storage
 */
export const TRANSITION_STORAGE_KEY = 'hg_payment_transition_idempotency';

/**
 * Safe sessionStorage read for transition intent
 */
export const getStoredTransitionIntent = (orderId) => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(TRANSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.key === 'string' &&
      parsed.orderId != null &&
      (orderId == null || String(parsed.orderId) === String(orderId))
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Safe sessionStorage write for transition intent
 */
export const saveTransitionIntent = (orderId, targetMethod, expectedStateVersion, key) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      TRANSITION_STORAGE_KEY,
      JSON.stringify({
        orderId: String(orderId),
        targetMethod: typeof targetMethod === 'string' ? targetMethod.trim() : '',
        expectedStateVersion: Number(expectedStateVersion),
        key,
      })
    );
  } catch {
    // Ignore storage write errors
  }
};

/**
 * Safe sessionStorage clear for transition intent
 */
export const clearStoredTransitionIntent = (orderId) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (orderId != null) {
      const stored = getStoredTransitionIntent();
      if (stored && String(stored.orderId) !== String(orderId)) {
        return; // Preserve intent if for another order
      }
    }
    sessionStorage.removeItem(TRANSITION_STORAGE_KEY);
  } catch {
    // Ignore storage remove errors
  }
};

/**
 * Get existing transition key if orderId, targetMethod, and expectedStateVersion match, or create a new UUID and persist.
 * Ensures same order + same target + same version after timeout/202 reuses the same UUID.
 * Changed intent or version generates a new UUID.
 * @param {string|number} orderId - Order identifier
 * @param {string} targetMethod - Target payment method (e.g. 'COD')
 * @param {number} expectedStateVersion - Expected state version from checkout context
 * @returns {string} - Idempotency key (UUID)
 */
export const getOrCreateTransitionKey = (orderId, targetMethod, expectedStateVersion) => {
  const strId = String(orderId);
  const normMethod = typeof targetMethod === 'string' ? targetMethod.trim() : '';
  const numVersion = Number(expectedStateVersion);
  const stored = getStoredTransitionIntent(strId);

  if (
    stored &&
    stored.key &&
    String(stored.orderId) === strId &&
    stored.targetMethod === normMethod &&
    Number(stored.expectedStateVersion) === numVersion
  ) {
    return stored.key;
  }

  const newKey = generateUUID();
  saveTransitionIntent(strId, normMethod, numVersion, newKey);
  return newKey;
};

/**
 * Idempotency utilities for Mock PayOS Simulation Action (FIX-058)
 * Ensures 1 simulation intent (orderId + scenario) = 1 distinct UUID
 * Reuses the same UUID across retry/timeout/202 for the same intent
 * Completely separated namespace from order creation, payment link, reconciliation, and transition storage
 */
export const MOCK_ACTION_STORAGE_KEY = 'hg_mock_action_idempotency';

/**
 * Safe sessionStorage read for mock action intent
 */
export const getStoredMockActionIntent = (orderId) => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(MOCK_ACTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.key === 'string' &&
      parsed.orderId != null &&
      (orderId == null || String(parsed.orderId) === String(orderId))
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Safe sessionStorage write for mock action intent
 */
export const saveMockActionIntent = (orderId, scenario, key) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      MOCK_ACTION_STORAGE_KEY,
      JSON.stringify({
        orderId: String(orderId),
        scenario: typeof scenario === 'string' ? scenario.trim() : '',
        key,
      })
    );
  } catch {
    // Ignore storage write errors
  }
};

/**
 * Safe sessionStorage clear for mock action intent
 */
export const clearStoredMockActionIntent = (orderId) => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (orderId != null) {
      const stored = getStoredMockActionIntent();
      if (stored && String(stored.orderId) !== String(orderId)) {
        return; // Preserve intent if for another order
      }
    }
    sessionStorage.removeItem(MOCK_ACTION_STORAGE_KEY);
  } catch {
    // Ignore storage remove errors
  }
};

/**
 * Get existing mock action key if orderId and scenario match, or create a new UUID and persist.
 * Ensures same order + same scenario after timeout/202 reuses the same UUID.
 * Changed intent or scenario generates a new UUID.
 * @param {string|number} orderId - Order identifier
 * @param {string} scenario - Simulation scenario name (e.g. 'PAYMENT_PAID_WEBHOOK')
 * @returns {string} - Idempotency key (UUID)
 */
export const getOrCreateMockActionKey = (orderId, scenario) => {
  const strId = String(orderId);
  const normScenario = typeof scenario === 'string' ? scenario.trim() : '';
  const stored = getStoredMockActionIntent(strId);

  if (
    stored &&
    stored.key &&
    String(stored.orderId) === strId &&
    stored.scenario === normScenario
  ) {
    return stored.key;
  }

  const newKey = generateUUID();
  saveMockActionIntent(strId, normScenario, newKey);
  return newKey;
};
