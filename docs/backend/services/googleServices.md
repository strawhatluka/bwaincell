# googleServices

**Source:** `backend/utils/googleServices.ts`

Thin wrapper around `googleapis` providing OAuth2-authenticated Calendar and Drive operations. Note: this is a class — not a singleton — because it stores per-user credentials.

## Config Type (internal)

```ts
interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
```

## Class `GoogleServices`

### Constructor

`new GoogleServices(config: GoogleConfig)` — instantiates `google.auth.OAuth2(clientId, clientSecret, redirectUri)`. The `calendar` and `drive` clients start as `null` and are created only after credentials are set.

### `setCredentials(tokens: any): void`

Calls `oauth2Client.setCredentials(tokens)` and instantiates `google.calendar({version:'v3', auth})` and `google.drive({version:'v3', auth})`. `tokens` follows the Google OAuth token shape (`access_token`, `refresh_token`, `expiry_date`, etc.).

### `createEvent(event: calendar_v3.Schema$Event): Promise<calendar_v3.Schema$Event>`

Inserts the event into the user's `primary` calendar. Throws `"Calendar not initialized"` if `setCredentials` was not called. Logs `Event created { eventId }` on success; errors are logged and rethrown.

### `uploadFile(name: string, mimeType: string, content: Buffer): Promise<drive_v3.Schema$File>`

`drive.files.create({ requestBody: { name, mimeType }, media: { mimeType, body: content } })`. Throws `"Drive not initialized"` pre-auth. Logs `File uploaded { fileId }` on success.

## Usage Pattern

```ts
const g = new GoogleServices({ clientId, clientSecret, redirectUri });
g.setCredentials(tokensFromDb);
const created = await g.createEvent({ summary: 'Dinner', start: {...}, end: {...} });
```

## Dependencies

- `googleapis` — Calendar v3 and Drive v3
- `backend/shared/utils/logger`
