// Tests for validation utilities
describe('Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Input Validation', () => {
    it('should validate string length', () => {
      const validateStringLength = (str: string, min: number, max: number): boolean => {
        return str.length >= min && str.length <= max;
      };

      expect(validateStringLength('test', 1, 10)).toBe(true);
      expect(validateStringLength('', 1, 10)).toBe(false);
      expect(validateStringLength('verylongstringthatexceedslimit', 1, 10)).toBe(false);
    });

    it('should validate numeric ranges', () => {
      const validateNumberRange = (num: number, min: number, max: number): boolean => {
        return num >= min && num <= max;
      };

      expect(validateNumberRange(5, 1, 10)).toBe(true);
      expect(validateNumberRange(0, 1, 10)).toBe(false);
      expect(validateNumberRange(11, 1, 10)).toBe(false);
    });

    it('should validate date formats', () => {
      const validateDate = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      };

      expect(validateDate('2025-01-01')).toBe(true);
      expect(validateDate('invalid-date')).toBe(false);
      expect(validateDate('2025-13-01')).toBe(false); // Invalid month
    });

    it('should validate email formats', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should validate Discord ID format', () => {
      const validateDiscordId = (id: string): boolean => {
        // Discord IDs are snowflakes (18-19 digit numbers)
        return /^\d{17,19}$/.test(id);
      };

      expect(validateDiscordId('123456789012345678')).toBe(true);
      expect(validateDiscordId('1234567890123456789')).toBe(true);
      expect(validateDiscordId('12345')).toBe(false);
      expect(validateDiscordId('not-a-number')).toBe(false);
    });
  });

  describe('Sanitization', () => {
    it('should sanitize user input', () => {
      const sanitizeInput = (input: string): string => {
        return input
          .trim()
          .replace(/[<>]/g, '') // Remove potential HTML
          .substring(0, 1000); // Limit length
      };

      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('<script>alert()</script>')).toBe('scriptalert()/script');
      expect(sanitizeInput('a'.repeat(2000))).toHaveLength(1000);
    });

    it('should sanitize URLs', () => {
      const sanitizeUrl = (url: string): string | null => {
        try {
          const parsed = new URL(url);
          if (['http:', 'https:'].includes(parsed.protocol)) {
            return parsed.href;
          }
          return null;
        } catch {
          return null;
        }
      };

      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
      expect(sanitizeUrl('javascript:alert()')).toBeNull();
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });

    it('should escape markdown characters', () => {
      const escapeMarkdown = (text: string): string => {
        return text.replace(/[*_~`|]/g, '\\$&');
      };

      expect(escapeMarkdown('*bold*')).toBe('\\*bold\\*');
      expect(escapeMarkdown('_italic_')).toBe('\\_italic\\_');
      expect(escapeMarkdown('`code`')).toBe('\\`code\\`');
    });
  });

  describe('Type Guards', () => {
    it('should validate object types', () => {
      const isValidTask = (obj: any): boolean => {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          typeof obj.description === 'string' &&
          ['low', 'medium', 'high'].includes(obj.priority) &&
          ['pending', 'completed'].includes(obj.status)
        );
      };

      expect(
        isValidTask({
          description: 'Test',
          priority: 'high',
          status: 'pending',
        })
      ).toBe(true);

      expect(
        isValidTask({
          description: 'Test',
          priority: 'invalid',
          status: 'pending',
        })
      ).toBe(false);

      expect(isValidTask(null)).toBe(false);
      expect(isValidTask('not an object')).toBe(false);
    });

    it('should validate array types', () => {
      const isStringArray = (arr: any): boolean => {
        return Array.isArray(arr) && arr.every((item) => typeof item === 'string');
      };

      expect(isStringArray(['a', 'b', 'c'])).toBe(true);
      expect(isStringArray([])).toBe(true);
      expect(isStringArray(['a', 1, 'c'])).toBe(false);
      expect(isStringArray('not an array')).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should validate user permissions', () => {
      const hasPermission = (userPermissions: string[], required: string): boolean => {
        return userPermissions.includes(required) || userPermissions.includes('ADMINISTRATOR');
      };

      const userPerms = ['SEND_MESSAGES', 'VIEW_CHANNEL'];
      expect(hasPermission(userPerms, 'SEND_MESSAGES')).toBe(true);
      expect(hasPermission(userPerms, 'MANAGE_GUILD')).toBe(false);
      expect(hasPermission(['ADMINISTRATOR'], 'MANAGE_GUILD')).toBe(true);
    });

    it('should validate command cooldowns', () => {
      const cooldowns = new Map<string, number>();

      const checkCooldown = (userId: string, cooldownMs: number = 3000): boolean => {
        const now = Date.now();
        const lastUsed = cooldowns.get(userId) || 0;

        if (now - lastUsed < cooldownMs) {
          return false;
        }

        cooldowns.set(userId, now);
        return true;
      };

      const userId = 'test-user';
      expect(checkCooldown(userId)).toBe(true);
      expect(checkCooldown(userId)).toBe(false); // Still in cooldown

      // Simulate time passing
      cooldowns.set(userId, Date.now() - 4000);
      expect(checkCooldown(userId)).toBe(true);
    });
  });

  describe('Data Transformation', () => {
    it('should format currency values', () => {
      const formatCurrency = (amount: number): string => {
        return `$${amount.toFixed(2)}`;
      };

      expect(formatCurrency(10)).toBe('$10.00');
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(10.555)).toBe('$10.55');
    });

    it('should format dates', () => {
      const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
      };

      const testDate = new Date('2025-01-15T10:30:00Z');
      expect(formatDate(testDate)).toBe('2025-01-15');
    });

    it('should truncate text with ellipsis', () => {
      const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
      };

      expect(truncateText('short', 10)).toBe('short');
      expect(truncateText('this is a very long text', 10)).toBe('this is...');
    });
  });
});
