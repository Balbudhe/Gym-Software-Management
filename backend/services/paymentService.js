const parsePaymentMethod = (value) => {
  const method = String(value || '').toLowerCase().trim();
  if (method === 'cash' || method === 'online') return method;
  return null;
};

const parseAmount = (value, fallback = 0) => {
  const amount = Number(value);
  if (Number.isFinite(amount) && amount >= 0) return amount;
  const fallbackAmount = Number(fallback);
  return Number.isFinite(fallbackAmount) && fallbackAmount >= 0 ? fallbackAmount : 0;
};

const paymentsEnabled = (gym) => Boolean(gym?.paymentsEnabled);

const assertPaymentInput = (req, planPrice = 0) => {
  if (!paymentsEnabled(req.gym)) return null;
  const method = parsePaymentMethod(req.body.paymentMethod);
  if (!method) {
    const error = new Error('Select cash or online payment');
    error.status = 400;
    throw error;
  }
  return {
    method,
    amount: parseAmount(req.body.paymentAmount, planPrice),
    reference: String(req.body.paymentReference || '').trim(),
    notes: String(req.body.paymentNotes || '').trim(),
    paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
  };
};

const createMembershipPayment = async (req, { member, membership, plan }) => {
  const payload = assertPaymentInput(req, plan?.price || 0);
  if (!payload) return null;
  return req.models.MembershipPayment.create({
    memberId: member._id,
    membershipId: membership?._id || member.membershipId || null,
    branchId: member.branchId,
    method: payload.method,
    amount: payload.amount,
    reference: payload.reference,
    notes: payload.notes,
    paidAt: payload.paidAt,
    recordedByUserId: req.user.userId,
    recordedByRole: req.user.role,
    createdByTrainerId: req.user.role === 'TRAINER' ? req.user.trainerId : null,
  });
};

const collectedByLabel = (payment) => {
  if (payment?.recordedByRole === 'TRAINER') {
    const trainer = payment.createdByTrainerId;
    return trainer?.name || 'Trainer';
  }
  return 'Admin';
};

const withCollector = (payment) => {
  if (!payment) return payment;
  const item = typeof payment.toObject === 'function' ? payment.toObject() : payment;
  return {
    ...item,
    collectedBy: collectedByLabel(item),
    paymentType: item.method === 'online' ? 'Online' : 'Cash',
  };
};

module.exports = {
  parsePaymentMethod,
  parseAmount,
  paymentsEnabled,
  assertPaymentInput,
  createMembershipPayment,
  collectedByLabel,
  withCollector,
};
