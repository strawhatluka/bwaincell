# fractionFormat

**Source:** `backend/utils/fractionFormat.ts`

Renders numeric quantities as culinary-friendly fractions (e.g., `1 1/2 cups` instead of `1.5 cups`). Used by recipe rendering in `/recipe` and `/random recipe`.

## Strategy

Snap decimals to a fixed set of common culinary fractions within `SNAP_TOLERANCE = 0.02`. Fall back to a trimmed decimal string when no snap fits. Pre-formatted fraction strings pass through unchanged.

```ts
const COMMON_FRACTIONS = [1 / 8, 1 / 4, 3 / 8, 1 / 3, 1 / 2, 5 / 8, 2 / 3, 3 / 4, 7 / 8];
```

## Exported Functions

### `decimalToFraction(value: number): string`

- `value` non-negative, finite. Returns `""` for `NaN`, `Infinity`, or negatives.
- `0` → `"0"`.
- Pure integers → `"2"`.
- Fractional part within tolerance of a common fraction → `"1/2"` or mixed `"1 1/2"`.
- Otherwise → `String(Math.round(value*100)/100)`.

### `formatQuantity(value: number | string | null | undefined): string`

- `null`/`undefined` or empty string → `""`.
- `number` → delegates to `decimalToFraction`.
- Fraction-shaped string (`1/2`, `1 1/2`) → passthrough with whitespace normalized.
- Decimal-shaped string → parsed and snapped.
- Otherwise → returned trimmed as-is.

### Internal helper

`looksLikeFractionString(s)` uses regex `^\d+(?:\s+\d+)?\s*\/\s*\d+$`.

## Examples

```ts
formatQuantity(1.5); // "1 1/2"
formatQuantity(0.5); // "1/2"
formatQuantity('1 1/2'); // "1 1/2"
formatQuantity('0.5'); // "1/2"
formatQuantity(null); // ""
```
