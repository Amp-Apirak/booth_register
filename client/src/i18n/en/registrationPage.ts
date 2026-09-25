import type { registrationPage as Th } from '../th/registrationPage';

export const registrationPage: typeof Th = {
  title: 'Registration page content',
  subtitle: 'Set the promo images, event details, objectives and terms that applicants see before they register.',
  images: {
    hero: 'Top hero banner',
    brochure: 'Brochure image (bottom)',
    remove: 'Remove image',
    upload: 'Click to upload and position the image',
    formats: 'JPG, PNG, WebP up to 5 MB',
  },
  intro: 'About the event',
  introPlaceholder: 'Give an overview of the event and its highlights...',
  objectives: 'Event objectives',
  objectivesPlaceholder: 'One objective per line, e.g.\nMeet technology experts\nBuild business connections',
  terms: 'Terms & important information',
  termsPlaceholder: 'One condition per line, e.g.\nPlease show your QR code at the registration desk\nPre-registered attendees only',
  save: 'Save registration page',
  crop: {
    titleHero: 'Resize and position the hero banner',
    titleBrochure: 'Resize and position the brochure image',
    hint: 'Drag and zoom until the important content is inside the frame.',
    zoom: 'Zoom',
    apply: 'Use this image',
  },
  alerts: {
    fileTooLargeTitle: 'File is too large',
    fileTooLargeText: 'Please use a JPG, PNG or WebP file of 5 MB or less.',
    cropFailedTitle: 'Could not adjust the image',
    cropFailedText: 'Please try choosing the image file again.',
    savedTitle: 'Registration page saved',
    saveFailedTitle: 'Could not save',
    checkConnection: 'Please check your connection.',
  },
};
