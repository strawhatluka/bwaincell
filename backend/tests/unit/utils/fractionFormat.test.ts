/**
 * Unit tests for fractionFormat.
 */

import { decimalToFraction, formatQuantity } from '../../../utils/fractionFormat';

describe('decimalToFraction', () => {
  it('renders integers as plain strings', () => {
    expect(decimalToFraction(0)).toBe('0');
    expect(decimalToFraction(1)).toBe('1');
    expect(decimalToFraction(5)).toBe('5');
  });

  it('snaps halves', () => {
    expect(decimalToFraction(0.5)).toBe('1/2');
    expect(decimalToFraction(1.5)).toBe('1 1/2');
    expect(decimalToFraction(2.5)).toBe('2 1/2');
  });

  it('snaps quarters', () => {
    expect(decimalToFraction(0.25)).toBe('1/4');
    expect(decimalToFraction(0.75)).toBe('3/4');
    expect(decimalToFraction(1.25)).toBe('1 1/4');
    expect(decimalToFraction(2.75)).toBe('2 3/4');
  });

  it('snaps thirds within tolerance', () => {
    expect(decimalToFraction(1 / 3)).toBe('1/3');
    expect(decimalToFraction(2 / 3)).toBe('2/3');
    expect(decimalToFraction(0.333)).toBe('1/3');
    expect(decimalToFraction(0.667)).toBe('2/3');
    expect(decimalToFraction(1 + 1 / 3)).toBe('1 1/3');
  });

  it('snaps eighths', () => {
    expect(decimalToFraction(0.125)).toBe('1/8');
    expect(decimalToFraction(0.375)).toBe('3/8');
    expect(decimalToFraction(0.625)).toBe('5/8');
    expect(decimalToFraction(0.875)).toBe('7/8');
  });

  it('rounds up when frac is within tolerance of 1', () => {
    expect(decimalToFraction(1.995)).toBe('2');
    expect(decimalToFraction(0.995)).toBe('1');
  });

  it('rounds down when frac is within tolerance of 0', () => {
    expect(decimalToFraction(1.005)).toBe('1');
    expect(decimalToFraction(2.01)).toBe('2');
  });

  it('falls back to decimal when no common fraction fits', () => {
    expect(decimalToFraction(1.73)).toBe('1.73');
    expect(decimalToFraction(3.47)).toBe('3.47');
  });

  it('rejects negative numbers', () => {
    expect(decimalToFraction(-1)).toBe('');
    expect(decimalToFraction(-0.5)).toBe('');
  });

  it('rejects NaN and Infinity', () => {
    expect(decimalToFraction(NaN)).toBe('');
    expect(decimalToFraction(Infinity)).toBe('');
    expect(decimalToFraction(-Infinity)).toBe('');
  });
});

describe('formatQuantity', () => {
  it('returns "" for null/undefined/empty', () => {
    expect(formatQuantity(null)).toBe('');
    expect(formatQuantity(undefined)).toBe('');
    expect(formatQuantity('')).toBe('');
    expect(formatQuantity('   ')).toBe('');
  });

  it('formats numbers as fractions', () => {
    expect(formatQuantity(1.5)).toBe('1 1/2');
    expect(formatQuantity(0.25)).toBe('1/4');
    expect(formatQuantity(2)).toBe('2');
  });

  it('passes through fraction strings unchanged', () => {
    expect(formatQuantity('1/2')).toBe('1/2');
    expect(formatQuantity('1 1/2')).toBe('1 1/2');
    expect(formatQuantity('3/4')).toBe('3/4');
  });

  it('normalizes spacing in fraction strings', () => {
    expect(formatQuantity('1  1/2')).toBe('1 1/2');
    expect(formatQuantity('1 / 2')).toBe('1/2');
  });

  it('parses decimal strings and snaps', () => {
    expect(formatQuantity('0.5')).toBe('1/2');
    expect(formatQuantity('1.5')).toBe('1 1/2');
    expect(formatQuantity('2')).toBe('2');
  });

  it('returns unrecognized strings as-is', () => {
    expect(formatQuantity('a pinch')).toBe('a pinch');
    expect(formatQuantity('to taste')).toBe('to taste');
  });
});
