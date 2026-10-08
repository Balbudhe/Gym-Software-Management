const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { nextBranchCode } = require('../utils/codes');
const { startOfDay } = require('../utils/dates');
const { expiryFilter } = require('../services/membershipService');
const { attendanceDateKey } = require('../services/attendanceService');

const withCounts = async (models, branches) => {
  const today = attendanceDateKey();
  const expiring = expiryFilter('expiring', 7);

  return Promise.all(
    branches.map(async (branch) => {
      const branchId = branch._id;
      const [trainers, members, activeMembers, expiringMembers, expiredMembers, presentToday] =
        await Promise.all([
          models.Trainer.countDocuments({ branchId, status: 'active' }),
          models.Member.countDocuments({ branchId, status: { $ne: 'inactive' } }),
          models.Member.countDocuments({ branchId, ...expiryFilter('active') }),
          models.Member.countDocuments({ branchId, ...expiring }),
          models.Member.countDocuments({ branchId, ...expiryFilter('expired') }),
          models.TrainerAttendance.countDocuments({
            branchId,
            date: today,
            status: { $in: ['present', 'late'] },
          }),
        ]);

      return {
        ...branch.toObject(),
        counts: {
          trainers,
          members,
          activeMembers,
          expiringMembers,
          expiredMembers,
          presentToday,
        },
      };
    })
  );
};

exports.listBranches = asyncHandler(async (req, res) => {
  const branches = await req.models.Branch.find().sort({ createdAt: 1 });
  const items = await withCounts(req.models, branches);
  res.json({ items });
});

exports.getBranch = asyncHandler(async (req, res) => {
  const branch = await req.models.Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ message: 'Branch not found' });
  const [item] = await withCounts(req.models, [branch]);
  res.json({ item });
});

exports.createBranch = asyncHandler(async (req, res) => {
  const { name, branchCode, address, city, state, pincode, phone, email } = req.body;
  if (!name) return res.status(400).json({ message: 'Branch name is required' });

  const code = (branchCode || (await nextBranchCode(req.models.Branch))).toUpperCase();
  const exists = await req.models.Branch.findOne({ branchCode: code });
  if (exists) return res.status(409).json({ message: 'Branch code must be unique inside the gym' });

  const branch = await req.models.Branch.create({
    name,
    branchCode: code,
    address,
    city,
    state,
    pincode,
    phone,
    email,
    status: 'active',
  });

  await req.models.AuditLog.create({
    actorUserId: req.user.userId,
    actorRole: req.user.role,
    branchId: branch._id,
    action: 'BRANCH_CREATE',
    entity: 'Branch',
    entityId: branch._id,
  });

  res.status(201).json({ item: branch });
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const branch = await req.models.Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ message: 'Branch not found' });

  const fields = ['name', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'status'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) branch[field] = req.body[field];
  });

  if (req.body.branchCode && req.body.branchCode.toUpperCase() !== branch.branchCode) {
    const code = req.body.branchCode.toUpperCase();
    const exists = await req.models.Branch.findOne({ branchCode: code, _id: { $ne: branch._id } });
    if (exists) return res.status(409).json({ message: 'Branch code must be unique inside the gym' });
    branch.branchCode = code;
  }

  await branch.save();
  res.json({ item: branch });
});

exports.deactivateBranch = asyncHandler(async (req, res) => {
  const branch = await req.models.Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ message: 'Branch not found' });
  branch.status = branch.status === 'active' ? 'inactive' : 'active';
  await branch.save();
  res.json({ item: branch });
});

exports.branchOverview = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid branch id' });
  }
  const branch = await req.models.Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ message: 'Branch not found' });

  const branchId = branch._id;
  const today = attendanceDateKey();
  const [item] = await withCounts(req.models, [branch]);

  const [recentAdmissions, attendance, membershipStatus] = await Promise.all([
    req.models.Member.find({ branchId })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('createdByTrainerId', 'name')
      .populate('assignedTrainerId', 'name')
      .lean(),
    req.models.TrainerAttendance.find({ branchId, date: today })
      .populate('trainerId', 'name')
      .lean(),
    (async () => {
      const todayStart = startOfDay();
      const [active, expiring, expired] = await Promise.all([
        req.models.Member.countDocuments({ branchId, ...expiryFilter('active') }),
        req.models.Member.countDocuments({ branchId, ...expiryFilter('expiring', 7) }),
        req.models.Member.countDocuments({ branchId, ...expiryFilter('expired') }),
      ]);
      return { active, expiring, expired, asOf: todayStart };
    })(),
  ]);

  res.json({
    item,
    recentAdmissions,
    attendance,
    membershipStatus,
  });
});
