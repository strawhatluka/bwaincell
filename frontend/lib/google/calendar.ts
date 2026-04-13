/**
 * Google Calendar API Client (STUB)
 *
 * Future implementation for Google Calendar integration
 * Requires CALENDAR scope to be added to OAuth configuration
 */

import { GoogleApiClient } from './client';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export class GoogleCalendarClient extends GoogleApiClient {
  /**
   * List events from primary calendar
   * TODO: Implement when Calendar scope is added
   */
  async listEvents(_params?: {
    maxResults?: number;
    timeMin?: string;
    timeMax?: string;
  }): Promise<CalendarEvent[]> {
    throw new Error('Google Calendar integration not yet implemented');
    // Future implementation:
    // const response = await this.get<{ items: CalendarEvent[] }>(
    //   '/calendar/v3/calendars/primary/events'
    // );
    // return response.items;
  }

  /**
   * Create calendar event
   * TODO: Implement when Calendar scope is added
   */
  async createEvent(_event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    throw new Error('Google Calendar integration not yet implemented');
    // Future implementation:
    // return this.post<CalendarEvent>(
    //   '/calendar/v3/calendars/primary/events',
    //   event
    // );
  }

  /**
   * Update calendar event
   * TODO: Implement when Calendar scope is added
   */
  async updateEvent(_eventId: string, _event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    throw new Error('Google Calendar integration not yet implemented');
    // Future implementation:
    // return this.patch<CalendarEvent>(
    //   `/calendar/v3/calendars/primary/events/${eventId}`,
    //   event
    // );
  }

  /**
   * Delete calendar event
   * TODO: Implement when Calendar scope is added
   */
  async deleteEvent(_eventId: string): Promise<void> {
    throw new Error('Google Calendar integration not yet implemented');
    // Future implementation:
    // return this.delete<void>(
    //   `/calendar/v3/calendars/primary/events/${eventId}`
    // );
  }
}

export const googleCalendar = new GoogleCalendarClient();
