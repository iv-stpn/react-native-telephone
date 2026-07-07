import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  type StyleProp,
  Text,
  TextInput,
  type TextInputKeyPressEventData,
  View,
  type ViewStyle,
} from "react-native";
import type { CountryCode } from "../data/countries";
import type { CountryPhoneConfig } from "../data/phone-data";
import { defaultRenderFlag, type RenderFlag } from "../utils/flags";
import { buildCountryOptions, type CountryOption } from "../utils/options";
import {
  applyPhoneMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  getCountryFromLocale,
  getDefaultCountryForCallingCode,
  getNationalMask,
  nationalFromE164,
  normalizeCallingCode,
  normalizeNationalDigits,
  parseCountryFromE164,
  toE164,
  validateExtractedPhone,
} from "../utils/phone";
import { CountryPicker } from "./CountryPicker";
import { COLORS, defaultStyles, noOutline, SIZES } from "./styles";
import type { PhoneInputSize, PhoneInputStyles, RenderContainerProps, RenderCountryPickerProps } from "./types";

const DEFAULT_PICKER_TITLE = "Select a country";
const DEFAULT_SEARCH_PLACEHOLDER = "Search countries";
const DEFAULT_NO_RESULTS_LABEL = "No countries found";
const DEFAULT_INVALID_ERROR = "Invalid phone number";
const DEFAULT_CHOOSE_COUNTRY_LABEL = "Choose country";

/** Controls when the "invalid phone number" error is revealed. */
export type PhoneValidationMode =
  /** Show once the national number fills the mask, or on blur (default). */
  | "onType"
  /** Show only after the field loses focus. */
  | "onBlur"
  /** Never surface the built-in error; rely on `onValidationChange`/the `error` prop. */
  | "never";

export interface PhoneInputProps {
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
  /** Externally-controlled error. Takes precedence over the built-in validation error. */
  error?: string;
  hint?: string;
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
  noCountriesFoundLabel?: string;
  /** Accessibility label for the flag button that opens the picker. */
  chooseCountryLabel?: string;

  testID?: string;
}

/** Resolves the device locale, falling back to "en-US" when Intl is unavailable. */
function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
  } catch {
    return "en-US";
  }
}

export function PhoneInput({
  value,
  onChangeText,
  onCountryChange,
  onValidationChange,
  allowedCountries,
  defaultCountry,
  locale,
  label,
  error,
  hint,
  invalidError = DEFAULT_INVALID_ERROR,
  validationMode = "onType",
  placeholder,
  editable = true,
  autoFocus,
  size = "md",
  style,
  styles,
  renderFlag = defaultRenderFlag,
  renderContainer,
  renderCountryPicker,
  pickerTitle = DEFAULT_PICKER_TITLE,
  pickerSearchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  noCountriesFoundLabel = DEFAULT_NO_RESULTS_LABEL,
  chooseCountryLabel = DEFAULT_CHOOSE_COUNTRY_LABEL,
  testID,
}: PhoneInputProps) {
  const resolvedLocale = useMemo(() => locale ?? getDeviceLocale(), [locale]);

  const countryOptions = useMemo(() => buildCountryOptions(resolvedLocale, allowedCountries), [resolvedLocale, allowedCountries]);
  const allowedSet = useMemo(() => new Set(countryOptions.map((option) => option.config.code)), [countryOptions]);
  const configs = useMemo(() => countryOptions.map((option) => option.config), [countryOptions]);

  // Default country when `value` carries no country: explicit prop → locale → first option.
  const derivedDefaultCountry = useMemo<CountryCode>(() => {
    if (defaultCountry && allowedSet.has(defaultCountry)) return defaultCountry;

    const localeCountry = getCountryFromLocale(resolvedLocale);
    if (localeCountry && allowedSet.has(localeCountry)) return localeCountry;

    return countryOptions[0]?.config.code ?? "US";
  }, [defaultCountry, resolvedLocale, countryOptions, allowedSet]);

  // Country implied by the current `value` (if it's an E.164 string), else the default.
  const initialCountry = useMemo<CountryCode>(() => {
    const parsed = parseCountryFromE164(value, configs);
    if (parsed && allowedSet.has(parsed.code)) return parsed.code;
    return derivedDefaultCountry;
  }, [value, configs, allowedSet, derivedDefaultCountry]);

  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [displayValue, setDisplayValue] = useState("");
  const [extractedValue, setExtractedValue] = useState("");
  const [callingCodeInput, setCallingCodeInput] = useState<string>(() => {
    const option = countryOptions.find((entry) => entry.config.code === initialCountry);
    return option?.config.callingCode ?? "+";
  });
  const [focused, setFocused] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  // The last E.164 value this component emitted, so the sync effect can tell an
  // external `value` change apart from an echo of our own onChangeText.
  const lastEmittedValueRef = useRef(value);
  const callingCodeInputRef = useRef<TextInput>(null);
  const nationalInputRef = useRef<TextInput>(null);

  const selectedCountryOption = useMemo(
    () => countryOptions.find((option) => option.config.code === country) ?? countryOptions[0],
    [countryOptions, country],
  );
  const selectedCountry = selectedCountryOption?.config;

  const nationalMask = useMemo(() => (selectedCountry ? getNationalMask(selectedCountry) : ""), [selectedCountry]);
  const maxNationalDigits = useMemo(() => countMaskDigitSlots(nationalMask), [nationalMask]);

  // Countries grouped by calling code, so typing a calling code can resolve to a country.
  const countriesByCallingCode = useMemo(() => {
    const map = new Map<string, CountryOption[]>();
    for (const option of countryOptions) {
      const key = option.config.callingCode;
      const entries = map.get(key);
      if (entries) entries.push(option);
      else map.set(key, [option]);
    }
    return map;
  }, [countryOptions]);

  const emitPhoneChange = (nextValue: string) => {
    lastEmittedValueRef.current = nextValue;
    onChangeText(nextValue);
  };

  // Auto-reveal the validation error once the national number fills the mask's
  // required slots (validationMode "onType"), or unconditionally on blur (force).
  // "onBlur" defers to blur only; "never" keeps the built-in error hidden always.
  const evaluateValidity = (national: string, config: CountryPhoneConfig, force = false) => {
    if (validationMode === "never") {
      setShowValidationError(false);
      return;
    }

    const digits = normalizeNationalDigits(national);
    if (!digits) {
      setShowValidationError(false);
      return;
    }

    const gateOpen = force || (validationMode === "onType" && isNationalFull(digits, config));
    if (!gateOpen) {
      setShowValidationError(false);
      return;
    }

    setShowValidationError(!validateExtractedPhone(digits, config));
  };

  function isNationalFull(digits: string, config: CountryPhoneConfig) {
    const required = countRequiredMaskDigits(getNationalMask(config));
    return required > 0 && digits.length >= required;
  }

  // Reset to a valid country if the allowed set changes out from under us.
  useEffect(() => {
    if (allowedSet.has(country)) return;
    setCountry(derivedDefaultCountry);
  }, [country, allowedSet, derivedDefaultCountry]);

  // Keep internal display/extracted state in sync with the controlled `value`.
  // Skips echoes of our own emissions; only reacts to genuine external changes.
  useEffect(() => {
    if (!selectedCountry) return;

    const parsedCountry = parseCountryFromE164(value, configs, country);
    if (parsedCountry && parsedCountry.code !== country && allowedSet.has(parsedCountry.code)) {
      setCountry(parsedCountry.code);
    }

    if (value !== lastEmittedValueRef.current) {
      const sourceCountry = parsedCountry ?? selectedCountry;
      const nextNational = value ? nationalFromE164(value, sourceCountry) : "";
      setExtractedValue(nextNational);
      setDisplayValue(nextNational ? applyPhoneMask(getNationalMask(sourceCountry), nextNational) : "");
      setCallingCodeInput(sourceCountry.callingCode);
      lastEmittedValueRef.current = value;
      return;
    }

    // Value matches what we last emitted: reconcile only if our derived E.164
    // has drifted from it (e.g. after a country switch changed the trunk prefix).
    const expected = toE164(extractedValue, selectedCountry);
    if (value !== expected) {
      const nextNational = value ? nationalFromE164(value, selectedCountry) : "";
      setExtractedValue(nextNational);
      setDisplayValue(nextNational ? applyPhoneMask(getNationalMask(selectedCountry), nextNational) : "");
      setCallingCodeInput(selectedCountry.callingCode);
    }
  }, [value, country, selectedCountry, configs, allowedSet, extractedValue]);

  useEffect(() => {
    if (!autoFocus) return;
    // A short delay lets the field mount before focusing (matches native keyboards).
    const timer = setTimeout(() => nationalInputRef.current?.focus(), Platform.OS === "web" ? 0 : 300);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const normalizedCallingCode = useMemo(() => normalizeCallingCode(callingCodeInput), [callingCodeInput]);
  const isCallingCodeComplete = useMemo(
    () => Boolean(selectedCountry && normalizedCallingCode === selectedCountry.callingCode),
    [normalizedCallingCode, selectedCountry],
  );

  // Switch country from the picker, re-formatting the current national number
  // under the new mask and re-deriving the E.164 value with the new calling code.
  const applyCountrySelection = (nextCountry: CountryCode) => {
    const nextOption = countryOptions.find((option) => option.config.code === nextCountry);
    if (!nextOption || !selectedCountry) return;

    const nextConfig = nextOption.config;
    // Keep the national digits the user already typed and just reflow them under
    // the new mask. Deliberately *not* round-tripping through the old country's
    // E.164 — doing so would splice the old calling code into the national part
    // whenever the two countries' codes differ (e.g. US "+1" → FR would turn
    // "612345678" into "1612345678"). E.164 is re-derived below from the new config.
    const nextNational = extractedValue;

    setCountry(nextCountry);
    setExtractedValue(nextNational);
    setDisplayValue(nextNational ? applyPhoneMask(getNationalMask(nextConfig), nextNational) : "");
    setCallingCodeInput(nextConfig.callingCode);
    onCountryChange?.(nextCountry);

    const nextE164 = toE164(nextNational, nextConfig);
    emitPhoneChange(nextE164);
    onValidationChange?.(nextNational ? validateExtractedPhone(nextNational, nextConfig) : false);
    evaluateValidity(nextNational, nextConfig);
  };

  // Handle edits to the calling-code field. When the typed code matches a known
  // country's calling code we switch to it (keeping the active country if it
  // shares the code); otherwise we just store the raw code and wait for more digits.
  const applyCallingCodeChange = (rawCallingCode: string, focusNationalOnMatch = false) => {
    if (!selectedCountry) return;

    const nextCallingCode = normalizeCallingCode(rawCallingCode);
    const matches = countriesByCallingCode.get(nextCallingCode);
    if (!matches || matches.length === 0) {
      setCallingCodeInput(nextCallingCode);
      return;
    }

    // Keep the active country if it shares the typed code; otherwise fall back
    // to the default (biggest) country for that code (e.g. +1 → US) rather than
    // the alphabetically-first option, then to the first option as a last resort.
    const defaultCode = getDefaultCountryForCallingCode(nextCallingCode);
    const activeMatch =
      matches.find((option) => option.config.code === country) ??
      (defaultCode ? matches.find((option) => option.config.code === defaultCode) : undefined) ??
      matches[0];
    if (!activeMatch) {
      setCallingCodeInput(nextCallingCode);
      return;
    }

    const nextConfig = activeMatch.config;
    setCountry(nextConfig.code);
    setCallingCodeInput(nextConfig.callingCode);
    onCountryChange?.(nextConfig.code);

    const nextE164 = toE164(extractedValue, nextConfig);
    emitPhoneChange(nextE164);
    onValidationChange?.(extractedValue ? validateExtractedPhone(extractedValue, nextConfig) : false);
    evaluateValidity(extractedValue, nextConfig);

    if (focusNationalOnMatch) {
      requestAnimationFrame(() => nationalInputRef.current?.focus());
    }
  };

  // Tapping anywhere in the field focuses the calling-code input until it's
  // complete, then the national input — so the caret lands where the next digit goes.
  const focusActiveInput = () => {
    if (!editable) return;
    requestAnimationFrame(() => {
      if (isCallingCodeComplete) nationalInputRef.current?.focus();
      else callingCodeInputRef.current?.focus();
    });
  };

  const handleNationalChange = (formatted: string) => {
    if (!selectedCountry) return;

    // Re-extract from the formatted text (the mask reflows on every keystroke),
    // capped at the mask's slot count so the stored value never outruns display.
    let digits = normalizeNationalDigits(formatted);
    if (maxNationalDigits > 0 && digits.length > maxNationalDigits) {
      digits = digits.slice(0, maxNationalDigits);
    }

    const nextDisplay = applyPhoneMask(nationalMask, digits);
    const nextE164 = toE164(digits, selectedCountry);

    setDisplayValue(nextDisplay);
    setExtractedValue(digits);
    emitPhoneChange(nextE164);
    onValidationChange?.(digits ? validateExtractedPhone(digits, selectedCountry) : false);
    evaluateValidity(digits, selectedCountry);
  };

  // Backspace at the start of an empty national field steps back into the
  // calling-code field, letting the user delete the code digit by digit.
  const handleNationalKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key !== "Backspace" || extractedValue.length > 0) return;

    const normalized = normalizeCallingCode(callingCodeInput);
    if (normalized.length <= 1) {
      callingCodeInputRef.current?.focus();
      return;
    }

    applyCallingCodeChange(normalized.slice(0, -1));
    requestAnimationFrame(() => callingCodeInputRef.current?.focus());
  };

  const onFieldBlur = () => {
    setFocused(false);
    onValidationChange?.(extractedValue ? validateExtractedPhone(extractedValue, selectedCountry as CountryPhoneConfig) : false);
    evaluateValidity(extractedValue, selectedCountry as CountryPhoneConfig, true);
  };

  if (!selectedCountry) return null;

  // The example number doubles as the national placeholder — but only once the
  // calling code matches, so a half-typed code doesn't show a misleading example.
  const nationalPlaceholder = isCallingCodeComplete ? (placeholder ?? selectedCountry.example) : "";

  const sizeMetrics = SIZES[size];
  const textSizeStyle = { fontSize: sizeMetrics.fontSize };
  // Calling-code field widens with its content so it never clips "+1" vs "+376".
  const callingCodeWidth = Math.max(callingCodeInput.length + 1, 2) * sizeMetrics.fontSize * 0.6;

  const validationError = validationMode !== "never" && showValidationError ? invalidError : undefined;
  const displayedError = error ?? validationError;
  const hasError = Boolean(displayedError);

  const flagNode = renderFlag({
    code: selectedCountry.code,
    size: sizeMetrics.fontSize + 6,
  });

  const fieldRow = (
    <Pressable
      testID={testID}
      onPress={focusActiveInput}
      focusable={false}
      style={[
        defaultStyles.field,
        { minHeight: sizeMetrics.minHeight, paddingHorizontal: sizeMetrics.paddingHorizontal },
        focused && !hasError && defaultStyles.fieldFocused,
        hasError && defaultStyles.fieldInvalid,
        !editable && defaultStyles.fieldDisabled,
        styles?.field,
      ]}
    >
      <Pressable
        onPress={() => editable && setIsPickerOpen(true)}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={chooseCountryLabel}
        hitSlop={8}
        style={[defaultStyles.flagButton, styles?.flagButton]}
      >
        <View style={styles?.flag}>{flagNode}</View>
        <Text style={[defaultStyles.caret, styles?.caret]}>▼</Text>
      </Pressable>

      <TextInput
        ref={callingCodeInputRef}
        testID={testID ? `${testID}-calling-code` : undefined}
        value={callingCodeInput}
        editable={editable}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={5}
        placeholder="+"
        placeholderTextColor={COLORS.placeholder}
        style={[defaultStyles.callingCodeInput, noOutline, textSizeStyle, { width: callingCodeWidth }, styles?.callingCodeInput]}
        onFocus={() => {
          // A complete code sends focus onward to the national field.
          if (editable && isCallingCodeComplete) {
            requestAnimationFrame(() => nationalInputRef.current?.focus());
            return;
          }
          if (editable) setFocused(true);
        }}
        onBlur={onFieldBlur}
        onChangeText={(next) => applyCallingCodeChange(next, true)}
      />

      <TextInput
        ref={nationalInputRef}
        testID={testID ? `${testID}-national` : undefined}
        value={displayValue}
        editable={editable}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={nationalPlaceholder}
        placeholderTextColor={COLORS.placeholder}
        style={[defaultStyles.nationalInput, noOutline, textSizeStyle, styles?.nationalInput]}
        onFocus={() => {
          // Route focus back to an incomplete calling code before national digits.
          if (editable && !isCallingCodeComplete) {
            requestAnimationFrame(() => callingCodeInputRef.current?.focus());
            return;
          }
          if (editable) setFocused(true);
        }}
        onBlur={onFieldBlur}
        onKeyPress={handleNationalKeyPress}
        onChangeText={handleNationalChange}
      />
    </Pressable>
  );

  const picker = isPickerOpen ? (
    renderCountryPicker ? (
      renderCountryPicker({
        visible: isPickerOpen,
        onClose: () => setIsPickerOpen(false),
        options: countryOptions,
        selectedCountry: country,
        onSelect: applyCountrySelection,
        renderFlag,
        title: pickerTitle,
        searchPlaceholder: pickerSearchPlaceholder,
        noResultsLabel: noCountriesFoundLabel,
        styles,
      })
    ) : (
      <CountryPicker
        visible={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        options={countryOptions}
        selectedCountry={country}
        onSelect={applyCountrySelection}
        renderFlag={renderFlag}
        title={pickerTitle}
        searchPlaceholder={pickerSearchPlaceholder}
        noResultsLabel={noCountriesFoundLabel}
        styles={styles}
      />
    )
  ) : null;

  if (renderContainer) {
    return (
      <>
        {renderContainer({
          id: testID ?? "rnt-phone",
          label,
          error: displayedError,
          hint: !displayedError ? hint : undefined,
          children: fieldRow,
          style,
        })}
        {picker}
      </>
    );
  }

  return (
    <View style={[defaultStyles.root, style, styles?.root]}>
      {label ? <Text style={[defaultStyles.label, styles?.label]}>{label}</Text> : null}
      {fieldRow}
      {displayedError ? (
        <Text testID={testID ? `${testID}-error` : undefined} role="alert" style={[defaultStyles.error, styles?.error]}>
          {displayedError}
        </Text>
      ) : !hint ? null : (
        <Text style={[defaultStyles.hint, styles?.hint]}>{hint}</Text>
      )}
      {picker}
    </View>
  );
}
