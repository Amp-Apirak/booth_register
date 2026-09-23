const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const { testConnection } = require('./config/db');
const settingsRepository = require('./repositories/settingsRepository');
const agendaRepository = require('./repositories/agendaRepository');
const prizeRepository = require('./repositories/prizeRepository');

const PORT = process.env.PORT || 3000;

// Create HTTP Server wrapping the Express app
const server = http.createServer(app);

// Attach Socket.io Engine
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Share Socket.io instance with Express app (for Controllers to broadcast events)
app.set('io', io);

// WebSocket Connection Handlers
io.on('connection', (socket) => {
  console.log(`🔌 New client connected (Socket ID: ${socket.id})`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected (Socket ID: ${socket.id})`);
  });
});

// Boot sequence: verify DB connection, then start listening
(async () => {
  try {
    await testConnection();
    await settingsRepository.initTable();
    await agendaRepository.initTable();
    await prizeRepository.initTable();
  } catch (err) {
    console.warn(`⚠️  Database connection failed on startup: ${err.message}`);
    console.warn(`    Server will start anyway. DB operations will fail until connection is restored.`);
  }

  server.listen(PORT, () => {
    console.log(`==================================================================`);
    console.log(`🚀 Production Server is running on port ${PORT}`);
    console.log(`🏥 Health check:  http://localhost:${PORT}/api/v1/ping`);
    console.log(`📋 Participants:  http://localhost:${PORT}/api/v1/participants`);
    console.log(`==================================================================`);
  });
})();

module.exports = { server, io };
