const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');
const { buildMemberQuery, createAdmission, populateMember } = require('./memberController');

exports.listAdmissions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const query = buildMemberQuery(req);

  const [items, total] = await Promise.all([
    req.models.Member.find(query)
      .populate(populateMember)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    req.models.Member.countDocuments(query),
  ]);

  res.json(paginated({ items, total, page, limit }));
});

exports.createAdmission = asyncHandler(async (req, res) => {
  const item = await createAdmission(req);
  res.status(201).json({ item });
});
