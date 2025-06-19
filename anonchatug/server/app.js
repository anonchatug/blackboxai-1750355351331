const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    serveClient: true,
    path: '/socket.io'
});

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Session middleware for admin pages
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret123',
    resave: false,
    saveUninitialized: true
}));

// Parse JSON bodies
app.use(express.json());

// Import admin routes
const adminRoutes = require('./routes/admin');

// Serve static assets from public folder
app.use('/', express.static(path.join(__dirname, '../public')));

// Admin routes
app.use('/admin', adminRoutes.router);

// Handle all routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// In-memory storage (replace with database in production)
let waitingUsers = { male: null, female: null };
let activeRooms = new Map();

// Helper: Get location info based on IP
async function getLocation(ipAddress) {
    try {
        const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
        const data = await response.json();
        return {
            city: data.city || 'Unknown',
            country: data.country || 'Unknown'
        };
    } catch (err) {
        console.error('Error fetching location:', err);
        return { city: 'Unknown', country: 'Unknown' };
    }
}

io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);
    
    // Store client's location
    const clientIp = socket.handshake.address;
    socket.location = await getLocation(clientIp);

    // Handle join requests
    socket.on('join', (data) => {
        const { gender } = data;
        const oppositeGender = gender === 'male' ? 'female' : 'male';
        
        if (waitingUsers[oppositeGender]) {
            // Match found - create a room
            const roomId = uuidv4();
            const partner = waitingUsers[oppositeGender];
            
            socket.join(roomId);
            partner.join(roomId);
            
            // Store room information
            activeRooms.set(roomId, {
                users: [socket.id, partner.id],
                startTime: new Date()
            });
            
            // Send room joined event with partner locations
            io.to(roomId).emit('roomJoined', {
                roomId,
                partnerLocations: {
                    [socket.id]: socket.location,
                    [partner.id]: partner.location
                }
            });
            
            waitingUsers[oppositeGender] = null;
        } else {
            // No match - add to waiting queue
            waitingUsers[gender] = socket;
            socket.emit('waiting');
        }
    });

    // Handle WebRTC signaling
    socket.on('signal', (data) => {
        socket.to(data.room).emit('signal', {
            ...data.signal,
            from: socket.id
        });
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        socket.to(data.room).emit('chatMessage', {
            message: data.message,
            from: socket.id,
            timestamp: new Date()
        });
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing', { userId: socket.id });
    });

    socket.on('stopTyping', (data) => {
        socket.to(data.room).emit('stopTyping', { userId: socket.id });
    });

    // Handle user reports
    socket.on('report', (data) => {
        const report = {
            reporterId: socket.id,
            reportedId: data.reportedId,
            reason: data.reason,
            details: data.details,
            roomId: data.roomId,
            timestamp: new Date()
        };
        
        // In production, save to database
        console.log('New report:', report);
        
        // Notify admins if online
        io.to('admin').emit('newReport', report);
        
        // Acknowledge report
        socket.emit('reportAcknowledged', {
            message: 'Report submitted successfully'
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove from waiting queues if present
        if (waitingUsers.male === socket) waitingUsers.male = null;
        if (waitingUsers.female === socket) waitingUsers.female = null;
        
        // Notify partner if in active room
        for (const [roomId, room] of activeRooms.entries()) {
            if (room.users.includes(socket.id)) {
                const partnerId = room.users.find(id => id !== socket.id);
                if (partnerId) {
                    io.to(partnerId).emit('partnerDisconnected');
                }
                activeRooms.delete(roomId);
                break;
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
