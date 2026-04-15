/**
 * Unit tests for API response helpers.
 */

import {
  successResponse,
  successMessageResponse,
  errorResponse,
  validationError,
  notFoundError,
  serverError,
} from '../../../../src/api/utils/response';

describe('successResponse', () => {
  it('wraps data in { success: true, data }', () => {
    expect(successResponse({ x: 1 })).toEqual({ success: true, data: { x: 1 } });
  });

  it('accepts primitive data', () => {
    expect(successResponse('hi')).toEqual({ success: true, data: 'hi' });
  });
});

describe('successMessageResponse', () => {
  it('returns message without data when data omitted', () => {
    expect(successMessageResponse('done')).toEqual({ success: true, message: 'done' });
  });

  it('includes data when provided', () => {
    expect(successMessageResponse('done', { id: 5 })).toEqual({
      success: true,
      message: 'done',
      data: { id: 5 },
    });
  });

  it('omits data when falsy (0, null, undefined)', () => {
    expect(successMessageResponse('done', undefined)).toEqual({ success: true, message: 'done' });
    expect(successMessageResponse('done', null)).toEqual({ success: true, message: 'done' });
  });
});

describe('errorResponse', () => {
  it('defaults to 500 status', () => {
    expect(errorResponse('oops')).toEqual({
      response: { success: false, error: 'oops' },
      statusCode: 500,
    });
  });

  it('allows custom status', () => {
    expect(errorResponse('bad', 422).statusCode).toBe(422);
  });
});

describe('validationError', () => {
  it('produces a 400 response', () => {
    const result = validationError('missing field');
    expect(result.statusCode).toBe(400);
    expect(result.response.error).toBe('missing field');
  });
});

describe('notFoundError', () => {
  it('produces a 404 response with "<resource> not found"', () => {
    const result = notFoundError('Task');
    expect(result.statusCode).toBe(404);
    expect(result.response.error).toBe('Task not found');
  });
});

describe('serverError', () => {
  it('unwraps Error instance into its message', () => {
    expect(serverError(new Error('boom')).response.error).toBe('boom');
  });

  it('accepts plain string', () => {
    expect(serverError('boom').response.error).toBe('boom');
  });

  it('falls back to "Internal server error" for empty string', () => {
    expect(serverError('').response.error).toBe('Internal server error');
  });
});
