'use client';

import { useEffect, useState } from 'react';
import api, { Stats, Participant, AgendaItem, LuckyWinnerData } from './api';
import { acquireSocket, releaseSocket, useSocketStatus } from './socket';

export type { LuckyWinnerData };

export interface LatestCheckinData {
  fullname: string;
  name?: string;
  company: string;
  position?: string;
  profile_picture?: string;
  attendee_type?: string;
  timestamp?: string;
}

interface LiveData {
  stats: Stats;
  latestCheckin: LatestCheckinData | null;
  participants: Participant[] | null; // full list from the last `participants:update` (staff screens only; null until one arrives)
  agenda: AgendaItem[] | null;
  latestWinner: LuckyWinnerData | null;
}

const INITIAL: LiveData = {
  stats: { registered: 0, checked_in: 0, pending: 0 },
  latestCheckin: null,
  participants: null,
  agenda: null,
  latestWinner: null,
};

/**
 * Live event data over the tab's shared connection (lib/socket.ts).
 * { staff: true } also receives the attendee list; only logged-in staff pages ask for it.
 */
export function useWebSocket(options: { staff?: boolean } = {}) {
  const staff = !!options.staff;
  const connected = useSocketStatus();
  const [data, setData] = useState<LiveData>(INITIAL);

  useEffect(() => {
    const socket = acquireSocket({ staff });

    // The server only pushes stats when something changes: load the current numbers on every (re)connect
    const loadStats = () => {
      api.getStats().then((stats) => setData((prev) => ({ ...prev, stats })));
    };
    const onOverview = (stats: Stats) => setData((prev) => ({ ...prev, stats }));
    const onCheckin = (raw: { fullname?: string; name?: string; company: string; position?: string; timestamp?: string; profile_picture?: string; attendee_type?: string }) => {
      const latestCheckin: LatestCheckinData = {
        fullname: raw.fullname || raw.name || 'VIP Guest',
        name: raw.name || raw.fullname || 'VIP Guest',
        company: raw.company,
        position: raw.position || '',
        profile_picture: raw.profile_picture,
        attendee_type: raw.attendee_type,
        timestamp: raw.timestamp || new Date().toISOString(),
      };
      setData((prev) => ({ ...prev, latestCheckin }));
    };
    const onParticipants = (payload: { action: string; data: Participant[] }) => setData((prev) => ({ ...prev, participants: payload.data }));
    const onAgenda = (payload: { event_id: number; items: AgendaItem[] }) => setData((prev) => ({ ...prev, agenda: payload.items }));
    const onWinner = (raw: Partial<LuckyWinnerData> & { fullname?: string; prize_name: string }) => setData((prev) => ({
      ...prev,
      latestWinner: {
        ...raw,
        name: raw.name || raw.fullname || '',
        company: raw.company || '',
        drawn_at: raw.drawn_at || new Date().toISOString(),
      },
    }));

    socket.on('connect', loadStats);
    socket.on('overview:update', onOverview);
    socket.on('welcome:new_checkin', onCheckin);
    socket.on('participants:update', onParticipants);
    socket.on('agenda:update', onAgenda);
    socket.on('luckydraw:winner_announced', onWinner);
    if (socket.connected) loadStats();

    return () => {
      socket.off('connect', loadStats);
      socket.off('overview:update', onOverview);
      socket.off('welcome:new_checkin', onCheckin);
      socket.off('participants:update', onParticipants);
      socket.off('agenda:update', onAgenda);
      socket.off('luckydraw:winner_announced', onWinner);
      releaseSocket({ staff });
    };
  }, [staff]);

  return { ...data, connected };
}

export default useWebSocket;
