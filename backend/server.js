require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectPlatform } = require('./config/platformDatabase');
const { closeAllGymConnections } = require('./config/databaseManager');
const { ensureDir, uploadRoot } = require('./config/cloudStorage');
const { startMembershipReminderJob } = require('./jobs/membershipReminders');

const app = express();

app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));
app.use('/api/trainers', require('./routes/trainerRoutes'));
app.use('/api/membership-plans', require('./routes/membershipPlanRoutes'));
app.use('/api/memberships', require('./routes/membershipRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/trainer-attendance', require('./routes/attendanceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  ensureDir(uploadRoot());
  await connectPlatform();
  app.listen(PORT, () => {
    console.log(`Gym SaaS API running on port ${PORT}`);
    startMembershipReminderJob();
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await closeAllGymConnections();
  process.exit(0);
});
