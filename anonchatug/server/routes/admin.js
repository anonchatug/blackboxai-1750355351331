const express = require('express');
const router = express.Router();

// In-memory storage for demo purposes
// In production, use a proper database
const adminCredentials = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Store banned users and reports in memory
// In production, use a database
const bannedUsers = new Set();
const reports = new Map();
let stats = {
    activeUsers: 0,
    activeChats: 0,
    reportsToday: 0,
    totalReports: 0
};

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Check authentication status
router.get('/check-auth', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === adminCredentials.username && 
        password === adminCredentials.password) {
        req.session.isAdmin = true;
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.status(200).json({ message: 'Logged out successfully' });
});

// Get reports
router.get('/reports', requireAuth, (req, res) => {
    res.json(Array.from(reports.values()));
});

// Get stats
router.get('/stats', requireAuth, (req, res) => {
    res.json(stats);
});

// Ban user
router.post('/ban-user', requireAuth, (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    bannedUsers.add(userId);

    // Update related reports
    reports.forEach((report) => {
        if (report.reportedId === userId) {
            report.status = 'resolved';
        }
    });

    res.status(200).json({ message: 'User banned successfully' });
});

// Check if user is banned
router.get('/check-banned/:userId', (req, res) => {
    const { userId } = req.params;
    res.json({ banned: bannedUsers.has(userId) });
});

// Update stats
const updateStats = (newStats) => {
    stats = { ...stats, ...newStats };
};

// Export router and utilities
module.exports = {
    router,
    bannedUsers,
    reports,
    updateStats,
    requireAuth
};
