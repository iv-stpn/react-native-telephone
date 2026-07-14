import type { CountryCode } from 'country-data-ts/countries';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { RenderFlag } from '../utils/flags';
import { PhoneShell } from './PhoneShell';
import type { PhoneInputSize, PhoneInputStyles, RenderContainerProps, RenderCountryPickerProps } from './types';
import { usePhoneInput } from './usePhoneInput';

/** Controls when the "invalid phone number" error is revealed. */
export type PhoneValidationMode =
  /** Show once the national number fills the mask, or on blur (default). */
  | 'onType'
  /** Show only after the field loses focus. */
  | 'onBlur'
  /** Never surface the built-in error; rely on `onValidationChange`/the `error` prop. */
  | 'never';

export type PhoneInputProps = {
  /** Controlled E.164 value (e.g. "+14155550123"). Empty string when blank. */
  value: string;

  /** Fires with the next E.164 value on every edit. */
  onChangeText: (value: string) => void;
  /** Fires with the current country whenever it changes (picker, calling-code edit, or parsed from `value`). */
  onCountryChange?: (country: CountryCode) => void;
  /** Fires with the number's validity on every edit and on blur. */
  onValidationChange?: (isValid: boolean) => void;

  /** Restrict (and order) the selectable countries. Defaults to the full catalog. */
  allowedCountries?: readonly CountryCode[];
  /** Initial country when `value` carries no country and the locale doesn't resolve one. */
  defaultCountry?: CountryCode | null;

  /**
   * BCP-47 locale used to localize country names and to infer the default
   * country (e.g. "en-US" → US). Defaults to the device locale.
   */
  locale?: string;
  label?: string;
  hint?: string;

  /** Externally-controlled error. Takes precedence over the built-in validation error. */
  error?: string;
  /** Message shown when the entered number fails validation. */
  invalidError?: string;
  /** When to reveal the built-in validation error. Defaults to "onType". */
  validationMode?: PhoneValidationMode;

  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  size?: PhoneInputSize;

  /** Root-container style (the label/field/error column). */
  style?: StyleProp<ViewStyle>;
  /** Per-slot style overrides for every default-rendered element. */
  styles?: Partial<PhoneInputStyles>;

  /** Custom flag renderer (e.g. SVG/PNG flags). Defaults to an emoji glyph. */
  renderFlag?: RenderFlag;

  /** Replace the label/field/error shell around the input row. */
  renderContainer?: (props: RenderContainerProps) => ReactNode;
  /** Replace the country-picker modal entirely. */
  renderCountryPicker?: (props: RenderCountryPickerProps) => ReactNode;

  pickerTitle?: string;
  pickerSearchPlaceholder?: string;

  /** Accessibility label for the flag button that opens the picker. */
  chooseCountryLabel?: string;
  /** Message shown when no countries match the search query. */
  noCountriesFoundLabel?: string;

  testID?: string;
};

/**
 * International phone input with per-country masking and validation. State,
 * effects, and handlers live in {@link usePhoneInput} (backed by the pure
 * `./phoneInputController` functions); the field/picker/shell rendering lives in
 * {@link PhoneShell}. This component just wires the two together.
 */
export function PhoneInput(props: PhoneInputProps) {
  const view = usePhoneInput(props);
  if (!view) return null;
  return <PhoneShell view={view} props={props} />;
}
