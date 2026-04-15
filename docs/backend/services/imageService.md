# imageService

**Source:** `backend/utils/imageService.ts`

Generates the "quote card" PNG used by the `/quote` command. Uses `skia-canvas` for native rendering with a child-process probe so that missing native binaries do not segfault the main process.

## Native Module Probe

At module load:

```ts
const probe = spawnSync(process.execPath, ['-e', "require('skia-canvas')"], { timeout: 10000, stdio: 'ignore' });
canvasAvailable = probe.status === 0;
```

`getCanvas()` lazily imports `skia-canvas` and wraps `Canvas` + `loadImage` in a `{ createCanvas, loadImage }` shape to mimic node-canvas. When unavailable it throws `"skia-canvas is not available on this platform. Quote image generation is disabled."`.

## Class `ImageService`

### Constants

- `WIDTH = 1200`, `HEIGHT = 630` (16:9 aspect)
- `AVATAR_SIZE = 280`

### `static async generateQuoteImage(avatarUrl: string, quoteText: string, username: string): Promise<Buffer>`

Produces a PNG buffer with:

1. Black background.
2. White radial spotlight centered on the avatar side.
3. Horizontal gradient fading to black on the right.
4. Circular-clipped, grayscale-filtered avatar (fetched via `fetchAvatar`).
5. White sans-serif quote text (42px) word-wrapped to 10 lines max (`wrapText`), vertically centered.
6. Italic 28px `- {username}` attribution.
7. Subtle "Make it a quote" watermark (14px, 30% white, bottom-right).

Returns `await canvas.toBuffer('png')`.

### Private helpers

- `fetchAvatar(url): Promise<Buffer>` — plain `https.get` with stream concat.
- `wrapText(ctx, text, maxWidth): string[]` — greedy word-wrap using `ctx.measureText`. Truncates to 10 lines and appends `"..."`.

## Throws

`generateQuoteImage` rejects with the skia-canvas availability error on platforms without prebuilt binaries (e.g., ARM64 Alpine with `--ignore-scripts`).
