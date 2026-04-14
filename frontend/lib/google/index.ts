/**
 * Google API Integration - Main Export
 *
 * Centralized exports for all Google API clients
 */

export { GoogleApiClient } from './client';
export { GOOGLE_SCOPES, ACTIVE_SCOPES, type GoogleScope } from './scopes';
export { googleCalendar, type CalendarEvent } from './calendar';
export { gmail, type GmailMessage, type GmailThread } from './gmail';
export { googleDrive, type DriveFile, type DriveFolder } from './drive';
