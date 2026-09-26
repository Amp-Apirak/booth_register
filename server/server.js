const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const { testConnection } = require('./config/db');
const settingsRepository = require('./repositories/settingsRepository');
const agendaRepository = require('./repositories/agendaRepository');
const prizeRepository = require('./repositories/prizeRepository');
const organizationTypeRepository = require('./repositories/organizationTypeRepository');
const { attachRealtime } = require('./utils/realtime');

const PORT = process.env.PORT || 3000;

// Create HTTP Server wrapping the Express app
const server = http.createServer(app);

// Attach Socket.io Engine
const io = socketIo(server, {
  cors: {
    origin: app.get('corsOrigin'),
    methods: ["GET", "POST"]
  }
});

// Share Socket.io instance with Express app (for Controllers to broadcast events)
app.set('io', io);

// WebSocket: public screens get public events, logged-in staff screens also get the attendee list
attachRealtime(io);

// Boot sequence: verify DB connection, then start listening
(async () => {
  try {
    await testConnection();
    await settingsRepository.initTable();
    await agendaRepository.initTable();
    await prizeRepository.initTable();
    await organizationTypeRepository.initTable();
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
