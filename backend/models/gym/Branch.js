const { Schema } = require('mongoose');

const branchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    branchCode: { type: String, required: true, trim: true, uppercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

branchSchema.index({ branchCode: 1 }, { unique: true });

module.exports = branchSchema;
