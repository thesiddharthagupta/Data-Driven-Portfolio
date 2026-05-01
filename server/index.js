require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const routes = require('./routes');
const githubSync = require('./githubSync');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve static frontend files (optional, but good for production)
// app.use(express.static('public'));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Start Cron Job: Every 10 minutes
cron.schedule('*/10 * * * *', () => {
    console.log('Running scheduled GitHub sync...');
    githubSync.syncRepositories();
});

// Start Server
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Portfolio Backend running on port ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`📅 Auto-sync scheduled: every 10 minutes`);
    console.log(`========================================`);
});
