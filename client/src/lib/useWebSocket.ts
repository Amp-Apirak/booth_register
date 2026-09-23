'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api, { Stats, Participant, AgendaItem, LuckyWinnerData } from './api';

export type { LuckyWinnerData };

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export interface LatestCheckinData {
  fullname: string;
  name?: string;
  company: string;
  position?: string;
  profile_picture?: string;
  attendee_type?: string;
  timestamp?: string;
}

interface WebSocketState {
  socket: Socket | null;
  connected: boolean;
  stats: Stats;
  latestCheckin: LatestCheckinData | null;
  participants: Participant[];
  agenda: AgendaItem[] | null;
  latestWinner: LuckyWinnerData | null;
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    socket: null,
    connected: false,
    stats: { registered: 0, checked_in: 0, pending: 0 },
    latestCheckin: null,
    participants: [],
    agenda: null,
    latestWinner: null,
  });

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected to', SOCKET_URL);
      setState(prev => ({ ...prev, socket, connected: true }));
      // The server only pushes stats when something changes, so load the
      // current numbers on every (re)connect instead of showing zeros.
      api.getStats().then(stats => setState(prev => ({ ...prev, stats })));
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on('overview:update', (data: Stats) => {
      setState(prev => ({ ...prev, stats: data }));
    });

    socket.on('welcome:new_checkin', (data: { fullname?: string; name?: string; company: string; position?: string; timestamp?: string; profile_picture?: string; attendee_type?: string }) => {
      const normalized: LatestCheckinData = {
        fullname: data.fullname || data.name || 'VIP Guest',
        name: data.name || data.fullname || 'VIP Guest',
        company: data.company,
        position: data.position || '',
        profile_picture: data.profile_picture,
        attendee_type: data.attendee_type,
        timestamp: data.timestamp || new Date().toISOString()
      };
      setState(prev => ({ ...prev, latestCheckin: normalized }));
    });

    socket.on('participants:update', (data: { action: string; data: Participant[] }) => {
      setState(prev => ({ ...prev, participants: data.data }));
    });

    socket.on('agenda:update', (data: { event_id: number; items: AgendaItem[] }) => {
      setState(prev => ({ ...prev, agenda: data.items }));
    });

    socket.on('luckydraw:winner_announced', (data: Partial<LuckyWinnerData> & { fullname?: string; prize_name: string }) => {
      setState(prev => ({
        ...prev,
        latestWinner: {
          ...data,
          name: data.name || data.fullname || '',
          company: data.company || '',
          drawn_at: data.drawn_at || new Date().toISOString(),
        },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return state;
}

export default useWebSocket;
