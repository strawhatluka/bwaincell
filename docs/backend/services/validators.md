# validators

**Source:** `backend/utils/validators.ts`

Light-weight runtime validators and a pagination helper. **Note:** this module does *not* export Joi schemas — it uses native JS + discord.js types.

## Exported Functions

### `validateEmail(email: string): { valid: boolean; error?: string }`

Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Returns `{ valid: true }` or `{ valid: false, error: 'Invalid email format' }`.

### `validateDate(date: string | Date): { valid: boolean; error?: string }`

Coerces string to `Date`, validates with `!isNaN(dateObj.getTime())`. Error message: `'Invalid date'`.

### `paginate<T>(items: T[], page = 1, perPage = 10): { data: T[]; currentPage: number; totalPages: number; totalItems: number }`

Offset-based slice; does not mutate the source array. Used throughout models for paged Discord responses.

### `isValidChannel(channel: any): channel is TextChannel | NewsChannel | ThreadChannel`

Type guard checking `channel.type` against Discord.js constants:

- `0` = GuildText (`TextChannel`)
- `5` = GuildAnnouncement (`NewsChannel`)
- `11` = PublicThread (`ThreadChannel`)

## Example

```ts
const { valid, error } = validateEmail(userInput);
if (!valid) throw new Error(error);

const page = paginate(tasks, 2, 25);
```
