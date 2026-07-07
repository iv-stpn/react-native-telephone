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
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  formatAreaCode,
  getCountryFromLocale,
  getDefaultCountryForCallingCode,
  getNationalMask,
  nationalBelongsToCountry,
  nationalFromE164,
  normalizeCallingCode,
  normalizeNationalDigits,
  parseCountryFromE164,
  resolvePastedNational,
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
const DEFAULT_CALLING_CODE_LABEL = "Calling code";
const DEFAULT_NATIONAL_LABEL = "Phone number";

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
  // Actual rendered width of the calling-code text, measured from a hidden Text
  // that mirrors the field's content in the exact same font (see below). 0 until
  // the first onLayout fires, at which point a char-count estimate stands in.
  const [callingCodeTextWidth, setCallingCodeTextWidth] = useState(0);

  // The last E.164 value this component emitted, so the sync effect can tell an
  // external `value` change apart from an echo of our own onChangeText.
  const lastEmittedValueRef = useRef(value);
  const callingCodeInputRef = useRef<TextInput>(null);
  const nationalInputRef = useRef<TextInput>(null);
  // While true, the calling-code field's onFocus skips its usual "code is
  // complete → bounce focus to the national field" redirect. Set during a
  // select-all that targets the calling code so the field actually stays
  // focused and its text stays selected.
  const selectingAllCodeRef = useRef(false);

  const selectedCountryOption = useMemo(
    () => countryOptions.find((option) => option.config.code === country) ?? countryOptions[0],
    [countryOptions, country],
  );
  const selectedCountry = selectedCountryOption?.config;

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

  // Config lookup by ISO code, used to resolve a paste-detected country switch.
  const configByCode = useMemo(() => new Map(configs.map((config) => [config.code, config])), [configs]);

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
    if (parsedCountry && parsedCountry.code !== country && allowedSet.has(parsedCountry.code)) setCountry(parsedCountry.code);

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
    // Re-selecting the current country is a no-op: don't re-seed an area code or
    // reset digits the user already typed.
    if (nextCountry === country) return;

    // Decide what national digits carry into the new country:
    //  - A country pinned by a single area code within a shared calling code
    //    (e.g. Guernsey "+44 1481", Bahamas "+1 (242)") seeds the national field
    //    with that area code — the prefix is fixed, so the user continues with
    //    the subscriber number. The display is mask-formatted (parentheses
    //    included) via `formatAreaCode` so it reads "(242)" not "(242".
    //  - Switching within the SAME calling code to a country with no singular
    //    area code, when the typed number's area code belongs to a different
    //    country (e.g. "+1 (684)" American Samoa → Canada), clears the field:
    //    the foreign area code can't carry over. A 204 (Canadian) number →
    //    Canada still belongs, so it reflows unchanged.
    //  - Otherwise the typed digits reflow under the new mask. We deliberately
    //    don't round-trip through the old country's E.164 — doing so would
    //    splice the old calling code into the national part whenever the two
    //    codes differ (e.g. US "+1" → FR would turn "612345678" into
    //    "1612345678"). E.164 is re-derived below from the new config.
    const nationalMask = getNationalMask(nextConfig);
    const areaCode = nextOption.areaCode;
    const sameCallingCode = selectedCountry.callingCode === nextConfig.callingCode;
    const foreignAreaCode = sameCallingCode && !nationalBelongsToCountry(nextConfig.callingCode, extractedValue, nextCountry);

    let nextNational: string;
    let seedAreaCode = false;
    if (areaCode) {
      nextNational = areaCode;
      seedAreaCode = true;
    } else if (foreignAreaCode) nextNational = "";
    else nextNational = extractedValue;

    const display = nextNational
      ? seedAreaCode
        ? formatAreaCode(nationalMask, areaCode as string)
        : applyPhoneMask(nationalMask, nextNational)
      : "";

    setCountry(nextCountry);
    setExtractedValue(nextNational);
    setDisplayValue(display);
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

    // More digits than any calling code (country codes are 1–3 digits) means a
    // full number was pasted — or over-typed — into the code field. Route it
    // through the national resolver so the country is detected and the number
    // lands in the national field instead of leaving the code field stuck on an
    // unroutable "+12…".
    if (normalizeNationalDigits(rawCallingCode).length > 3) {
      applyNationalInput(rawCallingCode, { focusNational: focusNationalOnMatch, resetCallingCode: true });
      return;
    }

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

    if (focusNationalOnMatch) requestAnimationFrame(() => nationalInputRef.current?.focus());
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

  // Core handler for the national field (and for full-number pastes routed from
  // the calling-code field). Resolves country + national digits — recognizing
  // pasted international numbers (e.g. "+1 (204) 234-2222" → Canada,
  // "2042342222") instead of naively digit-stripping and truncating — then
  // formats and emits. When the input isn't transformed (normal typing, or a
  // paste that fits the current country), the raw text is conformed so
  // separators the user typed are revealed immediately.
  const applyNationalInput = (
    formatted: string,
    { focusNational = false, resetCallingCode = false }: { focusNational?: boolean; resetCallingCode?: boolean } = {},
  ) => {
    if (!selectedCountry) return;

    const resolved = resolvePastedNational(formatted, selectedCountry, configs, allowedSet);
    const config = configByCode.get(resolved.country) ?? selectedCountry;
    const mask = getNationalMask(config);
    const max = countMaskDigitSlots(mask);

    let display: string;
    let digits: string;
    if (resolved.normalized) {
      digits = resolved.national.slice(0, max);
      display = conformToMask(mask, digits, max);
    } else {
      display = conformToMask(mask, formatted, max);
      digits = normalizeNationalDigits(display).slice(0, max);
    }

    // A paste may switch the country (and calling code); resetCallingCode covers
    // full-number pastes that arrived via the calling-code field and need it
    // restored to the resolved country's code.
    if (resolved.country !== country) {
      setCountry(resolved.country);
      onCountryChange?.(resolved.country);
    }
    if (resolved.country !== country || resetCallingCode) setCallingCodeInput(config.callingCode);

    const nextE164 = toE164(digits, config);

    setDisplayValue(display);
    setExtractedValue(digits);
    emitPhoneChange(nextE164);
    onValidationChange?.(digits ? validateExtractedPhone(digits, config) : false);
    evaluateValidity(digits, config);

    if (focusNational) requestAnimationFrame(() => nationalInputRef.current?.focus());
  };

  const handleNationalChange = (formatted: string) => applyNationalInput(formatted);

  // Backspace at the start of an empty national field steps back into the
  // calling-code field, letting the user delete the code digit by digit.
  // Select-all (Ctrl/Cmd+A) in an empty national field retargets the
  // calling-code field — there's nothing to select here, so select the code
  // instead. With a number typed, the default select-all (national text) runs.
  const handleNationalKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const nativeEvent = event.nativeEvent as TextInputKeyPressEventData & { ctrlKey?: boolean; metaKey?: boolean };

    if (extractedValue.length === 0 && nativeEvent.key?.toLowerCase() === "a" && (nativeEvent.ctrlKey || nativeEvent.metaKey)) {
      const codeRef = callingCodeInputRef.current;
      if (codeRef) {
        selectingAllCodeRef.current = true;
        codeRef.focus();
        if (Platform.OS === "web" && typeof (codeRef as unknown as HTMLInputElement).select === "function")
          (codeRef as unknown as HTMLInputElement).select();
        requestAnimationFrame(() => {
          selectingAllCodeRef.current = false;
        });
      }
      event.preventDefault?.();
      return;
    }

    if (nativeEvent.key !== "Backspace" || extractedValue.length > 0) return;

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
  // Width comes from an actual measurement of the rendered text (the hidden Text
  // below), not a per-character estimate, so it's exact for any font. A few px of
  // slack leaves room for the caret/cursor at the end. Before the first layout we
  // fall back to a rough char-count estimate so the field isn't zero-width.
  const CALLING_CODE_WIDTH_SLACK = 2;
  const measuredText = callingCodeInput.length > 0 ? callingCodeInput : "+";
  const estimatedWidth = Math.max(callingCodeInput.length + 1, 2) * sizeMetrics.fontSize * 0.5;
  const callingCodeWidth = (callingCodeTextWidth || estimatedWidth) + CALLING_CODE_WIDTH_SLACK;

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
        accessibilityLabel={DEFAULT_CALLING_CODE_LABEL}
        value={callingCodeInput}
        editable={editable}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
        // Generous cap so a full number pasted into the code field reaches the
        // change handler (which routes it to the national field) instead of being
        // truncated into an unroutable stub. Normal code entry stays 1–3 digits.
        maxLength={24}
        placeholder="+"
        placeholderTextColor={COLORS.placeholder}
        style={[defaultStyles.callingCodeInput, noOutline, textSizeStyle, { width: callingCodeWidth }, styles?.callingCodeInput]}
        onFocus={() => {
          // A complete code sends focus onward to the national field — unless
          // a select-all is deliberately landing here to select the code.
          if (editable && isCallingCodeComplete && !selectingAllCodeRef.current) {
            requestAnimationFrame(() => nationalInputRef.current?.focus());
            return;
          }
          if (editable) setFocused(true);
        }}
        onBlur={onFieldBlur}
        onChangeText={(next) => applyCallingCodeChange(next, true)}
      />

      {/*
       * Off-screen probe used only to measure the real rendered width of the
       * calling-code text. It carries the same font (size/family via the same
       * style chain the input uses) and the same characters, so onLayout reports
       * the exact width the input needs — no per-character estimate. Absolutely
       * positioned so it never affects the row's layout; non-interactive and
       * unmeasured by assistive tech.
       */}
      <Text
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        numberOfLines={1}
        style={[defaultStyles.callingCodeInput, textSizeStyle, styles?.callingCodeInput, defaultStyles.callingCodeMeasure]}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          setCallingCodeTextWidth((prev) => (Math.abs(prev - width) > 0.5 ? width : prev));
        }}
      >
        {measuredText}
      </Text>

      <TextInput
        ref={nationalInputRef}
        testID={testID ? `${testID}-national` : undefined}
        accessibilityLabel={label ?? DEFAULT_NATIONAL_LABEL}
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

  if (renderContainer)
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
