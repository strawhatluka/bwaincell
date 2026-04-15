/**
 * @module fractionFormat
 * @description Render quantity values as culinary-friendly fractions rather
 * than decimals. Recipes read as "1 1/2 cups flour", not "1.5 cups flour".
 *
 * Strategy: snap decimals to common culinary fractions within a small
 * tolerance; fall through to the decimal string when no clean fraction fits.
 */

/**
 * Culinary fraction targets. Minimal set — the fractions people actually
 * write on recipe cards. Sorted by numerator/denominator for deterministic
 * snap order (first match within tolerance wins).
 */
const COMMON_FRACTIONS: ReadonlyArray<{ num: number; den: number; value: number }> = [
  { num: 1, den: 8, value: 1 / 8 },
  { num: 1, den: 4, value: 1 / 4 },
  { num: 3, den: 8, value: 3 / 8 },
  { num: 1, den: 3, value: 1 / 3 },
  { num: 1, den: 2, value: 1 / 2 },
  { num: 5, den: 8, value: 5 / 8 },
  { num: 2, den: 3, value: 2 / 3 },
  { num: 3, den: 4, value: 3 / 4 },
  { num: 7, den: 8, value: 7 / 8 },
];

const SNAP_TOLERANCE = 0.02;

/**
 * Convert a non-negative decimal to the prettiest culinary rendering.
 *  - Integers → "2"
 *  - Halves/quarters/thirds/eighths → "1/2", "1 1/2", "2/3"
 *  - Un-snappable decimals → fallback to trimmed decimal string
 *  - Negative/NaN/Infinity → ""
 */
export function decimalToFraction(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  if (value === 0) return '0';

  const whole = Math.floor(value);
  const frac = value - whole;

  if (frac < SNAP_TOLERANCE) {
    return String(whole);
  }
  if (1 - frac < SNAP_TOLERANCE) {
    return String(whole + 1);
  }

  for (const f of COMMON_FRACTIONS) {
    if (Math.abs(frac - f.value) <= SNAP_TOLERANCE) {
      const fracStr = `${f.num}/${f.den}`;
      return whole > 0 ? `${whole} ${fracStr}` : fracStr;
    }
  }

  // No clean fraction match — render a trimmed decimal.
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * True if a raw string already looks like a fraction or mixed fraction
 * (e.g. "1/2", "1 1/2", "3/4"). Passed through unchanged by formatQuantity.
 */
function looksLikeFractionString(s: string): boolean {
  return /^\d+(?:\s+\d+)?\s*\/\s*\d+$/.test(s.trim());
}

/**
 * Normalize any quantity representation (number, fraction string, decimal
 * string, or null/undefined) into the preferred display string.
 *
 * @example
 *   formatQuantity(1.5)      // "1 1/2"
 *   formatQuantity(0.5)      // "1/2"
 *   formatQuantity("1 1/2")  // "1 1/2"  (passthrough)
 *   formatQuantity("0.5")    // "1/2"    (parse + snap)
 *   formatQuantity(null)     // ""
 */
export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return decimalToFraction(value);
  }

  const trimmed = value.trim();
  if (!trimmed) return '';

  // Fraction string → passthrough (already in preferred form)
  if (looksLikeFractionString(trimmed)) {
    return trimmed.replace(/\s+/g, ' ').replace(/\s*\/\s*/, '/');
  }

  // Decimal string → parse and snap
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum)) {
    return decimalToFraction(asNum);
  }

  // Unrecognized → return as-is
  return trimmed;
}
