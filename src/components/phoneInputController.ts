import type { CountryCode } from 'country-data-ts/countries';
import type { CountryPhoneConfig } from 'country-data-ts/phone-data';
import { type NativeSyntheticEvent, Platform, type TargetedEvent, type TextInputKeyPressEventData } from 'react-native';
import { nationalBelongsToCountry } from '../utils/areaCodes';
import { getDefaultCountryForCallingCode } from '../utils/callingCodeDefaults';
import type { CountryOption } from '../utils/options';
import {
  applyPhoneMask,
  conformToMask,
  countMaskDigitSlots,
  countRequiredMaskDigits,
  formatAreaCode,
  getNationalMask,
  normalizeCallingCode,
  normalizeNationalDigits,
} from '../utils/phoneMask';
import { resolvePastedNational, toE164, validateExtractedPhone } from '../utils/phoneParse';
import type { ApplyNationalInputOptions, PhoneController } from './phoneController.types';

function emitPhoneChange(c: PhoneController, nextValue: string): void {
  c.lastEmittedValueRef.current = nextValue;
  c.onChangeText(nextValue);
}

// Fires the external onFocus once on true entry: cancel any pending blur, then gate on fieldFocusedRef to swallow the internal code↔national hop.
function notifyFieldFocus(c: PhoneController, event: NativeSyntheticEvent<TargetedEvent>): void {
  if (c.blurTimerRef.current !== null) clearTimeout(c.blurTimerRef.current);
  c.blurTimerRef.current = null;
  if (c.fieldFocusedRef.current) return;
  c.fieldFocusedRef.current = true;
  c.onFocus?.(event);
}

function enterField(c: PhoneController, event: NativeSyntheticEvent<TargetedEvent>, reroute?: () => void): void {
  if (!c.editable) return;
  notifyFieldFocus(c, event);
  if (reroute) requestAnimationFrame(reroute);
  else c.setFocused(true);
}

function isNationalFull(digits: string, config: CountryPhoneConfig): boolean {
  const required = countRequiredMaskDigits(getNationalMask(config));
  return required > 0 && digits.length >= required;
}

// Auto-reveal the validation error once the national number fills the mask's
// required slots (validationMode "onType"), or unconditionally on blur (force).
// "onBlur" defers to blur only; "never" keeps the built-in error hidden always.
function evaluateValidity(c: PhoneController, national: string, config: CountryPhoneConfig, force = false): void {
  if (c.validationMode === 'never') {
    c.setShowValidationError(false);
    return;
  }

  const digits = normalizeNationalDigits(national);
  if (!digits) {
    c.setShowValidationError(false);
    return;
  }

  const gateOpen = force || (c.validationMode === 'onType' && isNationalFull(digits, config));
  if (!gateOpen) {
    c.setShowValidationError(false);
    return;
  }

  c.setShowValidationError(!validateExtractedPhone(digits, config));
}

/**
 * Picks which country to activate when a shared calling code is typed: keep the
 * currently-active country if it shares the code, else the default (biggest)
 * country for that code (e.g. +1 → US), else the first option as a last resort.
 */
function resolveActiveMatch(matches: readonly CountryOption[], activeCountry: CountryCode): CountryOption | undefined {
  const active = matches.find((option) => option.config.code === activeCountry);
  if (active) return active;

  const defaultCode = getDefaultCountryForCallingCode(matches[0]?.config.callingCode ?? '');
  const byDefault = defaultCode ? matches.find((option) => option.config.code === defaultCode) : undefined;
  return byDefault ?? matches[0];
}

// Moves focus to the calling-code field and selects its text (web only). Used by
// the empty-field select-all shortcut so Ctrl/Cmd+A targets the code.
function selectCallingCodeField(c: PhoneController): void {
  const codeRef = c.callingCodeInputRef.current;
  if (!codeRef) return;
  c.selectingAllCodeRef.current = true;
  codeRef.focus();
  // `.select()` is a web-only DOM method absent from RN's TextInput type; reach
  // for it dynamically rather than casting the ref to HTMLInputElement.
  const select = Reflect.get(codeRef, 'select');
  if (Platform.OS === 'web' && typeof select === 'function') select.call(codeRef);
  requestAnimationFrame(() => {
    c.selectingAllCodeRef.current = false;
  });
}

// Switch country from the picker, re-formatting the current national number
// under the new mask and re-deriving the E.164 value with the new calling code.
export function applyCountrySelection(c: PhoneController, nextCountry: CountryCode): void {
  const nextOption = c.countryOptions.find((option) => option.config.code === nextCountry);
  if (!(nextOption && c.selectedCountry)) return;

  const nextConfig = nextOption.config;
  // Re-selecting the current country is a no-op: don't re-seed an area code or
  // reset digits the user already typed.
  if (nextCountry === c.country) return;

  // Decide what national digits carry into the new country:
  //  - A country pinned by a single area code within a shared calling code
  //    (Guernsey "+44 1481", Bahamas "+1 (242)") seeds that area code, mask-
  //    formatted via `formatAreaCode` so it reads "(242)" not "(242".
  //  - Switching within the SAME calling code to a country whose typed area code
  //    belongs elsewhere ("+1 (684)" American Samoa → Canada) clears the field;
  //    a matching 204 (Canadian) number still belongs, so it reflows unchanged.
  //  - Otherwise the digits reflow under the new mask. We deliberately don't
  //    round-trip through the old E.164 (US "+1" → FR would splice "1" into
  //    "612345678"); E.164 is re-derived below from the new config.
  const nationalMask = getNationalMask(nextConfig);
  const areaCode = nextOption.areaCode;
  const sameCallingCode = c.selectedCountry.callingCode === nextConfig.callingCode;
  const foreignAreaCode = sameCallingCode && !nationalBelongsToCountry(nextConfig.callingCode, c.extractedValue, nextCountry);

  let nextNational: string;
  let seedAreaCode = false;
  if (areaCode) {
    nextNational = areaCode;
    seedAreaCode = true;
  } else if (foreignAreaCode) nextNational = '';
  else nextNational = c.extractedValue;

  let display = '';
  if (nextNational)
    display = seedAreaCode ? formatAreaCode(nationalMask, nextNational) : applyPhoneMask(nationalMask, nextNational);

  c.setCountry(nextCountry);
  c.setExtractedValue(nextNational);
  c.setDisplayValue(display);
  c.setCallingCodeInput(nextConfig.callingCode);
  c.onCountryChange?.(nextCountry);

  emitPhoneChange(c, toE164(nextNational, nextConfig));
  c.onValidationChange?.(nextNational ? validateExtractedPhone(nextNational, nextConfig) : false);
  evaluateValidity(c, nextNational, nextConfig);
}

// Core handler for the national field (and for full-number pastes routed from
// the calling-code field). Resolves country + national digits — recognizing
// pasted international numbers (e.g. "+1 (204) 234-2222" → Canada, "2042342222")
// instead of naively digit-stripping and truncating — then formats and emits.
// When the input isn't transformed (normal typing, or a paste that fits the
// current country), the raw text is conformed so separators are revealed.
export function applyNationalInput(c: PhoneController, formatted: string, options: ApplyNationalInputOptions = {}): void {
  const { focusNational = false, resetCallingCode = false } = options;
  if (!c.selectedCountry) return;

  const resolved = resolvePastedNational(formatted, c.selectedCountry, c.configs, c.allowedSet);
  const config = c.configByCode.get(resolved.country) ?? c.selectedCountry;
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
  if (resolved.country !== c.country) {
    c.setCountry(resolved.country);
    c.onCountryChange?.(resolved.country);
  }
  if (resolved.country !== c.country || resetCallingCode) c.setCallingCodeInput(config.callingCode);

  c.setDisplayValue(display);
  c.setExtractedValue(digits);
  emitPhoneChange(c, toE164(digits, config));
  c.onValidationChange?.(digits ? validateExtractedPhone(digits, config) : false);
  evaluateValidity(c, digits, config);

  if (focusNational) requestAnimationFrame(() => c.nationalInputRef.current?.focus());
}

// Handle edits to the calling-code field. When the typed code matches a known
// country's calling code we switch to it (keeping the active country if it
// shares the code); otherwise we just store the raw code and wait for more digits.
export function applyCallingCodeChange(c: PhoneController, rawCallingCode: string, focusNationalOnMatch = false): void {
  if (!c.selectedCountry) return;

  // More digits than any calling code (country codes are 1–3 digits) means a
  // full number was pasted — or over-typed — into the code field. Route it
  // through the national resolver so the country is detected and the number
  // lands in the national field instead of leaving the code field stuck on an
  // unroutable "+12…".
  if (normalizeNationalDigits(rawCallingCode).length > 3) {
    applyNationalInput(c, rawCallingCode, { focusNational: focusNationalOnMatch, resetCallingCode: true });
    return;
  }

  const nextCallingCode = normalizeCallingCode(rawCallingCode);
  const matches = c.countriesByCallingCode.get(nextCallingCode);
  const activeMatch = matches && matches.length > 0 ? resolveActiveMatch(matches, c.country) : undefined;
  if (!activeMatch) {
    c.setCallingCodeInput(nextCallingCode);
    return;
  }

  const nextConfig = activeMatch.config;
  c.setCountry(nextConfig.code);
  c.setCallingCodeInput(nextConfig.callingCode);
  c.onCountryChange?.(nextConfig.code);

  emitPhoneChange(c, toE164(c.extractedValue, nextConfig));
  c.onValidationChange?.(c.extractedValue ? validateExtractedPhone(c.extractedValue, nextConfig) : false);
  evaluateValidity(c, c.extractedValue, nextConfig);

  if (focusNationalOnMatch) requestAnimationFrame(() => c.nationalInputRef.current?.focus());
}

// Tapping anywhere in the field focuses the calling-code input until it's
// complete, then the national input — so the caret lands where the next digit goes.
export function focusActiveInput(c: PhoneController): void {
  if (!c.editable) return;
  requestAnimationFrame(() => {
    if (c.isCallingCodeComplete) c.nationalInputRef.current?.focus();
    else c.callingCodeInputRef.current?.focus();
  });
}

// Backspace at the start of an empty national field steps back into the
// calling-code field, letting the user delete the code digit by digit.
// Select-all (Ctrl/Cmd+A) in an empty national field retargets the calling-code
// field — there's nothing to select here, so select the code instead. With a
// number typed, the default select-all (national text) runs.
export function handleNationalKeyPress(c: PhoneController, event: NativeSyntheticEvent<TextInputKeyPressEventData>): void {
  const nativeEvent = event.nativeEvent;
  // ctrlKey/metaKey aren't in RN's TextInputKeyPressEventData (they only exist on
  // web); read them dynamically so no `as` cast into a wider type is needed.
  const withModifier = Boolean(Reflect.get(nativeEvent, 'ctrlKey')) || Boolean(Reflect.get(nativeEvent, 'metaKey'));

  if (c.extractedValue.length === 0 && nativeEvent.key?.toLowerCase() === 'a' && withModifier) {
    selectCallingCodeField(c);
    event.preventDefault?.();
    return;
  }

  if (nativeEvent.key !== 'Backspace' || c.extractedValue.length > 0) return;

  const normalized = normalizeCallingCode(c.callingCodeInput);
  if (normalized.length <= 1) {
    c.callingCodeInputRef.current?.focus();
    return;
  }

  applyCallingCodeChange(c, normalized.slice(0, -1));
  requestAnimationFrame(() => c.callingCodeInputRef.current?.focus());
}

// Blur runs on every input (incl. the internal hop): validation stays synchronous, but onBlur is deferred a tick so a sibling focus cancels it.
export function handleFieldBlur(c: PhoneController, event: NativeSyntheticEvent<TargetedEvent>): void {
  c.setFocused(false);
  if (c.selectedCountry) {
    c.onValidationChange?.(c.extractedValue ? validateExtractedPhone(c.extractedValue, c.selectedCountry) : false);
    evaluateValidity(c, c.extractedValue, c.selectedCountry, true);
  }

  if (c.onBlur || c.fieldFocusedRef.current) {
    event.persist?.(); // guard against RN event pooling nulling it before the timer
    if (c.blurTimerRef.current !== null) clearTimeout(c.blurTimerRef.current);
    c.blurTimerRef.current = setTimeout(() => {
      c.blurTimerRef.current = null;
      c.fieldFocusedRef.current = false;
      c.onBlur?.(event);
    }, 0);
  }
}

// Calling-code focus: a complete code sends focus onward to the national field (unless a select-all lands here).
export function handleCallingCodeFocus(c: PhoneController, event: NativeSyntheticEvent<TargetedEvent>): void {
  const reroute = c.isCallingCodeComplete && !c.selectingAllCodeRef.current;
  enterField(c, event, reroute ? () => c.nationalInputRef.current?.focus() : undefined);
}

// National focus: routes focus back to an incomplete calling code first.
export function handleNationalFocus(c: PhoneController, event: NativeSyntheticEvent<TargetedEvent>): void {
  enterField(c, event, c.isCallingCodeComplete ? undefined : () => c.callingCodeInputRef.current?.focus());
}
