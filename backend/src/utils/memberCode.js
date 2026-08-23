const Gym = require('../models/Gym');

async function generateMemberCode(gymId) {
  const gym = await Gym.findByIdAndUpdate(
    gymId,
    { $inc: { memberSequence: 1 } },
    { new: true }
  );
  if (!gym) throw new Error('Gym not found');
  const prefix = gym.code || 'GYM';
  return `${prefix}-${String(gym.memberSequence).padStart(3, '0')}`;
}

module.exports = { generateMemberCode };
