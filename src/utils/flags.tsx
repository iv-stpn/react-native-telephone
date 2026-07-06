// The default (emoji) flag renderer. The pure, React-free helpers live in
// ./flag-emoji.ts so the headless `utils` entry point can use them without
// importing react-native; this module adds the JSX default renderer on top.
//
// Platform note: iOS, macOS, and every modern browser render flag emoji. Android
// (and some Linux fonts) ship no flag glyphs, so the two indicator letters show
// instead (e.g. "US" in boxed letters). When that matters, pass a `renderFlag`
// prop to swap in an image/SVG flag — the component never hard-codes emoji, it
// calls the resolver below.

import { Text } from "react-native";
import { countryCodeToEmoji, type RenderFlag } from "./flag-emoji";

export type { FlagRenderProps, RenderFlag } from "./flag-emoji";
export { countryCodeToEmoji } from "./flag-emoji";

/**
 * Default flag renderer: the emoji glyph in a `<Text>`, sized to `size`. The
 * extra line-height keeps the (slightly tall) emoji visually centered in the row.
 */
export const defaultRenderFlag: RenderFlag = ({ code, emoji, size }) => (
  <Text style={{ fontSize: size, lineHeight: Math.round(size * 1.18) }}>{emoji || countryCodeToEmoji(code)}</Text>
);
