// Flag helpers: a pure code→emoji converter plus the default (emoji) JSX
// renderer. `countryCodeToEmoji` is React-free, so the headless `utils` entry
// point re-exports it without dragging in React Native — the renderer below is
// the only RN import here, and it's dropped from the utils bundle by tree-
// shaking, since that entry never references `defaultRenderFlag`.
//
// A country's flag emoji is just its two ISO letters expressed as Unicode
// "regional indicator symbols" (U+1F1E6–U+1F1FF). So "US" → 🇺🇸 with no image
// assets and no per-country data — the code *is* the flag.
//
// Platform note: iOS, macOS, and every modern browser render flag emoji. Android
// (and some Linux fonts) ship no flag glyphs, so the two indicator letters show
// instead (e.g. "US" in boxed letters). When that matters, pass a `renderFlag`
// prop to swap in an image/SVG flag — the component never hard-codes emoji, it
// calls the resolver below (and a custom renderer can call it too via
// `countryCodeToEmoji`).

import type { ReactNode } from "react";
import { Text } from "react-native";
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
  /** Suggested glyph size (px); tracks the field's text size. */
  size: number;
}

/**
 * Signature for a custom flag renderer (the `renderFlag` prop). Return any node:
 * an `<Image>`, an SVG element, or text. It's placed as a flex-row child, so it
 * must not need to sit inside a `<Text>`. Want the emoji glyph? Call
 * {@link countryCodeToEmoji} with `code` — that's exactly what the default
 * renderer does.
 */
export type RenderFlag = (props: FlagRenderProps) => ReactNode;

/**
 * Default flag renderer: the emoji glyph in a `<Text>`, sized to `size`. The
 * extra line-height keeps the (slightly tall) emoji visually centered in the row.
 */
export const defaultRenderFlag: RenderFlag = ({ code, size }) => (
  <Text style={{ fontSize: size, lineHeight: Math.round(size * 1.18) }}>{countryCodeToEmoji(code)}</Text>
);
