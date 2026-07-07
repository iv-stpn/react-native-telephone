import { type StyleProp, StyleSheet, type TextStyle } from "react-native";

// Baked-in default styling. React Native has no cascading stylesheet, so the
// component's look lives here. Consumers override per-slot via the `styles` prop,
// restyle the whole row with `style`, or replace pieces entirely with the render
// props (`renderContainer`, `renderCountryPicker`, `renderFlag`).
//
// Sizing is driven by three size variants (sm/md/lg); the size-dependent bits
// (row min-height, padding, font-size) are applied inline by the component from
// the SIZES map below, so these static styles hold only what doesn't vary.

/** Per-size metrics applied inline by PhoneInput (row height, padding, text size). */
export const SIZES = {
  sm: { minHeight: 44, paddingHorizontal: 12, fontSize: 15 },
  md: { minHeight: 52, paddingHorizontal: 14, fontSize: 16 },
  lg: { minHeight: 60, paddingHorizontal: 16, fontSize: 18 },
} as const;

export const COLORS = {
  border: "#cbd5e1",
  borderFocused: "#4f46e5",
  borderError: "#ef4444",
  surface: "#ffffff",
  backgroundDisabled: "#f1f5f9",
  text: "#0f172a",
  textDisabled: "#94a3b8",
  muted: "#64748b",
  placeholder: "#94a3b8",
  label: "#374151",
  error: "#ef4444",
  required: "#ef4444",
  primary: "#4f46e5",
  selectedTint: "#eef2ff",
  borderSubtle: "#e2e8f0",
} as const;

// Web-only reset: react-native-web renders TextInput as a DOM <input>, which
// shows a focus outline the field border already conveys. `outlineStyle` isn't
// in RN's TextStyle, so it's typed loosely here and composed onto each input
// (rather than baked into a StyleSheet entry, where it would need a suppression).
export const noOutline = { outlineStyle: "none" } as StyleProp<TextStyle>;

export const defaultStyles = StyleSheet.create({
  root: {
    width: "100%",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.label,
  },
  // The bordered input row: flag button + calling-code input + national input.
  field: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  fieldFocused: {
    borderColor: COLORS.borderFocused,
  },
  fieldInvalid: {
    borderColor: COLORS.borderError,
  },
  fieldDisabled: {
    backgroundColor: COLORS.backgroundDisabled,
  },
  // Pressable that opens the country picker (flag + caret).
  flagButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 6,
    gap: 4,
  },
  caret: {
    fontSize: 9,
    color: COLORS.muted,
  },
  callingCodeInput: {
    color: COLORS.text,
    paddingVertical: 0,
  },
  nationalInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    color: COLORS.text,
    paddingVertical: 0,
    paddingLeft: 4,
  },
  error: {
    fontSize: 12,
    color: COLORS.error,
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  // --- Country picker modal ---
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  closeButtonText: {
    fontSize: 18,
    lineHeight: 20,
    color: COLORS.muted,
  },
  search: {
    borderBottomWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: COLORS.selectedTint,
  },
  optionName: {
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  optionCallingCode: {
    fontSize: 14,
    color: COLORS.muted,
  },
  optionCheck: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  empty: {
    padding: 24,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
});
