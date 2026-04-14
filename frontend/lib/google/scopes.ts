/**
 * Google OAuth 2.0 Scopes for Bwaincell
 *
 * Reference: https://developers.google.com/identity/protocols/oauth2/scopes
 */

export const GOOGLE_SCOPES = {
  // User Info (already included in OAuth)
  OPENID: 'openid',
  EMAIL: 'https://www.googleapis.com/auth/userinfo.email',
  PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',

  // Google Calendar
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  CALENDAR: 'https://www.googleapis.com/auth/calendar',
  CALENDAR_EVENTS: 'https://www.googleapis.com/auth/calendar.events',

  // Gmail
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  GMAIL_COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',

  // Google Drive
  DRIVE_READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  DRIVE: 'https://www.googleapis.com/auth/drive',

  // Google Tasks
  TASKS: 'https://www.googleapis.com/auth/tasks',
  TASKS_READONLY: 'https://www.googleapis.com/auth/tasks.readonly',
} as const;

/**
 * Current active scopes for Bwaincell
 * Update this array when adding new Google API integrations
 */
export const ACTIVE_SCOPES = [
  GOOGLE_SCOPES.OPENID,
  GOOGLE_SCOPES.EMAIL,
  GOOGLE_SCOPES.PROFILE,
  // Future: Add Calendar, Gmail, Drive scopes when implementing
];

export type GoogleScope = (typeof GOOGLE_SCOPES)[keyof typeof GOOGLE_SCOPES];
