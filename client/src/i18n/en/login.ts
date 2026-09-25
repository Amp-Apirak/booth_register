import type { login as Th } from '../th/login';

export const login: typeof Th = {
  subtitle: (eventName: string) => `Log in to manage ${eventName}`,
  submit: 'Log in',
  submitting: 'Logging in...',
  wrongPassword: 'Incorrect password',
  connectionError: 'Cannot connect to the server (please check that the backend is running on port 3005).',
  errors: {
    MISSING_CREDENTIALS: 'Please enter your username and password.',
    INVALID_CREDENTIALS: 'Incorrect username or password.',
    ACCOUNT_DISABLED: 'This account has been disabled.',
    SERVER_ERROR: 'Something went wrong on the server. Please try again.',
  },
};
