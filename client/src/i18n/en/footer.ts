import type { footer as Th } from '../th/footer';

export const footer: typeof Th = {
  staffSystem: 'Event management system (staff)',
  platformSupport: 'Platform support:',
  organizedBy: (name: string) => `Organized by ${name}`,
  viewMap: 'View map',
  quickLinks: 'Quick links',
  registerLink: 'Register for the event',
  findTicket: 'Find my ticket',
  home: 'Home',
  privacyPdpa: 'Privacy policy (PDPA)',
  help: 'Contact / Help',
  helpFallback: 'Lost your ticket or did not receive the email? Ask staff at the registration desk.',
  platformPitch: 'Want this registration & check-in platform for your event?',
  rightsReserved: 'All rights reserved',
  privacy: 'Privacy policy',
};
