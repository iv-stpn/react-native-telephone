// Pure, React-free flag helpers. Kept separate from ./flags.tsx (which pulls in
// react-native for the default JSX renderer) so the headless `utils` entry point
// can expose countryCodeToEmoji without dragging in React Native.
//
// A country's flag emoji is just its two ISO letters expressed as Unicode
// "regional indicator symbols" (U+1F1E6–U+1F1FF). So "US" → 🇺🇸 with no image
// assets and no per-country data — the code *is* the flag.

import type { ReactNode } from "react";
import type { CountryCode } from "../data/countries";

const REGIONAL_INDICATOR_BASE = 0x1f1e6; // Unicode code point for regional indicator "A".
const LETTER_A = "A".charCodeAt(0);

/**
 * Converts an ISO 3166-1 alpha-2 code into its flag emoji (e.g. "FR" → 🇫🇷).
 * Any 2-letter input works; a non-letter code falls through to the raw string,
 * so a bad code degrades to plain text rather than throwing.
 */
export function countryCodeToEmoji(code: string): string {
  const upper = code.toUpperCase();
  let emoji = "";

  for (const char of upper) {
    const offset = char.charCodeAt(0) - LETTER_A;
    if (offset < 0 || offset > 25) return code; // Not A–Z: not a real code.
    emoji += String.fromCodePoint(REGIONAL_INDICATOR_BASE + offset);
  }

  return emoji;
}

/** Everything a custom flag renderer needs to draw one country's flag. */
export interface FlagRenderProps {
  code: CountryCode;
  /** The default emoji glyph, so a custom renderer can fall back to it. */
  emoji: string;
  /** Suggested glyph size (px); tracks the field's text size. */
  size: number;
}

/**
 * Signature for a custom flag renderer (the `renderFlag` prop). Return any node:
 * an `<Image>`, an SVG element, or text. It's placed as a flex-row child, so it
 * must not need to sit inside a `<Text>`. (The `ReactNode` type is erased at
 * compile time, so this file stays runtime-free of React.)
 */
export type RenderFlag = (props: FlagRenderProps) => ReactNode;
