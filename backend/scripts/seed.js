require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectPlatform } = require('../config/platformDatabase');
const { createAndCacheGymConnection, closeAllGymConnections } = require('../config/databaseManager');
const { registerGymModels } = require('../models/gym');
const { encrypt } = require('../services/encryptionService');
const { addDays, startOfDay } = require('../utils/dates');
const Gym = require('../models/platform/Gym');
const GymDatabaseConnection = require('../models/platform/GymDatabaseConnection');
const PlatformAdmin = require('../models/platform/PlatformAdmin');

const { withDatabase } = require('../utils/mongoUri');

const tenantUri = (slug) => {
  const base =
    process.env.MONGODB_TENANT_BASE_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017';
  return withDatabase(base, `gym_${slug}`);
};

const seedGym = async ({ gym, owner, branches, trainers, members }) => {
  const GymModel = Gym();
  const ConnectionModel = GymDatabaseConnection();
  await GymModel.deleteOne({ slug: gym.slug });

  const created = await GymModel.create(gym);
  const uri = tenantUri(gym.slug);
  const connRecord = await ConnectionModel.create({
    gymId: created._id,
    encryptedConnectionString: encrypt(uri),
    databaseName: `gym_${gym.slug}`,
    status: 'active',
  });
  created.databaseConnectionId = connRecord._id;
  await created.save();

  const connection = await createAndCacheGymConnection(created._id, uri);
  await connection.dropDatabase();
  const models = registerGymModels(connection);

  const branchDocs = {};
  for (const [index, branch] of branches.entries()) {
    branchDocs[branch.key] = await models.Branch.create({
      name: branch.name,
      branchCode: `BR${String(index + 1).padStart(3, '0')}`,
      city: branch.city,
      state: branch.state,
      address: branch.address,
      phone: branch.phone,
      status: 'active',
    });
  }

  const hashedOwner = await bcrypt.hash(owner.password, 10);
  await models.User.create({
    name: owner.name,
    email: owner.email,
    password: hashedOwner,
    role: 'OWNER',
    isActive: true,
  });

  const plans = await models.MembershipPlan.create([
    { name: 'Monthly', durationValue: 1, durationUnit: 'month', price: 1500, status: 'active' },
    { name: 'Quarterly', durationValue: 3, durationUnit: 'month', price: 4000, status: 'active' },
    { name: 'Yearly', durationValue: 1, durationUnit: 'year', price: 14000, status: 'active' },
  ]);

  const trainerDocs = {};
  for (const trainer of trainers) {
    const hashed = await bcrypt.hash(trainer.password, 10);
    const user = await models.User.create({
      name: trainer.name,
      email: trainer.email,
      password: hashed,
      role: 'TRAINER',
      branchId: branchDocs[trainer.branchKey]._id,
      isActive: true,
    });
    const doc = await models.Trainer.create({
      userId: user._id,
      branchId: branchDocs[trainer.branchKey]._id,
      name: trainer.name,
      email: trainer.email,
      phone: trainer.phone,
      specialization: trainer.specialization,
      experience: trainer.experience,
      joiningDate: addDays(new Date(), -120),
      status: 'active',
    });
    user.trainerId = doc._id;
    await user.save();
    trainerDocs[trainer.key] = doc;
  }

  let i = 1;
  for (const member of members) {
    const start = member.daysAgo ? addDays(new Date(), -member.daysAgo) : new Date();
    const expiry = addDays(start, member.durationDays || 30);
    const branchId = branchDocs[member.branchKey]._id;
    const createdBy = trainerDocs[member.createdByKey]?._id || null;
    const assigned = trainerDocs[member.assignedKey]?._id || createdBy;
    const plan = plans[member.planIndex || 0];
    const mem = await models.Member.create({
      memberCode: `MEM-${String(i).padStart(4, '0')}`,
      branchId,
      name: member.name,
      phone: member.phone,
      email: member.email,
      gender: member.gender || 'male',
      createdByTrainerId: createdBy,
      assignedTrainerId: assigned,
      joiningDate: start,
      expiryDate: expiry,
      status: expiry < startOfDay() ? 'expired' : 'active',
    });
    const membership = await models.Membership.create({
      memberId: mem._id,
      branchId,
      membershipPlanId: plan._id,
      startDate: start,
      expiryDate: expiry,
      status: expiry < startOfDay() ? 'expired' : 'active',
      createdByTrainerId: createdBy,
    });
    mem.membershipId = membership._id;
    await mem.save();
    i += 1;
  }

  for (const trainer of Object.values(trainerDocs)) {
    const present = Math.random() > 0.25;
    if (!present) continue;
    const checkIn = new Date();
    checkIn.setHours(6 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 50), 0, 0);
    await models.TrainerAttendance.create({
      branchId: trainer.branchId,
      trainerId: trainer._id,
      date: startOfDay(),
      checkInTime: checkIn,
      status: checkIn.getHours() >= 10 ? 'late' : 'present',
    });
  }

  return created;
};

const run = async () => {
  await connectPlatform();
  const GymModel = Gym();
  const ConnectionModel = GymDatabaseConnection();
  const AdminModel = PlatformAdmin();
  await GymModel.deleteMany({});
  await ConnectionModel.deleteMany({});
  await AdminModel.deleteMany({});

  const adminHash = await bcrypt.hash('Admin@12345', 10);
  await AdminModel.create({
    name: 'Platform Admin',
    email: 'admin@platform.local',
    password: adminHash,
  });

  await seedGym({
    gym: {
      name: 'FitZone',
      slug: 'fitzone',
      ownerName: 'Arjun Mehta',
      email: 'owner@fitzone.local',
      phone: '9876500001',
      status: 'active',
    },
    owner: { name: 'Arjun Mehta', email: 'owner@fitzone.local', password: 'Owner@123' },
    branches: [
      { key: 'pune', name: 'Pune Main Branch', city: 'Pune', state: 'Maharashtra', address: 'FC Road', phone: '0201111111' },
      { key: 'mumbai', name: 'Mumbai Branch', city: 'Mumbai', state: 'Maharashtra', address: 'Andheri West', phone: '0222222222' },
      { key: 'nagpur', name: 'Nagpur Branch', city: 'Nagpur', state: 'Maharashtra', address: 'Dharampeth', phone: '0712222333' },
    ],
    trainers: [
      { key: 'amit', branchKey: 'pune', name: 'Amit', email: 'amit@fitzone.local', password: 'Trainer@123', phone: '9000000001', specialization: 'Strength', experience: '5 years' },
      { key: 'rahul', branchKey: 'pune', name: 'Rahul', email: 'rahul@fitzone.local', password: 'Trainer@123', phone: '9000000002', specialization: 'Cardio', experience: '4 years' },
      { key: 'sneha', branchKey: 'mumbai', name: 'Sneha', email: 'sneha@fitzone.local', password: 'Trainer@123', phone: '9000000003', specialization: 'Yoga', experience: '6 years' },
      { key: 'rohit', branchKey: 'mumbai', name: 'Rohit', email: 'rohit@fitzone.local', password: 'Trainer@123', phone: '9000000004', specialization: 'HIIT', experience: '3 years' },
      { key: 'karan', branchKey: 'nagpur', name: 'Karan', email: 'karan@fitzone.local', password: 'Trainer@123', phone: '9000000005', specialization: 'CrossFit', experience: '4 years' },
    ],
    members: [
      { name: 'Rahul Sharma', phone: '9811111111', email: 'rs@demo.local', branchKey: 'pune', createdByKey: 'amit', assignedKey: 'rahul', daysAgo: 10, durationDays: 30 },
      { name: 'Vijay Patil', phone: '9811111112', email: 'vp@demo.local', branchKey: 'pune', createdByKey: 'amit', assignedKey: 'amit', daysAgo: 40, durationDays: 30 },
      { name: 'Karan Joshi', phone: '9811111113', email: 'kj@demo.local', branchKey: 'pune', createdByKey: 'rahul', assignedKey: 'rahul', daysAgo: 5, durationDays: 8 },
      { name: 'Sneha Kulkarni', phone: '9811111114', email: 'sk@demo.local', branchKey: 'pune', createdByKey: 'amit', assignedKey: 'rahul', daysAgo: 2, durationDays: 90 },
      { name: 'Vijay Nair', phone: '9822222221', email: 'vn@demo.local', branchKey: 'mumbai', createdByKey: 'sneha', assignedKey: 'rohit', daysAgo: 12, durationDays: 30 },
      { name: 'Meera Shah', phone: '9822222222', email: 'ms@demo.local', branchKey: 'mumbai', createdByKey: 'sneha', assignedKey: 'sneha', daysAgo: 80, durationDays: 30 },
      { name: 'Rohit Desai', phone: '9822222223', email: 'rd@demo.local', branchKey: 'mumbai', createdByKey: 'rohit', assignedKey: 'rohit', daysAgo: 3, durationDays: 6 },
      { name: 'Karan Gupta', phone: '9833333331', email: 'kg@demo.local', branchKey: 'nagpur', createdByKey: 'karan', assignedKey: 'karan', daysAgo: 20, durationDays: 30 },
      { name: 'Ananya Rao', phone: '9833333332', email: 'ar@demo.local', branchKey: 'nagpur', createdByKey: 'karan', assignedKey: 'karan', daysAgo: 50, durationDays: 30 },
    ],
  });

  await seedGym({
    gym: {
      name: 'Iron House',
      slug: 'ironhouse',
      ownerName: 'Neha Kapoor',
      email: 'owner@ironhouse.local',
      phone: '9876500002',
      status: 'active',
    },
    owner: { name: 'Neha Kapoor', email: 'owner@ironhouse.local', password: 'Owner@123' },
    branches: [
      { key: 'delhi', name: 'Delhi Branch', city: 'Delhi', state: 'Delhi', address: 'CP', phone: '0111111111' },
      { key: 'noida', name: 'Noida Branch', city: 'Noida', state: 'UP', address: 'Sector 18', phone: '0120222333' },
    ],
    trainers: [
      { key: 'dev', branchKey: 'delhi', name: 'Dev', email: 'dev@ironhouse.local', password: 'Trainer@123', phone: '9100000001', specialization: 'Powerlifting', experience: '7 years' },
      { key: 'isha', branchKey: 'noida', name: 'Isha', email: 'isha@ironhouse.local', password: 'Trainer@123', phone: '9100000002', specialization: 'Zumba', experience: '4 years' },
    ],
    members: [
      { name: 'Aakash Singh', phone: '9844444441', email: 'as@demo.local', branchKey: 'delhi', createdByKey: 'dev', assignedKey: 'dev', daysAgo: 8, durationDays: 30 },
      { name: 'Priya Verma', phone: '9844444442', email: 'pv@demo.local', branchKey: 'noida', createdByKey: 'isha', assignedKey: 'isha', daysAgo: 70, durationDays: 30 },
    ],
  });

  console.log('Seed complete.');
  console.log('Gym A  slug=fitzone     owner@fitzone.local     Owner@123');
  console.log('        trainer amit@fitzone.local              Trainer@123');
  console.log('Gym B  slug=ironhouse   owner@ironhouse.local   Owner@123');

  await closeAllGymConnections();
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
