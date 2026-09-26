const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const participantRepository = require('../repositories/participantRepository');

// Sockets of logged-in staff screens (dashboard). Only they receive the attendee list (personal data).
const STAFF_ROOM = 'staff';

/**
 * Every browser tab keeps one connection. Public screens (LED, register, home) receive only public
 * events; a staff screen sends 'staff:join' with its login token to also receive the attendee list.
 */
function attachRealtime(io) {
  io.on('connection', (socket) => {
    socket.on('staff:join', (token, ack) => {
      try {
        socket.data.user = jwt.verify(String(token || ''), JWT_SECRET);
        socket.join(STAFF_ROOM);
        if (typeof ack === 'function') ack({ ok: true });
      } catch {
        socket.leave(STAFF_ROOM);
        if (typeof ack === 'function') ack({ ok: false });
      }
    });
    socket.on('staff:leave', () => socket.leave(STAFF_ROOM));
  });
}

/** Sends the full attendee list to staff screens whose login is still valid (skips the query when none listen) */
async function broadcastParticipants(io, action) {
  if (!io) return;
  const now = Date.now() / 1000;
  const sockets = await io.in(STAFF_ROOM).fetchSockets();
  const active = sockets.filter((s) => {
    if ((s.data.user?.exp || 0) > now) return true;
    s.leave(STAFF_ROOM); // login expired
    return false;
  });
  if (active.length === 0) return;
  const payload = { action, data: await participantRepository.getAll() };
  for (const s of active) s.emit('participants:update', payload);
}

module.exports = { attachRealtime, broadcastParticipants, STAFF_ROOM };
