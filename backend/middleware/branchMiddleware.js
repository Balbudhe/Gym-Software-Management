const mongoose = require('mongoose');

const branchScope = async (req, res, next) => {
  try {
    if (req.user.role === 'TRAINER') {
      if (!req.user.branchId) {
        return res.status(403).json({ message: 'Trainer is not assigned to a branch' });
      }
      req.branchId = req.user.branchId;
      req.branchFilter = { branchId: req.user.branchId };
      return next();
    }

    const selected = req.headers['x-branch-id'] || req.query.branchId;
    if (!selected || selected === 'ALL') {
      req.branchId = null;
      req.branchFilter = {};
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(selected)) {
      return res.status(400).json({ message: 'Invalid branch id' });
    }

    const branch = await req.models.Branch.findById(selected);
    if (!branch) {
      return res.status(400).json({ message: 'Branch does not belong to this gym' });
    }

    req.branchId = branch._id;
    req.branchFilter = { branchId: branch._id };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { branchScope };
