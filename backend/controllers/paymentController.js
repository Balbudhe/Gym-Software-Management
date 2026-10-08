const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const {
  startOfDay,
  endOfDay,
  IST,
  ymdIst,
  startOfIstDay,
  endOfIstDay,
  parseYmdIst,
  monthKeyIst,
  monthRangeIst,
} = require('../utils/dates');
const { paymentsEnabled, parsePaymentMethod, parseAmount, withCollector } = require('../services/paymentService');

const populatePayment = [
  { path: 'memberId', select: 'name memberCode phone' },
  { path: 'membershipId', select: 'startDate expiryDate status' },
  { path: 'branchId', select: 'name branchCode' },
  { path: 'createdByTrainerId', select: 'name' },
];

const emptyTotals = () => ({ cash: 0, online: 0, total: 0, count: 0 });

const totalsFromAgg = (rows) => {
  const out = emptyTotals();
  (rows || []).forEach((row) => {
    const amount = Number(row.total) || 0;
    const count = Number(row.count) || 0;
    if (row._id === 'cash') out.cash = amount;
    if (row._id === 'online') out.online = amount;
    out.total += amount;
    out.count += count;
  });
  return out;
};

const methodGroup = [
  { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
];

exports.paymentHistory = asyncHandler(async (req, res) => {
  const method = parsePaymentMethod(req.query.method);
  const todayStart = startOfIstDay();
  const todayEnd = endOfIstDay();
  const todayKey = ymdIst();

  const selectedDay = parseYmdIst(req.query.date);
  const hasDate = Boolean(selectedDay && selectedDay <= todayStart);
  const dayStart = hasDate ? selectedDay : todayStart;
  const dayKey = hasDate ? ymdIst(dayStart) : null;
  const dayEnd = endOfIstDay(dayStart);

  const month = monthRangeIst(req.query.month || (dayKey || todayKey).slice(0, 7) || monthKeyIst());
  const itemPaidAt = hasDate
    ? { $gte: dayStart, $lte: dayEnd }
    : { $gte: month.start, $lt: month.endExclusive };

  const baseMatch = { ...req.branchFilter };
  if (method) baseMatch.method = method;

  const [todayRows, dayRows, monthRows, dailyRows, items] = await Promise.all([
    req.models.MembershipPayment.aggregate([
      { $match: { ...baseMatch, paidAt: { $gte: todayStart, $lte: todayEnd } } },
      ...methodGroup,
    ]),
    req.models.MembershipPayment.aggregate([
      { $match: { ...baseMatch, paidAt: { $gte: dayStart, $lte: dayEnd } } },
      ...methodGroup,
    ]),
    req.models.MembershipPayment.aggregate([
      { $match: { ...baseMatch, paidAt: { $gte: month.start, $lt: month.endExclusive } } },
      ...methodGroup,
    ]),
    req.models.MembershipPayment.aggregate([
      { $match: { ...baseMatch, paidAt: { $gte: month.start, $lt: month.endExclusive } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: IST } },
            method: '$method',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    req.models.MembershipPayment.find({
      ...baseMatch,
      paidAt: itemPaidAt,
    })
      .populate(populatePayment)
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(200)
      .lean(),
  ]);

  const byDay = new Map();
  dailyRows.forEach((row) => {
    const key = row._id.date;
    const current = byDay.get(key) || emptyTotals();
    const amount = Number(row.total) || 0;
    const count = Number(row.count) || 0;
    if (row._id.method === 'cash') current.cash += amount;
    if (row._id.method === 'online') current.online += amount;
    current.total += amount;
    current.count += count;
    byDay.set(key, current);
  });

  let increment = 0;
  const daily = Array.from({ length: month.days }, (_, index) => {
    const date = ymdIst(new Date(month.start.getTime() + index * 86400000));
    const totals = byDay.get(date) || emptyTotals();
    increment += totals.total;
    return {
      _id: date,
      date,
      cash: totals.cash,
      online: totals.online,
      total: totals.total,
      count: totals.count,
      increment,
    };
  });

  res.json({
    enabled: paymentsEnabled(req.gym),
    method: method || 'all',
    date: dayKey,
    month: month.key,
    today: { date: todayKey, ...totalsFromAgg(todayRows) },
    selectedDay: hasDate ? { date: dayKey, ...totalsFromAgg(dayRows) } : null,
    monthSummary: { month: month.key, ...totalsFromAgg(monthRows) },
    daily,
    items: items.map(withCollector),
  });
});

exports.listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = { ...req.branchFilter };
  const method = parsePaymentMethod(req.query.method);
  if (method) query.method = method;
  if (req.query.memberId) query.memberId = req.query.memberId;
  if (req.query.from || req.query.to) {
    query.paidAt = {};
    if (req.query.from) query.paidAt.$gte = startOfDay(new Date(req.query.from));
    if (req.query.to) query.paidAt.$lte = endOfDay(new Date(req.query.to));
  }

  const [items, total, cashTotal, onlineTotal] = await Promise.all([
    req.models.MembershipPayment.find(query)
      .populate(populatePayment)
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    req.models.MembershipPayment.countDocuments(query),
    req.models.MembershipPayment.aggregate([
      { $match: { ...query, method: 'cash' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    req.models.MembershipPayment.aggregate([
      { $match: { ...query, method: 'online' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    ...paginated({ items: items.map(withCollector), total, page, limit }),
    summary: {
      cashTotal: cashTotal[0]?.total || 0,
      onlineTotal: onlineTotal[0]?.total || 0,
      enabled: paymentsEnabled(req.gym),
    },
  });
});

exports.createPayment = asyncHandler(async (req, res) => {
  if (!paymentsEnabled(req.gym)) {
    return res.status(400).json({ message: 'Enable membership payments in Settings first' });
  }
  const member = await req.models.Member.findOne({
    _id: req.body.memberId,
    ...req.branchFilter,
  });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const method = parsePaymentMethod(req.body.paymentMethod);
  if (!method) return res.status(400).json({ message: 'Select cash or online payment' });

  const item = await req.models.MembershipPayment.create({
    memberId: member._id,
    membershipId: req.body.membershipId || member.membershipId || null,
    branchId: member.branchId,
    method,
    amount: parseAmount(req.body.paymentAmount, 0),
    reference: String(req.body.paymentReference || '').trim(),
    notes: String(req.body.paymentNotes || '').trim(),
    paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
    recordedByUserId: req.user.userId,
    recordedByRole: req.user.role,
    createdByTrainerId: req.user.role === 'TRAINER' ? req.user.trainerId : null,
  });

  const populated = await req.models.MembershipPayment.findById(item._id).populate(populatePayment);
  res.status(201).json({ item: withCollector(populated) });
});
