import type { signage as Th } from '../th/signage';

export const signage: typeof Th = {
  controls: {
    title: 'LED signage mode',
    subtitle: 'Pick what this display shows, then go full screen',
    tabs: {
      welcome: 'Welcome',
      overview: 'Live overview',
      agenda: 'Agenda',
      lucky: 'Lucky draw',
    },
    fullscreen: 'Full screen',
    fullscreenHint: 'Show this screen full screen (exit with the top-right button or ESC)',
    exitFullscreen: 'Exit full screen',
    live: 'Live',
    offline: 'Offline',
    reconnecting: 'Connection lost — reconnecting',
  },
  welcome: {
    waiting: 'Waiting for attendees to scan in at the entrance...',
  },
  overview: {
    subtitle: 'Real-time attendance overview',
    registered: 'Total registered',
    checkedIn: 'Checked in',
    pending: 'Not arrived yet',
    showUpHint: 'Actual attendance rate right now',
    latestCheckin: 'Latest check-in',
  },
  agenda: {
    emptyTitle: 'No agenda for today',
    emptyHint: 'This screen only shows sessions scheduled for today. Please check the dates in Settings.',
    nowOn: 'Now on',
    upNext: 'Up next',
    morePast: (n: number) => `↑ Scroll up to see ${n} earlier ${n === 1 ? 'session' : 'sessions'}`,
  },
  lucky: {
    trophyAlt: 'Lucky Draw trophy',
    getReady: 'Get ready for the grand prize draw',
    goodLuck: 'Good luck, everyone!',
    spinHint: 'Press SPIN on the control panel to start the wheel',
    won: 'Won',
  },
};
