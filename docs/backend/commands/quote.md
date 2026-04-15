# `/make-it-a-quote` Command Reference

**Source:** `backend/commands/quote.ts`
**Renderer:** `backend/utils/imageService.ts` (backed by `skia-canvas`).

Renders a dramatic PNG quote image from any Discord message. Stateless — writes no DB rows.

## Command Name

The slash command is `/make-it-a-quote` (SlashCommandBuilder `setName('make-it-a-quote')`), not `/quote`.

## Options

| Option | Type | Required | Description |
| ------ | ---- | -------- | ----------- |
| `message_link` | string | Yes | Discord message link (`https://discord.com/channels/<guild>/<channel>/<message>`) or a plain message ID. |

## Flow

1. `parseMessageInput(input)` — regex `discord.com/channels/(\d+)/(\d+)/(\d+)` pulls guildId, channelId, messageId. Otherwise the input is treated as a same-channel message ID.
2. Guards:
   - No channel context → `❌ This command can only be used in a text channel.`
   - Cross-server link → `❌ That message link points to a different server.`
   - DM context with a link → `❌ Cross-channel quoting is only available in servers.`
3. Fetches the target message. Errors surface as `❌ Could not find message with that ID. ...`.
4. Empty content → `❌ The selected message has no text content.`
5. Resolves guild-specific avatar: `member.displayAvatarURL({ extension: 'png', size: 512 })`, falling back to `author.displayAvatarURL(...)` if the member has left.
6. `ImageService.generateQuoteImage(avatarUrl, quoteText, author.username)` → `Buffer`.
7. Replies with `AttachmentBuilder(buffer, { name: 'quote.png' })`.

## Canvas Unavailable

If `skia-canvas is not available` appears in the error message, replies with:

```
❌ Quote image generation is not available on this server. The required image library (skia-canvas) is missing for this platform.
```

## Exports

- `parseMessageInput(input: string) => { messageId, channelId: string | null, guildId: string | null }` — exported for tests.

## Data Model

None — ephemeral command, no persistence.
