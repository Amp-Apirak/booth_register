import type { home as Th } from '../th/home';

export const home: typeof Th = {
  hero: {
    ariaLabel: 'Welcome to the event',
    logoAlt: 'Event logo',
    motionResume: 'Turn animations on',
    motionPause: 'Pause animations',
    effectsResume: 'Resume effects',
    effectsPause: 'Pause effects',
    taglineLead: 'Every meeting',
    taglineAccent: 'creates new possibilities',
    // Trailing space is intentional: the line break is hidden on small screens and the words must not run together
    descriptionLead: 'Connect with people, find inspiration and ',
    descriptionTail: 'be part of a special experience from the moment you arrive.',
    enter: 'Enter the experience',
    register: 'Register for the event',
    registerNow: 'Register now',
    findTicket: 'Find my ticket',
    readyNote: 'All set — start your experience now',
    replay: 'Watch the intro again',
    sampleTicket: 'Sample ticket · PREVIEW',
    checkInNote: 'Every meeting starts with ease',
  },
  journey: {
    register: 'Easy registration',
    checkIn: 'Instant check-in',
    enjoy: 'Enjoy every moment',
  },
  stats: {
    registered: 'Registrations',
    registeredNote: 'All registered attendees',
    checkedIn: 'Checked in',
    checkedInNote: 'Scanned in at the gate',
    pendingNote: 'On their way',
  },
  modules: {
    title: 'Operations center & system menu',
    subtitle: 'Pick a module to open and try out the workflow',
    open: 'Go to page',
    register: {
      title: 'Online registration',
      desc: 'Register for the seminar in advance, with consent collected under the Personal Data Protection Act (PDPA).',
    },
    ticket: {
      title: 'Digital ticket',
      desc: 'Show your Digital Pass with an encrypted QR code, ready to be scanned at the venue.',
    },
    scanner: {
      title: 'Gate scanner',
      desc: 'Gate scanning for staff: verifies a ticket in 0.1 seconds and blocks duplicate scans.',
    },
    signage: {
      title: 'On-site LED signage',
      desc: "A live LED welcome board that shows each attendee's name and company the moment they scan in.",
    },
    luckyDraw: {
      title: 'Lucky draw wheel',
      desc: 'Draws winners only from checked-in attendees, automatically excluding staff and previous winners.',
    },
    dashboard: {
      title: 'CMS dashboard',
      desc: 'Control center for organizers: live stats, show-up rate charts, attendee lists and data export.',
    },
  },
  backdrop: {
    resume: 'Resume background',
    pause: 'Pause background',
    pauseAria: 'Pause background animation',
  },
};
