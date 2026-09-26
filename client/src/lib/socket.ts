'use client';

import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './apiBase';

/**
 * One live (Socket.io) connection per browser tab, shared by every component that listens.
 * Screens that need the attendee list (personal data) acquire it with { staff: true }: the
 * connection then presents the staff token and the server adds it to the staff-only channel.
 */
let socket: Socket | null = null;
let holders = 0;
let staffHolders = 0;

const joinStaff = (s: Socket) => {
  const token = localStorage.getItem('staff_token');
  if (token) s.emit('staff:join', token);
};

export function acquireSocket(options: { staff?: boolean } = {}): Socket {
  if (!socket) {
    const created = io(API_BASE, {
      // WebSocket first; networks that block WebSockets fall back to HTTP long-polling
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
    });
    created.on('connect', () => {
      if (staffHolders > 0) joinStaff(created);
    });
    socket = created;
  }
  holders += 1;
  if (options.staff) {
    staffHolders += 1;
    if (socket.connected) joinStaff(socket);
  }
  return socket;
}

export function releaseSocket(options: { staff?: boolean } = {}) {
  if (!socket) return;
  if (options.staff) {
    staffHolders = Math.max(0, staffHolders - 1);
    if (staffHolders === 0) socket.emit('staff:leave');
  }
  holders = Math.max(0, holders - 1);
  if (holders === 0) {
    socket.disconnect();
    socket = null;
  }
}

function subscribeStatus(onChange: () => void) {
  const s = acquireSocket();
  s.on('connect', onChange);
  s.on('disconnect', onChange);
  return () => {
    s.off('connect', onChange);
    s.off('disconnect', onChange);
    releaseSocket();
  };
}

/** true while the live connection to the server is up */
export function useSocketStatus(): boolean {
  return useSyncExternalStore(subscribeStatus, () => socket?.connected ?? false, () => false);
}
