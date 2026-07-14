import { describe, expect, it } from 'vitest';
import {
  applyPhoneMask,
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  formatAreaCode,
  getNationalMask,
  normalizeCallingCode,
} from '../utils/phoneMask';
import { FR, requireConfig, US } from './support/configs';

// Matches a dangling trailing space (hoisted so the regex isn't rebuilt per call).
const TRAILING_SPACE = /\s$/;

describe('applyPhoneMask', () => {
  it('emits leading literals once the first digit arrives', () => {
    const mask = getNationalMask(US); // "([000]) [000]-[0000]"
    expect(applyPhoneMask(mask, '2')).toBe('(2');
    expect(applyPhoneMask(mask, '202555')).toBe('(202) 555');
    expect(applyPhoneMask(mask, '2025550123')).toBe('(202) 555-0123');
  });

  it('holds separators until the next digit is typed', () => {
    const mask = getNationalMask(FR); // "[0] [00] [00] [00] [00]"
    expect(applyPhoneMask(mask, '6')).toBe('6');
    expect(applyPhoneMask(mask, '61')).toBe('6 1');
    expect(applyPhoneMask(mask, '612345678')).toBe('6 12 34 56 78');
  });

  it('returns empty string for no digits and ignores overflow', () => {
    expect(applyPhoneMask(getNationalMask(US), '')).toBe('');
    // More digits than slots: extra input is simply not shown.
    expect(applyPhoneMask(getNationalMask(US), '20255501239999')).toBe('(202) 555-0123');
  });
});

describe('digit-slot counting', () => {
  it('counts required vs total slots', () => {
    const usMask = getNationalMask(US);
    expect(countRequiredMaskDigits(usMask)).toBe(10);
    expect(countMaskDigitSlots(usMask)).toBe(10);
  });

  it('treats optional [9] slots as total-only', () => {
    // "[000] [00000000]" style masks with a trailing optional run.
    const withOptional = '[00] [9999]';
    expect(countRequiredMaskDigits(withOptional)).toBe(2);
    expect(countMaskDigitSlots(withOptional)).toBe(6);
  });
});

describe('normalizeCallingCode', () => {
  it('normalizes free-form calling-code input', () => {
    expect(normalizeCallingCode('+1')).toBe('+1');
    expect(normalizeCallingCode('1')).toBe('+1');
    expect(normalizeCallingCode('')).toBe('+');
    expect(normalizeCallingCode('+3 3')).toBe('+33');
  });
});

describe('formatAreaCode', () => {
  it('wraps a NANP area code in parentheses, including the closing paren', () => {
    // US/Bahamas mask: "([000]) [000]-[0000]". The closing ")" is a trailing
    // literal that applyPhoneMask leaves pending mid-type; formatAreaCode
    // flushes it so the seeded value reads "(242)", not "(242".
    expect(formatAreaCode(getNationalMask(US), '242')).toBe('(242)');
    expect(formatAreaCode(getNationalMask(US), '202')).toBe('(202)');
  });

  it('returns just the digits for a mask with no separators around the prefix', () => {
    // Guernsey: "+44 [0000000000]" — no literals, so "1481" stays bare.
    const GG = requireConfig('GG');
    expect(formatAreaCode(getNationalMask(GG), '1481')).toBe('1481');
  });

  it('respects inner separators when the prefix spans a group boundary', () => {
    // Vatican: "+39 [000] [000] [0000]", prefix "06698" crosses into group 2.
    const VA = requireConfig('VA');
    expect(formatAreaCode(getNationalMask(VA), '06698')).toBe('066 98');
  });

  it('returns empty for no digits', () => {
    expect(formatAreaCode(getNationalMask(US), '')).toBe('');
    expect(formatAreaCode(getNationalMask(US), 'abc')).toBe('');
  });

  it('does not dangle a trailing space after the closing paren', () => {
    // The ")" is followed by " " in the NANP mask; the flush must not leave it.
    expect(formatAreaCode(getNationalMask(US), '242')).not.toMatch(TRAILING_SPACE);
  });
});

describe('conformToMask', () => {
  const usMask = getNationalMask(US); // "([000]) [000]-[0000]"

  it('matches applyPhoneMask for digit-only input', () => {
    expect(conformToMask(usMask, '2')).toBe(applyPhoneMask(usMask, '2'));
    expect(conformToMask(usMask, '2025550123')).toBe(applyPhoneMask(usMask, '2025550123'));
    expect(conformToMask(usMask, '')).toBe('');
  });

  it('reveals a typed separator before the next digit earns it', () => {
    // Typing ")" right after the area code shows it immediately, instead of
    // swallowing it until the next digit arrives.
    expect(conformToMask(usMask, '(204)')).toBe('(204)');
    // A typed space after the closing paren is honored too.
    expect(conformToMask(usMask, '(204) ')).toBe('(204) ');
    expect(conformToMask(usMask, '(204) 2')).toBe('(204) 2');
  });

  it('drops a misplaced separator inside a group and keeps digits aligned', () => {
    // The "-" inside the area code is dropped; the "4" still fills slot 3.
    expect(conformToMask(usMask, '20-4')).toBe('(204');
    // A "-" after a complete area code is dropped and the ") " auto-inserts.
    expect(conformToMask(usMask, '204-234')).toBe('(204) 234');
  });

  it('caps digit emission at maxDigits', () => {
    expect(conformToMask(usMask, '2042342222999', 10)).toBe('(204) 234-2222');
    // Without maxDigits the surplus digits are formatted up to the mask's end.
    expect(conformToMask(usMask, '2042342222999')).toBe('(204) 234-2222');
  });

  it('drops unrelated characters', () => {
    expect(conformToMask(usMask, 'abc204')).toBe('(204');
    expect(conformToMask(usMask, ')204')).toBe('(204');
  });
});
