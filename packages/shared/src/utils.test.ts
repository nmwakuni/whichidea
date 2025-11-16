import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhoneNumber,
  generateOTP,
  calculatePoints,
  calculateProgress,
  slugify,
  truncate,
  getInitials,
  isValidKenyanPhone,
  chunk,
  groupBy,
  omit,
  pick,
} from './utils';

describe('formatCurrency', () => {
  it('should format number to KES currency', () => {
    expect(formatCurrency(1000)).toBe('KSh 1,000.00');
    expect(formatCurrency(1234.56)).toBe('KSh 1,234.56');
  });

  it('should format string to currency', () => {
    expect(formatCurrency('5000')).toBe('KSh 5,000.00');
  });
});

describe('formatPhoneNumber', () => {
  it('should format Kenyan phone numbers to E.164', () => {
    expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('254712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('+254712345678')).toBe('+254712345678');
  });

  it('should handle Safaricom (7xx) and Airtel (1xx) numbers', () => {
    expect(formatPhoneNumber('0722123456')).toBe('+254722123456');
    expect(formatPhoneNumber('0110123456')).toBe('+254110123456');
  });
});

describe('generateOTP', () => {
  it('should generate 6-digit OTP', () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
    expect(parseInt(otp)).toBeLessThan(1000000);
  });

  it('should generate different OTPs', () => {
    const otp1 = generateOTP();
    const otp2 = generateOTP();
    // While they could theoretically be the same, it's very unlikely
    expect(otp1).toMatch(/^\d{6}$/);
    expect(otp2).toMatch(/^\d{6}$/);
  });
});

describe('calculatePoints', () => {
  it('should calculate base points without streak', () => {
    expect(calculatePoints(100, 1, 1, 0)).toBe(100);
    expect(calculatePoints(500, 1, 1, 5)).toBe(500);
  });

  it('should apply streak multiplier for 7+ day streaks', () => {
    expect(calculatePoints(100, 1, 2, 7)).toBe(200);
    expect(calculatePoints(500, 1, 1.5, 10)).toBe(750);
  });

  it('should not apply multiplier for streaks less than 7', () => {
    expect(calculatePoints(100, 1, 2, 6)).toBe(100);
  });

  it('should handle custom points per KES', () => {
    expect(calculatePoints(100, 2, 1, 0)).toBe(200);
    expect(calculatePoints(100, 0.5, 1, 0)).toBe(50);
  });
});

describe('calculateProgress', () => {
  it('should calculate progress percentage', () => {
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(75, 100)).toBe(75);
    expect(calculateProgress(100, 100)).toBe(100);
  });

  it('should cap at 100%', () => {
    expect(calculateProgress(150, 100)).toBe(100);
  });

  it('should return 0 for invalid target', () => {
    expect(calculateProgress(50, 0)).toBe(0);
    expect(calculateProgress(50, -100)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateProgress(33, 100)).toBe(33);
    expect(calculateProgress(67, 100)).toBe(67);
  });
});

describe('slugify', () => {
  it('should convert text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Save & Win Challenge')).toBe('save-win-challenge');
    expect(slugify('Christmas 2024!')).toBe('christmas-2024');
  });

  it('should handle multiple spaces and special chars', () => {
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    expect(slugify('Special@#$%Characters')).toBe('specialcharacters');
  });
});

describe('truncate', () => {
  it('should truncate long text', () => {
    expect(truncate('This is a very long text', 10)).toBe('This is a...');
  });

  it('should not truncate short text', () => {
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('should use default length of 50', () => {
    const longText = 'a'.repeat(60);
    const result = truncate(longText);
    expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
  });
});

describe('getInitials', () => {
  it('should get initials from first and last name', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
    expect(getInitials('Alice', 'Smith')).toBe('AS');
  });

  it('should handle missing names', () => {
    expect(getInitials('John')).toBe('J');
    expect(getInitials(undefined, 'Doe')).toBe('D');
    expect(getInitials()).toBe('?');
  });
});

describe('isValidKenyanPhone', () => {
  it('should validate correct Kenyan phone numbers', () => {
    expect(isValidKenyanPhone('0712345678')).toBe(true);
    expect(isValidKenyanPhone('0110123456')).toBe(true);
    expect(isValidKenyanPhone('254712345678')).toBe(true);
    expect(isValidKenyanPhone('+254712345678')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(isValidKenyanPhone('12345')).toBe(false);
    expect(isValidKenyanPhone('0612345678')).toBe(false); // Invalid prefix
    expect(isValidKenyanPhone('071234567')).toBe(false); // Too short
    expect(isValidKenyanPhone('07123456789')).toBe(false); // Too long
  });
});

describe('chunk', () => {
  it('should split array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('should handle empty array', () => {
    expect(chunk([], 2)).toEqual([]);
  });
});

describe('groupBy', () => {
  it('should group array by key', () => {
    const items = [
      { type: 'fruit', name: 'apple' },
      { type: 'fruit', name: 'banana' },
      { type: 'vegetable', name: 'carrot' },
    ];
    const grouped = groupBy(items, 'type');
    expect(grouped.fruit).toHaveLength(2);
    expect(grouped.vegetable).toHaveLength(1);
  });
});

describe('omit', () => {
  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    expect(omit(obj, ['a', 'c'])).toEqual({ b: 2 });
  });
});

describe('pick', () => {
  it('should pick specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(pick(obj, ['b'])).toEqual({ b: 2 });
  });
});
