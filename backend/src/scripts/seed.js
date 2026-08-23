require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('../models/Gym');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const TrainerAttendance = require('../models/TrainerAttendance');
const { addDuration, startOfDay, isLate } = require('../utils/dates');
const { computeStatus } = require('../utils/membership');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function atTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Resetting demo gym data...');

  const existingGym = await Gym.findOne({ email: 'owner@fitzone.com' });
  if (existingGym) {
    const gid = existingGym._id;
    await Promise.all([
      User.deleteMany({ gymId: gid }),
      Trainer.deleteMany({ gymId: gid }),
      Member.deleteMany({ gymId: gid }),
      MembershipPlan.deleteMany({ gymId: gid }),
      Membership.deleteMany({ gymId: gid }),
      TrainerAttendance.deleteMany({ gymId: gid }),
      Gym.deleteOne({ _id: gid }),
    ]);
  }

  const gym = await Gym.create({
    name: 'FitZone Premium',
    code: 'GYM',
    email: 'owner@fitzone.com',
    phone: '9876500000',
    address: '42 Fitness Avenue, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    status: 'active',
    memberSequence: 0,
    settings: { expiringSoonDays: 7, lateAfterTime: '09:00' },
  });

  const owner = await User.create({
    name: 'Karan Mehta',
    email: 'owner@fitzone.com',
    password: 'Owner@123',
    role: 'OWNER',
    gymId: gym._id,
    trainerId: null,
  });

  const trainerDefs = [
    { name: 'Amit Sharma', email: 'amit@fitzone.com', phone: '9876511111', specialization: 'Strength & Conditioning', experience: 6 },
    { name: 'Rahul Verma', email: 'rahul@fitzone.com', phone: '9876522222', specialization: 'Weight Loss', experience: 4 },
    { name: 'Sneha Patil', email: 'sneha@fitzone.com', phone: '9876533333', specialization: 'Yoga & Mobility', experience: 5 },
    { name: 'Rohit Singh', email: 'rohit@fitzone.com', phone: '9876544444', specialization: 'Bodybuilding', experience: 7 },
  ];

  const trainers = [];
  for (const def of trainerDefs) {
    const user = await User.create({
      name: def.name,
      email: def.email,
      password: 'Trainer@123',
      role: 'TRAINER',
      gymId: gym._id,
    });
    const trainer = await Trainer.create({
      gymId: gym._id,
      userId: user._id,
      name: def.name,
      email: def.email,
      phone: def.phone,
      specialization: def.specialization,
      experience: def.experience,
      joiningDate: daysAgo(400),
      status: 'active',
    });
    user.trainerId = trainer._id;
    await user.save({ validateBeforeSave: false });
    trainers.push(trainer);
  }

  const [amit, rahul, sneha, rohit] = trainers;

  const plans = await MembershipPlan.insertMany([
    { gymId: gym._id, name: 'Monthly', durationValue: 1, durationUnit: 'month', price: 1500, description: '1 month access to gym floor and group classes', status: 'active' },
    { gymId: gym._id, name: 'Quarterly', durationValue: 3, durationUnit: 'month', price: 4000, description: '3 months with trainer assessment', status: 'active' },
    { gymId: gym._id, name: 'Half Yearly', durationValue: 6, durationUnit: 'month', price: 7000, description: '6 months plus diet consult', status: 'active' },
    { gymId: gym._id, name: 'Yearly', durationValue: 12, durationUnit: 'month', price: 12000, description: '12 months all-access membership', status: 'active' },
  ]);

  const memberDefs = [
    { name: 'Rahul Desai', phone: '9000000001', createdBy: amit, assigned: rohit, plan: 0, start: 10, gender: 'male', goal: 'Muscle gain' },
    { name: 'Priya Nair', phone: '9000000002', createdBy: rahul, assigned: sneha, plan: 1, start: 40, gender: 'female', goal: 'Weight loss' },
    { name: 'Arjun Kapoor', phone: '9000000003', createdBy: sneha, assigned: amit, plan: 2, start: 80, gender: 'male', goal: 'Endurance' },
    { name: 'Neha Joshi', phone: '9000000004', createdBy: rohit, assigned: rahul, plan: 3, start: 120, gender: 'female', goal: 'Flexibility' },
    { name: 'Vikram Shah', phone: '9000000005', createdBy: amit, assigned: amit, plan: 0, start: 3, gender: 'male', goal: 'Fat loss' },
    { name: 'Ananya Iyer', phone: '9000000006', createdBy: rahul, assigned: sneha, plan: 1, start: 5, gender: 'female', goal: 'Toning' },
    { name: 'Siddharth Rao', phone: '9000000007', createdBy: sneha, assigned: rohit, plan: 0, start: 20, gender: 'male', goal: 'Strength' },
    { name: 'Meera Kulkarni', phone: '9000000008', createdBy: rohit, assigned: sneha, plan: 2, start: 60, gender: 'female', goal: 'General fitness' },
    { name: 'Kunal Bansal', phone: '9000000009', createdBy: amit, assigned: rahul, plan: 0, start: 35, gender: 'male', goal: 'Body recomposition' },
    { name: 'Ishita Gupta', phone: '9000000010', createdBy: rahul, assigned: amit, plan: 1, start: 85, gender: 'female', goal: 'Weight loss' },
    { name: 'Harsh Patel', phone: '9000000011', createdBy: sneha, assigned: sneha, plan: 3, start: 200, gender: 'male', goal: 'Powerlifting' },
    { name: 'Pooja Reddy', phone: '9000000012', createdBy: rohit, assigned: amit, plan: 0, start: 6, gender: 'female', goal: 'Yoga strength' },
    { name: 'Aditya Menon', phone: '9000000013', createdBy: amit, assigned: rohit, plan: 1, start: 2, gender: 'male', goal: 'Muscle gain' },
    { name: 'Kavya Pillai', phone: '9000000014', createdBy: rahul, assigned: rahul, plan: 0, start: 0, gender: 'female', goal: 'Fat loss' },
    { name: 'Rohan Malhotra', phone: '9000000015', createdBy: sneha, assigned: amit, plan: 2, start: 150, gender: 'male', goal: 'Stamina' },
    { name: 'Divya Chawla', phone: '9000000016', createdBy: rohit, assigned: sneha, plan: 0, start: 28, gender: 'female', goal: 'Toning' },
    { name: 'Nikhil Jain', phone: '9000000017', createdBy: amit, assigned: amit, plan: 1, start: 70, gender: 'male', goal: 'Strength' },
    { name: 'Shreya Bose', phone: '9000000018', createdBy: rahul, assigned: rohit, plan: 0, start: 4, gender: 'female', goal: 'Weight loss' },
    { name: 'Manish Tiwari', phone: '9000000019', createdBy: sneha, assigned: rahul, plan: 3, start: 300, gender: 'male', goal: 'Bodybuilding' },
    { name: 'Ritika Sethi', phone: '9000000020', createdBy: rohit, assigned: amit, plan: 1, start: 12, gender: 'female', goal: 'Flexibility' },
    { name: 'Yash Agarwal', phone: '9000000021', createdBy: amit, assigned: sneha, plan: 0, start: 1, gender: 'male', goal: 'Muscle gain' },
    { name: 'Tanvi Kaur', phone: '9000000022', createdBy: rahul, assigned: sneha, plan: 2, start: 90, gender: 'female', goal: 'General fitness' },
    { name: 'Devansh Mishra', phone: '9000000023', createdBy: sneha, assigned: rohit, plan: 0, start: 33, gender: 'male', goal: 'Fat loss' },
    { name: 'Aisha Khan', phone: '9000000024', createdBy: rohit, assigned: rahul, plan: 1, start: 18, gender: 'female', goal: 'Toning' },
  ];

  for (const def of memberDefs) {
    gym.memberSequence += 1;
    const plan = plans[def.plan];
    const startDate = daysAgo(def.start);
    const expiryDate = addDuration(startDate, plan.durationValue, plan.durationUnit);
    const status = computeStatus(expiryDate, 7);
    const member = await Member.create({
      gymId: gym._id,
      memberCode: `GYM-${String(gym.memberSequence).padStart(3, '0')}`,
      name: def.name,
      phone: def.phone,
      email: `${def.name.split(' ')[0].toLowerCase()}@mail.com`,
      gender: def.gender,
      address: 'Mumbai',
      emergencyContact: '9000099999',
      createdByTrainerId: def.createdBy._id,
      assignedTrainerId: def.assigned._id,
      joiningDate: startDate,
      expiryDate,
      status,
      fitnessGoal: def.goal,
      height: def.gender === 'male' ? 176 : 162,
      weight: def.gender === 'male' ? 78 : 61,
      createdAt: startDate,
      updatedAt: startDate,
    });
    const membership = await Membership.create({
      gymId: gym._id,
      memberId: member._id,
      membershipPlanId: plan._id,
      startDate,
      expiryDate,
      status,
      createdByTrainerId: def.createdBy._id,
    });
    member.membershipId = membership._id;
    await member.save();
  }
  await gym.save();

  for (let i = 0; i < 12; i += 1) {
    const date = startOfDay(daysAgo(i));
    for (const trainer of trainers) {
      const skip = i !== 0 && (i + trainer.name.length) % 7 === 0;
      if (skip) continue;
      const checkInTime = atTime(date, 6 + (i % 3), 5 + (i % 20));
      const checkOutTime = atTime(date, 14, 10 + (i % 15));
      await TrainerAttendance.create({
        gymId: gym._id,
        trainerId: trainer._id,
        date,
        checkInTime,
        checkInPhoto: '',
        checkOutTime: i === 0 && trainer.email === 'sneha@fitzone.com' ? null : checkOutTime,
        checkOutPhoto: '',
        status: isLate(checkInTime, '09:00') ? 'late' : 'present',
      });
    }
  }

  console.log('Seed complete.');
  console.log('Owner   : owner@fitzone.com / Owner@123');
  console.log('Trainer : amit@fitzone.com / Trainer@123');
  console.log('          rahul@fitzone.com / Trainer@123');
  console.log('          sneha@fitzone.com / Trainer@123');
  console.log('          rohit@fitzone.com / Trainer@123');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
