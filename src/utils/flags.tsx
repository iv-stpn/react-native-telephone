// The default (emoji) flag renderer plus the render-prop types. The pure
// code→emoji converter lives in ./emoji.ts so the headless `utils` entry point
// can expose it without dragging in React Native; this module adds the JSX
// default renderer on top.
//
// Platform note: iOS, macOS, and every modern browser render flag emoji. Android
// (and some Linux fonts) ship no flag glyphs, so the two indicator letters show
// instead (e.g. "US" in boxed letters). When that matters, pass a `renderFlag`
// prop to swap in an image/SVG flag — the component never hard-codes emoji, it
// calls the resolver below (and a custom renderer can call it too via
// `countryCodeToEmoji`).

import type { CountryCode } from 'country-data-ts/countries';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { countryCodeToEmoji } from './emoji';

/** Everything a custom flag renderer needs to draw one country's flag. */
export type FlagRenderProps = {
  code: CountryCode;
  /** Suggested glyph size (px); tracks the field's text size. */
  size: number;
};

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
