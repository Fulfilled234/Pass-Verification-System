require('dotenv').config();
const app = require('./app');

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Pass & Verification API listening on port ${PORT}`);
});
