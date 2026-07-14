// The mask engine: turns a country's mask string (e.g. "([000]) [000]-[0000]")
// plus typed/pasted input into the formatted display string, and counts its
// digit slots. Pure and dependency-free; split from ./phone.ts so that file
// stays focused on catalog lookups and E.164 parsing. Re-exported from ./phone.

import type { CountryPhoneConfig } from 'country-data-ts/phone-data';

const SUFFIX_WHITESPACE_REGEX = /\s+$/;
const NON_DIGIT_REGEX = /\D/g;

function isDigitChar(char: string): boolean {
  return char >= '0' && char <= '9';
}

// Mutable cursor for formatAreaCode's mask walk (see ConformState for the why).
type AreaCodeState = {
  result: string;
  pending: string;
  digitIdx: number;
};

/**
 * Fills a single `[...]` token with the next area-code digits, advancing
 * `state`. Digit-only: literals between slots are handled by the caller's walk.
 */
function fillAreaCodeToken(token: string, digits: string, state: AreaCodeState): void {
  for (let slotIdx = 0; slotIdx < token.length && state.digitIdx < digits.length; slotIdx += 1) {
    const slot = token[slotIdx];
    if (slot === '0' || slot === '9') {
      state.result += state.pending + digits[state.digitIdx];
      state.pending = '';
      state.digitIdx += 1;
    }
  }
}

// Mutable cursor shared between conformToMask and its per-token filler. Bundling
// the state lets the token loop live in its own function (keeping each walker's
// cognitive complexity low) while still advancing the same result/counters.
type ConformState = {
  result: string;
  pending: string;
  emitted: number;
  textIdx: number;
};

/**
 * Fills a single `[...]` token against the raw text, advancing `state`. Returns
 * `true` when digit emission must stop (the `maxDigits` cap was reached), which
 * signals the outer walk to finish.
 */
function fillMaskToken(token: string, text: string, maxDigits: number, state: ConformState): boolean {
  let slotIdx = 0;
  while (slotIdx < token.length && state.textIdx < text.length) {
    const slot = token[slotIdx];
    const char = text[state.textIdx];
    if (char === undefined) break;

    if (slot !== '0' && slot !== '9') {
      // Non-slot char inside the token (shouldn't occur in the dataset): skip it.
      slotIdx += 1;
    } else if (isDigitChar(char)) {
      if (state.emitted >= maxDigits) {
        state.textIdx = text.length;
        return true;
      }
      state.result += state.pending + char;
      state.pending = '';
      state.emitted += 1;
      state.textIdx += 1;
      slotIdx += 1;
    } else if (slot === '9') {
      // Optional slot with no digit available: skip it, leave the char for the
      // next mask token to evaluate.
      slotIdx += 1;
    } else {
      // Required slot met by a non-digit: drop the char, stay on the slot so the
      // next digit still fills it (a misplaced "-" inside the area code must not
      // shift later digits into the next group).
      state.textIdx += 1;
    }
  }
  return false;
}

/**
 * Handles a single literal (non-slot) mask character against the raw text.
 * Returns `true` when the mask cursor should advance (the literal was matched or
 * buffered), `false` when an unrelated char was dropped and the cursor stays put.
 */
function emitMaskLiteral(maskChar: string, text: string, state: ConformState): boolean {
  const char = text[state.textIdx];
  if (char === undefined) return false;
  if (char === maskChar) {
    // The user typed this separator — reveal it immediately.
    state.result += state.pending + maskChar;
    state.pending = '';
    state.textIdx += 1;
    return true;
  }
  if (isDigitChar(char)) {
    // A digit arrived — buffer the literal until the slot consumes it.
    state.pending += maskChar;
    return true;
  }
  // Unrelated character — drop it, keep the mask cursor on this literal.
  state.textIdx += 1;
  return false;
}

/** Strips every non-digit character, leaving only `0-9`. */
export function normalizeNationalDigits(value: string): string {
  return value.replace(NON_DIGIT_REGEX, '');
}

/** Normalizes free-form calling-code input into `+<digits>` (or bare `+` when empty). */
export function normalizeCallingCode(value: string): string {
  const digits = value.replace(NON_DIGIT_REGEX, '');
  return digits ? `+${digits}` : '+';
}

/**
 * Strips the leading `+<calling code> ` prefix from a full mask, returning just
 * the national portion. Masks store the whole thing (e.g. "+1 ([000]) [000]-[0000]")
 * but the national TextInput only formats the part after the calling code.
 */
export function getNationalMask(config: CountryPhoneConfig): string {
  const prefix = `${config.callingCode} `;
  if (config.mask.startsWith(prefix)) return config.mask.slice(prefix.length);
  return config.mask;
}

/**
 * Counts the required digit slots (`0`) inside a mask, ignoring optional slots
 * (`9`). Used to detect when a national number is fully entered so validation
 * can auto-fire.
 */
export function countRequiredMaskDigits(mask: string) {
  let count = 0;
  let inBracket = false;
  for (const char of mask) {
    if (char === '[') inBracket = true;
    else if (char === ']') inBracket = false;
    else if (inBracket && char === '0') count += 1;
  }
  return count;
}

/**
 * Counts every digit slot in a mask — both required (`0`) and optional (`9`).
 * This is the maximum number of digits the mask can display, used to stop the
 * national field from accepting more digits than it can format (so the stored
 * value never diverges from what the user sees).
 */
export function countMaskDigitSlots(mask: string) {
  let count = 0;
  let inBracket = false;
  for (const char of mask) {
    if (char === '[') inBracket = true;
    else if (char === ']') inBracket = false;
    else if (inBracket && (char === '0' || char === '9')) count += 1;
  }
  return count;
}

/**
 * Formats a run of digits against a mask, returning the display string.
 *
 * Mask grammar (national portion):
 * - `[0]` — a required digit slot.
 * - `[9]` — an optional digit slot (consumed only if a digit remains).
 * - any other character (space, `(`, `)`, `-`, `.`) — a literal separator.
 *
 * Literals are buffered and only flushed once the *next* digit is emitted, so a
 * trailing separator never dangles while the user is mid-type. Crucially, this
 * also emits *leading* literals (e.g. the "(" before the area code in the US
 * mask) as soon as the first digit arrives.
 *
 * This is the digit-only face of {@link conformToMask}: non-digits in
 * `inputDigits` are stripped first, so the result matches what `conformToMask`
 * produces for the same digit sequence.
 */
export function applyPhoneMask(mask: string, inputDigits: string): string {
  return conformToMask(mask, normalizeNationalDigits(inputDigits));
}

/**
 * Formats an area-code prefix for display — in the picker (beside the calling
 * code) and as the seeded national value when a one-area-code country is
 * selected — following the country's mask.
 *
 * Unlike {@link applyPhoneMask}, which buffers trailing literals so a separator
 * never dangles mid-type, this *flushes* the literal run immediately following
 * the prefix. That reveals the delimiter that wraps the area code — the ")" in a
 * NANP "(242)" — instead of leaving it pending. Trailing spaces are trimmed so
 * the picker never shows a dangling space. For masks with no separators around
 * the prefix (e.g. Guernsey's "[0000000000]") the result is just the digits.
 */
export function formatAreaCode(nationalMask: string, areaCode: string): string {
  const digits = normalizeNationalDigits(areaCode);
  if (!digits) return '';

  const state: AreaCodeState = { result: '', pending: '', digitIdx: 0 };
  let maskIdx = 0;

  while (maskIdx < nationalMask.length && state.digitIdx < digits.length) {
    const ch = nationalMask[maskIdx];
    if (ch === undefined) break;

    if (ch === '[') {
      const closeIndex = nationalMask.indexOf(']', maskIdx);
      if (closeIndex === -1) break;
      fillAreaCodeToken(nationalMask.slice(maskIdx + 1, closeIndex), digits, state);
      maskIdx = closeIndex + 1;
    } else {
      state.pending += ch;
      maskIdx += 1;
    }
  }

  // Flush the literal run right after the last consumed digit so a wrapping
  // delimiter (")") is revealed, then drop any trailing whitespace.
  state.result += state.pending;
  while (maskIdx < nationalMask.length && nationalMask[maskIdx] !== '[') {
    state.result += nationalMask[maskIdx];
    maskIdx += 1;
  }
  return state.result.replace(SUFFIX_WHITESPACE_REGEX, '');
}

/**
 * Conforms free-form text (as typed or pasted) to a mask, returning the display
 * string. Unlike {@link applyPhoneMask}, which only ever sees digits, this walks
 * the **raw text** so a separator the user explicitly types is honored: typing
 * `)` right after the area code reveals it at once, instead of being stripped
 * and only reappearing once the next digit "earns" it.
 *
 * Rules, walked in lockstep with the mask:
 * - A mask literal matched by the next text char is emitted immediately
 *   (pending literals flushed first) — this is what reveals a typed separator.
 * - A mask literal met by a digit is buffered as pending, auto-inserted when
 *   the slot consumes that digit (same behavior as `applyPhoneMask`).
 * - A mask literal met by an unrelated char drops the char.
 * - A required slot `[0]` met by a digit emits it; met by a non-digit it drops
 *   the char and **stays on the slot**, so a misplaced separator inside a group
 *   (e.g. `20-4`) doesn't push later digits into the wrong group.
 * - An optional slot `[9]` met by a non-digit is skipped, leaving the char for
 *   the next token (no `[9]` slots exist in the dataset today, but the grammar
 *   allows them).
 * - Digit emission stops once `maxDigits` is reached.
 *
 * For digit-only input the result is identical to `applyPhoneMask`.
 */
export function conformToMask(mask: string, text: string, maxDigits = Number.POSITIVE_INFINITY): string {
  if (!text) return '';

  const state: ConformState = { result: '', pending: '', emitted: 0, textIdx: 0 };
  let maskIdx = 0;

  while (maskIdx < mask.length && state.textIdx < text.length) {
    const maskChar = mask[maskIdx];
    if (maskChar === undefined) break;

    if (maskChar === '[') {
      const closeIndex = mask.indexOf(']', maskIdx);
      if (closeIndex === -1) break;
      const stop = fillMaskToken(mask.slice(maskIdx + 1, closeIndex), text, maxDigits, state);
      maskIdx = closeIndex + 1;
      if (stop) break;
    } else if (emitMaskLiteral(maskChar, text, state)) {
      // Literal separator matched or buffered: advance the mask cursor.
      maskIdx += 1;
    }
  }

  return state.result;
}
