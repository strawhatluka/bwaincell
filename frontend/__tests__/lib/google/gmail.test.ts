import { GmailClient, gmail } from '@/lib/google/gmail';

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));

describe('GmailClient (stub)', () => {
  const client = new GmailClient();

  it('listMessages throws not implemented', async () => {
    await expect(client.listMessages()).rejects.toThrow(/not yet implemented/);
    await expect(client.listMessages({ maxResults: 5 })).rejects.toThrow(/not yet implemented/);
  });

  it('getMessage throws not implemented', async () => {
    await expect(client.getMessage('id')).rejects.toThrow(/not yet implemented/);
  });

  it('sendMessage throws not implemented', async () => {
    await expect(client.sendMessage({ to: 'a@b.com', subject: 's', body: 'b' })).rejects.toThrow(
      /not yet implemented/
    );
  });

  it('createRawMessage encodes RFC 2822 message (base64url)', () => {
    const raw = (
      client as unknown as {
        createRawMessage: (p: {
          to: string;
          subject: string;
          body: string;
          from?: string;
        }) => string;
      }
    ).createRawMessage({
      to: 'recipient@example.com',
      subject: 'Hello',
      body: 'Body text',
      from: 'sender@example.com',
    });
    expect(typeof raw).toBe('string');
    expect(raw).not.toMatch(/[+/=]/); // base64url: no +, /, or =
    const decoded = globalThis.atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    expect(decoded).toContain('From: sender@example.com');
    expect(decoded).toContain('To: recipient@example.com');
    expect(decoded).toContain('Subject: Hello');
    expect(decoded).toContain('Body text');
  });

  it('createRawMessage defaults from to "me"', () => {
    const raw = (
      client as unknown as {
        createRawMessage: (p: { to: string; subject: string; body: string }) => string;
      }
    ).createRawMessage({
      to: 'r@e.com',
      subject: 's',
      body: 'b',
    });
    const decoded = globalThis.atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    expect(decoded).toContain('From: me');
  });

  it('exports a default instance', () => {
    expect(gmail).toBeInstanceOf(GmailClient);
  });
});
