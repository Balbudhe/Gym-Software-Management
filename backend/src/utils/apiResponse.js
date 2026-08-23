function ok(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}

function fail(res, message, status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

function paginate({ page = 1, limit = 10 }) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}

module.exports = { ok, fail, paginate, paginationMeta };
