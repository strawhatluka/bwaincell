import { GoogleCalendarClient, googleCalendar } from '@/lib/google/calendar';

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));

describe('GoogleCalendarClient (stub)', () => {
  const client = new GoogleCalendarClient();

  it('listEvents throws not implemented', async () => {
    await expect(client.listEvents()).rejects.toThrow(/not yet implemented/);
    await expect(client.listEvents({ maxResults: 10 })).rejects.toThrow(/not yet implemented/);
  });

  it('createEvent throws not implemented', async () => {
    await expect(client.createEvent({ summary: 'x' })).rejects.toThrow(/not yet implemented/);
  });

  it('updateEvent throws not implemented', async () => {
    await expect(client.updateEvent('id', { summary: 'x' })).rejects.toThrow(/not yet implemented/);
  });

  it('deleteEvent throws not implemented', async () => {
    await expect(client.deleteEvent('id')).rejects.toThrow(/not yet implemented/);
  });

  it('exports a default instance', () => {
    expect(googleCalendar).toBeInstanceOf(GoogleCalendarClient);
  });
});
