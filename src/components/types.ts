import type { ReactNode } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { CountryCode } from "country-data-ts/countries";
import type { RenderFlag } from "../utils/flags";
import type { CountryOption } from "../utils/options";

export type { FlagRenderProps, RenderFlag } from "../utils/flags";
export type { CountryOption } from "../utils/options";

/** Sizing scale shared by the field and its text. */
export type PhoneInputSize = "sm" | "md" | "lg";

/**
 * Props passed to a custom country-picker renderer (the `renderCountryPicker`
 * prop). Mirrors the default {@link CountryPicker} modal's contract so a custom
 * picker is a drop-in replacement.
 */
export interface RenderCountryPickerProps {
  visible: boolean;
  onClose: () => void;
  options: CountryOption[];
  selectedCountry: CountryCode | null;
  onSelect: (country: CountryCode) => void;
  /** Renders a country's flag (respects the component's `renderFlag` prop). */
  renderFlag: RenderFlag;
  title: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  /** Per-slot style overrides forwarded from the host component. */
  styles?: Partial<PhoneInputStyles>;
}

/**
 * Props passed to a custom field-container renderer (the `renderContainer`
 * prop): the label / field / error / hint shell around the input row.
 */
export interface RenderContainerProps {
  /** Stable identifier, forwarded to the field's testID. */
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** StyleProp slots for the default-rendered UI (RN equivalent of a className map). */
export interface PhoneInputStyles {
  root: StyleProp<ViewStyle>;
  label: StyleProp<TextStyle>;
  /** The bordered row holding the flag button, calling code, and national input. */
  field: StyleProp<ViewStyle>;
  flagButton: StyleProp<ViewStyle>;
  /** Wrapper around the flag node in the field row (holds a custom `renderFlag` output). */
  flag: StyleProp<ViewStyle>;
  caret: StyleProp<TextStyle>;
  callingCodeInput: StyleProp<TextStyle>;
  nationalInput: StyleProp<TextStyle>;
  error: StyleProp<TextStyle>;
  hint: StyleProp<TextStyle>;
  // Country picker modal slots:
  overlay: StyleProp<ViewStyle>;
  panel: StyleProp<ViewStyle>;
  header: StyleProp<ViewStyle>;
  title: StyleProp<TextStyle>;
  closeButton: StyleProp<ViewStyle>;
  closeButtonText: StyleProp<TextStyle>;
  search: StyleProp<TextStyle>;
  list: StyleProp<ViewStyle>;
  option: StyleProp<ViewStyle>;
  optionSelected: StyleProp<ViewStyle>;
  optionFlag: StyleProp<ViewStyle>;
  optionName: StyleProp<TextStyle>;
  optionCallingCode: StyleProp<TextStyle>;
  optionCheck: StyleProp<TextStyle>;
  empty: StyleProp<TextStyle>;
}
