import type { ticket as Th } from '../th/ticket';

export const ticket: typeof Th = {
  title: 'Digital event pass',
  subtitle: 'Show this digital pass to staff at the entrance to scan your QR code for check-in.',
  search: {
    placeholder: 'Ticket code, phone number or name',
    searching: 'Searching...',
    submit: 'Find ticket',
    notFound: 'We could not find this ticket. Please check the ticket code, phone number or name and try again.',
    connectionError: 'A connection error occurred.',
  },
  pass: {
    copy: 'Copy',
    codeCopied: 'Code copied',
    dateTime: 'Date & time',
    venue: 'Venue',
    fallbackDate: '30 August 2026',
    fallbackTime: '09:00 - 17:00',
  },
  actions: {
    savingImage: 'Saving image...',
    saveToPhone: 'Save ticket to phone',
    printOrPdf: 'Print ticket / Save as PDF',
  },
};
