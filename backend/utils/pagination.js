const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = ({ items, total, page, limit }) => ({
  items,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  },
});

module.exports = { parsePagination, paginated };
