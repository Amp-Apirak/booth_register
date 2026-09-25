import type { luckyDraw as Th } from '../th/luckyDraw';

export const luckyDraw: typeof Th = {
  title: 'Lucky Draw Wheel',
  subtitle: 'Draw lucky winners from attendees who have checked in',
  soundOff: 'Turn off sound FX',
  soundOn: 'Turn on sound FX',
  eligible: (n: number) => `${n} eligible for the draw`,
  prizes: {
    selectLabel: 'Select the prize to draw:',
    remaining: (n: number) => `${n} left`,
    empty: 'No active prizes yet. Add them in Settings › Manage prizes.',
    fallbackName: 'Special prize',
    fallbackDescription: 'Please add prizes on the Settings page.',
  },
  stage: {
    prizeWon: 'Prize won',
    readyRemaining: (n: number) => `Ready to draw · ${n} left`,
    spin: 'SPIN • Draw a winner',
    spinning: 'Drawing a name...',
  },
  winners: {
    title: 'Prize winners',
    noCompany: 'Company not specified',
  },
};
