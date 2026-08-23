require('dotenv').config();
const app = require('./src/app');
const connectDb = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`ApexFit API running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
