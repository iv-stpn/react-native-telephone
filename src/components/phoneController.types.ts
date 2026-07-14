import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import type { RefObject } from 'react';
import type { LayoutChangeEvent, NativeSyntheticEvent, TargetedEvent, TextInput, TextInputKeyPressEventData } from 'react-native';
import type { CountryOption } from '../utils/options';
import type { PhoneValidationMode } from './PhoneInput';

// The live controller context: current state values, setters, refs, and the
// resolved callbacks the handlers need. `usePhoneInput` keeps a ref to a freshly
// built instance every render, so the handlers (bound once with stable
// identities) always read the latest values through it — the "latest ref"
// pattern. That keeps handler identities stable (satisfying noJsxPropsBind)
// without threading a dependency array through interdependent callbacks.
export type PhoneController = {
  onChangeText: (value: string) => void;
  onCountryChange?: (country: CountryCode) => void;
  onValidationChange?: (isValid: boolean) => void;
  onFocus?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  validationMode: PhoneValidationMode;
  editable: boolean;

  countryOptions: CountryOption[];
  configs: readonly CountryPhoneConfig[];
  allowedSet: ReadonlySet<CountryCode>;
  configByCode: ReadonlyMap<CountryCode, CountryPhoneConfig>;
  countriesByCallingCode: ReadonlyMap<string, CountryOption[]>;

  country: CountryCode;
  selectedCountry: CountryPhoneConfig | undefined;
  extractedValue: string;
  callingCodeInput: string;
  isCallingCodeComplete: boolean;

  setCountry: (code: CountryCode) => void;
  setDisplayValue: (display: string) => void;
  setExtractedValue: (digits: string) => void;
  setCallingCodeInput: (code: string) => void;
  setShowValidationError: (show: boolean) => void;
  setFocused: (focused: boolean) => void;

  callingCodeInputRef: RefObject<TextInput | null>;
  nationalInputRef: RefObject<TextInput | null>;
  selectingAllCodeRef: RefObject<boolean>;
  lastEmittedValueRef: RefObject<string>;
  // Tracks whether the field as a whole holds focus, so the external
  // onFocus/onBlur fire once on true entry/exit — not on the internal
  // calling-code↔national hop. The timer defers the blur so a follow-up focus
  // on the sibling input can cancel it.
  fieldFocusedRef: RefObject<boolean>;
  blurTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
};

export type ApplyNationalInputOptions = { focusNational?: boolean; resetCallingCode?: boolean };

// The data + stable handlers `usePhoneInput` hands to the presentational field.
// Everything here is either current state or a stable-identity callback, so the
// field's JSX never binds a fresh function inline (satisfying noJsxPropsBind).
export type PhoneInputView = {
  country: CountryCode;
  selectedCountry: CountryPhoneConfig;
  countryOptions: CountryOption[];
  displayValue: string;
  callingCodeInput: string;
  isCallingCodeComplete: boolean;
  focused: boolean;
  isPickerOpen: boolean;
  showValidationError: boolean;
  callingCodeTextWidth: number;

  callingCodeInputRef: RefObject<TextInput | null>;
  nationalInputRef: RefObject<TextInput | null>;

  handleCallingCodeLayout: (event: LayoutChangeEvent) => void;
  openPicker: () => void;
  closePicker: () => void;

  focusActiveInput: () => void;
  selectCountry: (code: CountryCode) => void;
  handleCallingCodeChange: (next: string) => void;
  handleCallingCodeFocus: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  handleNationalChange: (formatted: string) => void;
  handleNationalFocus: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  handleNationalKeyPress: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  handleFieldBlur: (event: NativeSyntheticEvent<TargetedEvent>) => void;
};
