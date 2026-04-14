import { cn } from '@/lib/utils';

describe('cn()', () => {
  it('merges multiple class strings into one', () => {
    expect(cn('px-2', 'py-1', 'text-sm')).toBe('px-2 py-1 text-sm');
  });

  it('deduplicates conflicting tailwind utilities (later wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional classes via objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('handles arrays of class values', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('ignores undefined, null, and false values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('returns an empty string when given no inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles mixed input types together', () => {
    expect(cn('px-2', ['text-sm', { 'font-bold': true }], undefined, 'px-4')).toBe(
      'text-sm font-bold px-4'
    );
  });
});
