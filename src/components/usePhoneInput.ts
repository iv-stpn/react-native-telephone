import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  Platform,
  type TextInput,
  type TextInputKeyPressEventData,
} from 'react-native';
import {
  applyPhoneMask,
  getNationalMask,
  nationalFromE164,
  normalizeCallingCode,
  parseCountryFromE164,
  toE164,
} from '../utils/phone';
import type { PhoneInputProps } from './PhoneInput';
import type { PhoneController, PhoneInputView } from './phoneController.types';
import {
  applyCallingCodeChange,
  applyCountrySelection,
  applyNationalInput,
  focusActiveInput,
  handleCallingCodeFocus,
  handleFieldBlur,
  handleNationalFocus,
  handleNationalKeyPress,
} from './phoneInputController';
import { type PhoneCatalog, usePhoneCatalog } from './usePhoneCatalog';

type PhoneState = ReturnType<typeof usePhoneState>;

// All mutable field state, bundled so the main hook stays small. The
// calling-code seed reads the initial country's code once, on mount.
function usePhoneState(catalog: PhoneCatalog) {
  const { countryOptions, initialCountry } = catalog;
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [displayValue, setDisplayValue] = useState('');
  const [extractedValue, setExtractedValue] = useState('');
  const [callingCodeInput, setCallingCodeInput] = useState<string>(() => {
    const option = countryOptions.find((entry) => entry.config.code === initialCountry);
    return option?.config.callingCode ?? '+';
  });
  const [focused, setFocused] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [callingCodeTextWidth, setCallingCodeTextWidth] = useState(0);

  return {
    country,
    setCountry,
    displayValue,
    setDisplayValue,
    extractedValue,
    setExtractedValue,
    callingCodeInput,
    setCallingCodeInput,
    focused,
    setFocused,
    isPickerOpen,
    setIsPickerOpen,
    showValidationError,
    setShowValidationError,
    callingCodeTextWidth,
    setCallingCodeTextWidth,
  };
}

// Builds the live controller from catalog + state each render, keeping it in a
// ref so the stable handlers below always read current values (latest-ref pattern).
function useControllerRef(props: PhoneInputProps, catalog: PhoneCatalog, state: PhoneState) {
  const { onChangeText, onCountryChange, onValidationChange, validationMode = 'onType', editable = true } = props;
  const callingCodeInputRef = useRef<TextInput>(null);
  const nationalInputRef = useRef<TextInput>(null);
  const selectingAllCodeRef = useRef(false);
  const lastEmittedValueRef = useRef(props.value);

  const selectedCountry = useMemo(
    () =>
      catalog.countryOptions.find((option) => option.config.code === state.country)?.config ?? catalog.countryOptions[0]?.config,
    [catalog.countryOptions, state.country],
  );
  const isCallingCodeComplete = Boolean(
    selectedCountry && normalizeCallingCode(state.callingCodeInput) === selectedCountry.callingCode,
  );

  const controller: PhoneController = {
    onChangeText,
    onCountryChange,
    onValidationChange,
    validationMode,
    editable,
    countryOptions: catalog.countryOptions,
    configs: catalog.configs,
    allowedSet: catalog.allowedSet,
    configByCode: catalog.configByCode,
    countriesByCallingCode: catalog.countriesByCallingCode,
    country: state.country,
    selectedCountry,
    extractedValue: state.extractedValue,
    callingCodeInput: state.callingCodeInput,
    isCallingCodeComplete,
    setCountry: state.setCountry,
    setDisplayValue: state.setDisplayValue,
    setExtractedValue: state.setExtractedValue,
    setCallingCodeInput: state.setCallingCodeInput,
    setShowValidationError: state.setShowValidationError,
    setFocused: state.setFocused,
    callingCodeInputRef,
    nationalInputRef,
    selectingAllCodeRef,
    lastEmittedValueRef,
  };
  const ref = useRef(controller);
  ref.current = controller;
  return { ref, selectedCountry, isCallingCodeComplete, callingCodeInputRef, nationalInputRef };
}

// Binds each controller function to the live ref exactly once. Empty dep arrays
// are correct: the ref identity never changes and the ref always holds the
// latest controller, so these handlers stay stable (satisfying noJsxPropsBind).
function useStableHandlers(ref: RefObject<PhoneController>) {
  const selectCountry = useCallback((code: CountryCode) => applyCountrySelection(ref.current, code), [ref]);
  const handleCallingCodeChange = useCallback((next: string) => applyCallingCodeChange(ref.current, next, true), [ref]);
  const handleNationalChange = useCallback((formatted: string) => applyNationalInput(ref.current, formatted), [ref]);
  const focusActive = useCallback(() => focusActiveInput(ref.current), [ref]);
  const onCallingCodeFocus = useCallback(() => handleCallingCodeFocus(ref.current), [ref]);
  const onNationalFocus = useCallback(() => handleNationalFocus(ref.current), [ref]);
  const onNationalKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => handleNationalKeyPress(ref.current, event),
    [ref],
  );
  const onFieldBlur = useCallback(() => handleFieldBlur(ref.current), [ref]);
  return {
    selectCountry,
    handleCallingCodeChange,
    handleNationalChange,
    focusActiveInput: focusActive,
    handleCallingCodeFocus: onCallingCodeFocus,
    handleNationalFocus: onNationalFocus,
    handleNationalKeyPress: onNationalKeyPress,
    handleFieldBlur: onFieldBlur,
  };
}

// Syncs internal state to external props: valid-country reset, controlled-`value`
// rehydration, and mount-only autoFocus. Kept in its own hook so the main body
// stays small; see the inline notes for why each is a genuine effect.
function usePhoneSync(props: PhoneInputProps, catalog: PhoneCatalog, state: PhoneState, ref: RefObject<PhoneController>) {
  const { value, autoFocus } = props;
  const { allowedSet, configs, derivedDefaultCountry } = catalog;
  const { country, setCountry, setExtractedValue, setDisplayValue, setCallingCodeInput, extractedValue } = state;

  // biome-ignore lint/plugin: genuine sync to the external `allowedCountries` prop — no derived-state equivalent.
  useEffect(() => {
    if (allowedSet.has(country)) return;
    setCountry(derivedDefaultCountry);
  }, [country, allowedSet, derivedDefaultCountry, setCountry]);

  // biome-ignore lint/plugin: genuine sync to the external controlled `value` prop — no derived-state equivalent.
  useEffect(() => {
    const selectedCountry = ref.current.selectedCountry;
    if (!selectedCountry) return;

    const parsedCountry = parseCountryFromE164(value, configs, country);
    if (parsedCountry && parsedCountry.code !== country && allowedSet.has(parsedCountry.code)) setCountry(parsedCountry.code);

    // Rehydrates display/extracted/calling-code state from `value` under a config.
    const rehydrate = (sourceCountry: CountryPhoneConfig) => {
      const nextNational = value ? nationalFromE164(value, sourceCountry) : '';
      setExtractedValue(nextNational);
      setDisplayValue(nextNational ? applyPhoneMask(getNationalMask(sourceCountry), nextNational) : '');
      setCallingCodeInput(sourceCountry.callingCode);
    };

    if (value !== ref.current.lastEmittedValueRef.current) {
      rehydrate(parsedCountry ?? selectedCountry);
      ref.current.lastEmittedValueRef.current = value;
      return;
    }
    // Value matches our last emission: reconcile only if our derived E.164 drifted.
    if (value !== toE164(extractedValue, selectedCountry)) rehydrate(selectedCountry);
  }, [
    value,
    country,
    configs,
    allowedSet,
    extractedValue,
    setCountry,
    setExtractedValue,
    setDisplayValue,
    setCallingCodeInput,
    ref,
  ]);

  // biome-ignore lint/plugin: mount-only autoFocus with a native-timing delay — a genuine effect, not derived state.
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => ref.current.nationalInputRef.current?.focus(), Platform.OS === 'web' ? 0 : 300);
    return () => clearTimeout(timer);
  }, [autoFocus, ref]);
}

// Controller for the phone field: owns all state/effects and exposes current
// values plus stable-identity handlers. `PhoneInput` renders the returned view;
// the heavy logic lives in ./phoneInputController and the sub-hooks above.
export function usePhoneInput(props: PhoneInputProps): PhoneInputView | null {
  const catalog = usePhoneCatalog(props);
  const state = usePhoneState(catalog);
  const { ref, selectedCountry, isCallingCodeComplete, callingCodeInputRef, nationalInputRef } = useControllerRef(
    props,
    catalog,
    state,
  );
  const handlers = useStableHandlers(ref);
  usePhoneSync(props, catalog, state, ref);

  const openPicker = useCallback(() => {
    if (ref.current.editable) state.setIsPickerOpen(true);
  }, [ref, state.setIsPickerOpen]);
  const closePicker = useCallback(() => state.setIsPickerOpen(false), [state.setIsPickerOpen]);

  // Stable layout handler: keeps the measured width unless it shifts by >0.5px.
  const handleCallingCodeLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      state.setCallingCodeTextWidth((prev) => (Math.abs(prev - width) > 0.5 ? width : prev));
    },
    [state.setCallingCodeTextWidth],
  );

  if (!selectedCountry) return null;

  return {
    country: state.country,
    selectedCountry,
    countryOptions: catalog.countryOptions,
    displayValue: state.displayValue,
    callingCodeInput: state.callingCodeInput,
    isCallingCodeComplete,
    focused: state.focused,
    isPickerOpen: state.isPickerOpen,
    showValidationError: state.showValidationError,
    callingCodeTextWidth: state.callingCodeTextWidth,
    callingCodeInputRef,
    nationalInputRef,
    handleCallingCodeLayout,
    openPicker,
    closePicker,
    ...handlers,
  };
}
