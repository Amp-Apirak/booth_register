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
    publicHint: 'Enter your ticket code (in your registration e-mail) and the last 4 digits of the phone number you registered with.',
    codeLabel: 'Ticket code',
    verifierLabel: 'Last 4 phone digits or e-mail',
    verifierPlaceholder: 'e.g. 5678',
    notFoundPublic: 'No ticket found, or the phone/e-mail does not match the registration.',
    tooManyAttempts: 'Too many tries. Please wait about 15 minutes or ask the staff at the event.',
    fieldsRequired: 'Please enter the ticket code and the last 4 phone digits (or your e-mail).',
  },
  pass: {
    copy: 'Copy',
    codeCopied: 'Code copied',
    dateTime: 'Date & time',
    venue: 'Venue',
  },
  actions: {
    savingImage: 'Saving image...',
    saveToPhone: 'Save ticket to phone',
    printOrPdf: 'Print ticket / Save as PDF',
  },
};
