require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const routes = require('./routes');
const githubSync = require('./githubSync');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve frontend assets securely
const rootDir = path.join(__dirname, '../');
app.get('/', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(rootDir, 'admin/index.html')));
// Serve static assets, excluding sensitive files
app.use(express.static(rootDir, {
    index: false, // Don't serve index.html automatically
    setHeaders: (res, path) => {
        const filename = path.split(/[\\/]/).pop().toLowerCase();
        const sensitiveFiles = ['.env', 'package.json', 'package-lock.json', 'migration.sql', 'config.js'];
        const sensitiveDirs = ['/server/', '/admin/index.html', '/.git/'];
        
        if (sensitiveFiles.includes(filename) || sensitiveDirs.some(dir => path.includes(dir))) {
            res.status(403).end();
        }
    }
}));

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
