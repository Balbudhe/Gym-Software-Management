const { Schema } = require('mongoose');

const membershipPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    durationValue: { type: Number, required: true, min: 1 },
    durationUnit: {
      type: String,
      enum: ['day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years'],
      default: 'month',
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = membershipPlanSchema;
