import type { scanner as Th } from '../th/scanner';

export const scanner: typeof Th = {
  title: 'Gate Ticket Scanner',
  subtitle: 'Scan a barcode / QR code to record attendance and show the name on the signage screen',
  beepOff: 'Turn off beep',
  beepOn: 'Turn on beep',
  stats: {
    registered: 'Total registered',
    checkedIn: 'Checked in',
    pending: 'Not arrived yet',
  },
  camera: {
    start: 'Start camera to scan QR',
    stop: 'Stop camera',
    deviceFallback: (n: number) => `Camera ${n}`,
    unsupported: 'This browser cannot open the camera (the page must be opened via localhost or HTTPS).',
    notAllowed: 'Camera access was denied — click the camera icon in the address bar and choose "Allow".',
    notFound: 'No camera found on this device.',
    inUse: 'The camera is being used by another app (e.g. Zoom / Teams).',
    failed: 'Unable to start the camera.',
  },
  form: {
    placeholder: 'Scan a QR code or enter the ticket code here...',
    submit: 'Confirm check-in',
  },
  result: {
    errorTitle: 'Unable to proceed',
    notFound: 'Ticket code not found.',
    alreadyCheckedIn: (name: string, time: string) => `${name} has already checked in${time ? ` at ${time}` : ''}.`,
    alreadyCheckedInUnknown: 'This ticket has already been checked in.',
    connectionError: 'Could not connect to the gateway server.',
  },
};
