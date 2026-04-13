/**
 * Unit Tests: Recipe Data
 *
 * Tests structure and integrity of dinner options data
 * Coverage target: 100%
 */

import { dinnerOptions } from '../../../utils/recipeData';

describe('Recipe Data', () => {
  describe('dinnerOptions', () => {
    test('should be a non-empty object', () => {
      expect(typeof dinnerOptions).toBe('object');
      expect(Object.keys(dinnerOptions).length).toBeGreaterThan(0);
    });

    test('should have at least 5 dinner options', () => {
      expect(Object.keys(dinnerOptions).length).toBeGreaterThanOrEqual(5);
    });

    test.each(Object.entries(dinnerOptions))(
      '%s should have all required fields',
      (_name, option) => {
        expect(option).toHaveProperty('description');
        expect(option).toHaveProperty('image');
        expect(option).toHaveProperty('prepTime');
        expect(option).toHaveProperty('difficulty');
        expect(option).toHaveProperty('recipe');
      }
    );

    test.each(Object.entries(dinnerOptions))(
      '%s should have string values for all fields',
      (_name, option) => {
        expect(typeof option.description).toBe('string');
        expect(typeof option.image).toBe('string');
        expect(typeof option.prepTime).toBe('string');
        expect(typeof option.difficulty).toBe('string');
        expect(typeof option.recipe).toBe('string');
      }
    );
  });
});
