/**
 * Unit Tests: Validators
 *
 * Tests email validation, date validation, pagination, and channel validation
 * Coverage target: 90%
 */

import { validateEmail, validateDate, paginate, isValidChannel } from '../../../utils/validators';

describe('Validators', () => {
  describe('validateEmail()', () => {
    test('should accept a valid email', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject email missing @', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    test('should reject email missing domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    test('should reject email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    test('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });
  });

  describe('validateDate()', () => {
    test('should accept a valid date string', () => {
      const result = validateDate('2025-01-15');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept a valid Date object', () => {
      const result = validateDate(new Date('2025-06-01'));
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid date string', () => {
      const result = validateDate('not-a-date');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid date');
    });

    test('should reject invalid Date object', () => {
      const result = validateDate(new Date('invalid'));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid date');
    });
  });

  describe('paginate()', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    test('should paginate with default values (page 1, perPage 10)', () => {
      const result = paginate(items);
      expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(result.totalItems).toBe(15);
    });

    test('should return first page', () => {
      const result = paginate(items, 1, 5);
      expect(result.data).toEqual([1, 2, 3, 4, 5]);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    test('should return last page', () => {
      const result = paginate(items, 3, 5);
      expect(result.data).toEqual([11, 12, 13, 14, 15]);
      expect(result.currentPage).toBe(3);
      expect(result.totalPages).toBe(3);
    });

    test('should handle empty array', () => {
      const result = paginate([], 1, 10);
      expect(result.data).toEqual([]);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(0);
      expect(result.totalItems).toBe(0);
    });

    test('should return empty data for page beyond range', () => {
      const result = paginate(items, 100, 10);
      expect(result.data).toEqual([]);
      expect(result.currentPage).toBe(100);
      expect(result.totalItems).toBe(15);
    });

    test('should support custom perPage', () => {
      const result = paginate(items, 1, 3);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('isValidChannel()', () => {
    test('should accept text channel (type 0)', () => {
      expect(isValidChannel({ type: 0 })).toBe(true);
    });

    test('should accept news channel (type 5)', () => {
      expect(isValidChannel({ type: 5 })).toBe(true);
    });

    test('should accept thread channel (type 11)', () => {
      expect(isValidChannel({ type: 11 })).toBe(true);
    });

    test('should reject voice channel (type 2)', () => {
      expect(isValidChannel({ type: 2 })).toBe(false);
    });

    test('should reject null', () => {
      expect(isValidChannel(null)).toBeFalsy();
    });

    test('should reject undefined', () => {
      expect(isValidChannel(undefined)).toBeFalsy();
    });
  });
});
