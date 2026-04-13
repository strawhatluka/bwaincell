/**
 * Gmail API Client (STUB)
 *
 * Future implementation for Gmail integration
 * Requires GMAIL scopes to be added to OAuth configuration
 */

import { GoogleApiClient } from './client';

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload?: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data: string;
    };
  };
}

export interface GmailThread {
  id: string;
  snippet: string;
  messages: GmailMessage[];
}

export class GmailClient extends GoogleApiClient {
  /**
   * List messages from inbox
   * TODO: Implement when Gmail scope is added
   */
  async listMessages(_params?: {
    maxResults?: number;
    q?: string;
    labelIds?: string[];
  }): Promise<GmailMessage[]> {
    throw new Error('Gmail integration not yet implemented');
    // Future implementation:
    // const response = await this.get<{ messages: GmailMessage[] }>(
    //   '/gmail/v1/users/me/messages'
    // );
    // return response.messages;
  }

  /**
   * Get message by ID
   * TODO: Implement when Gmail scope is added
   */
  async getMessage(_messageId: string): Promise<GmailMessage> {
    throw new Error('Gmail integration not yet implemented');
    // Future implementation:
    // return this.get<GmailMessage>(
    //   `/gmail/v1/users/me/messages/${messageId}`
    // );
  }

  /**
   * Send email
   * TODO: Implement when Gmail scope is added
   */
  async sendMessage(_params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<GmailMessage> {
    throw new Error('Gmail integration not yet implemented');
    // Future implementation:
    // const rawMessage = this.createRawMessage(params);
    // return this.post<GmailMessage>(
    //   '/gmail/v1/users/me/messages/send',
    //   { raw: rawMessage }
    // );
  }

  /**
   * Create RFC 2822 formatted message
   * TODO: Implement when Gmail scope is added
   */
  private createRawMessage(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): string {
    const from = params.from || 'me';
    const message = [
      `From: ${from}`,
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      '',
      params.body,
    ].join('\n');

    return globalThis
      .btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

export const gmail = new GmailClient();
