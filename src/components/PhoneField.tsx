import type { NativeSyntheticEvent, ReturnKeyTypeOptions, TextInputSubmitEditingEventData } from 'react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { RenderFlag } from '../utils/flags';
import type { PhoneInputView } from './phoneController.types';
import { COLORS, defaultStyles, noOutline } from './styles';
import type { PhoneInputStyles } from './types';

const CARET_GLYPH = '▼';
const CALLING_CODE_WIDTH_SLACK = 2;
const DEFAULT_CALLING_CODE_LABEL = 'Calling code';
const DEFAULT_NATIONAL_LABEL = 'Phone number';

type FieldStyles = Partial<PhoneInputStyles> | undefined;
type SizeMetrics = { fontSize: number; minHeight: number; paddingHorizontal: number };
type TextSizeStyle = { fontSize: number };

type FlagButtonProps = {
  view: PhoneInputView;
  editable: boolean;
  flagSize: number;
  chooseCountryLabel: string;
  renderFlag: RenderFlag;
  styles: FieldStyles;
};

type CallingCodeFieldProps = {
  view: PhoneInputView;
  editable: boolean;
  testID?: string;
  textSizeStyle: TextSizeStyle;
  styles: FieldStyles;
};

type NationalFieldProps = {
  view: PhoneInputView;
  editable: boolean;
  testID?: string;
  label?: string;
  placeholder: string;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
  textSizeStyle: TextSizeStyle;
  styles: FieldStyles;
};

type PhoneFieldProps = {
  view: PhoneInputView;
  editable: boolean;
  sizeMetrics: SizeMetrics;
  hasError: boolean;
  testID?: string;
  label?: string;
  placeholder?: string;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
  chooseCountryLabel: string;
  renderFlag: RenderFlag;
  styles: FieldStyles;
};

// The tappable flag + caret that opens the country picker.
export function FlagButton({ view, editable, flagSize, chooseCountryLabel, renderFlag, styles }: FlagButtonProps) {
  return (
    <Pressable
      onPress={view.openPicker}
      disabled={!editable}
      accessibilityRole="button"
      accessibilityLabel={chooseCountryLabel}
      hitSlop={8}
      style={[defaultStyles.flagButton, styles?.flagButton]}
    >
      <View style={styles?.flag}>{renderFlag({ code: view.selectedCountry.code, size: flagSize })}</View>
      <Text style={[defaultStyles.caret, styles?.caret]}>{CARET_GLYPH}</Text>
    </Pressable>
  );
}

// The calling-code input plus an off-screen probe that measures the rendered
// text width so the field widens to fit "+1" vs "+376" exactly.
export function CallingCodeField({ view, editable, testID, textSizeStyle, styles }: CallingCodeFieldProps) {
  const measuredText = view.callingCodeInput.length > 0 ? view.callingCodeInput : '+';
  const estimatedWidth = Math.max(view.callingCodeInput.length + 1, 2) * textSizeStyle.fontSize * 0.5;
  const width = (view.callingCodeTextWidth || estimatedWidth) + CALLING_CODE_WIDTH_SLACK;

  return (
    <>
      <TextInput
        ref={view.callingCodeInputRef}
        testID={testID ? `${testID}-calling-code` : undefined}
        accessibilityLabel={DEFAULT_CALLING_CODE_LABEL}
        value={view.callingCodeInput}
        editable={editable}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="tel-country-code"
        // Generous cap so a full number pasted into the code field reaches the
        // change handler (which routes it to the national field) instead of being
        // truncated into an unroutable stub. Normal code entry stays 1–3 digits.
        maxLength={24}
        placeholder="+"
        placeholderTextColor={COLORS.placeholder}
        style={[
          defaultStyles.callingCodeInput,
          noOutline,
          textSizeStyle,
          { width },
          !editable && defaultStyles.inputDisabled,
          styles?.callingCodeInput,
        ]}
        onFocus={view.handleCallingCodeFocus}
        onBlur={view.handleFieldBlur}
        onChangeText={view.handleCallingCodeChange}
      />
      {/*
       * Off-screen probe measuring the real rendered width of the calling-code
       * text (same font/characters as the input), so onLayout reports the exact
       * width — no per-character estimate. Absolutely positioned so it never
       * affects layout; non-interactive and hidden from assistive tech.
       */}
      <Text
        aria-hidden={true}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
        numberOfLines={1}
        style={[defaultStyles.callingCodeInput, textSizeStyle, styles?.callingCodeInput, defaultStyles.callingCodeMeasure]}
        onLayout={view.handleCallingCodeLayout}
      >
        {measuredText}
      </Text>
    </>
  );
}

// The national-number input: the canonical phone-autofill target.
export function NationalField(props: NationalFieldProps) {
  const { view, editable, testID, label, placeholder, returnKeyType, onSubmitEditing, textSizeStyle, styles } = props;
  return (
    <TextInput
      ref={view.nationalInputRef}
      testID={testID ? `${testID}-national` : undefined}
      accessibilityLabel={label ?? DEFAULT_NATIONAL_LABEL}
      value={view.displayValue}
      editable={editable}
      keyboardType="phone-pad"
      autoCapitalize="none"
      autoCorrect={false}
      // Opt into OS/browser phone autofill: textContentType on iOS, autoComplete
      // on Android and react-native-web.
      textContentType="telephoneNumber"
      autoComplete="tel"
      placeholder={placeholder}
      placeholderTextColor={COLORS.placeholder}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      style={[
        defaultStyles.nationalInput,
        noOutline,
        textSizeStyle,
        !editable && defaultStyles.inputDisabled,
        styles?.nationalInput,
      ]}
      onFocus={view.handleNationalFocus}
      onBlur={view.handleFieldBlur}
      onKeyPress={view.handleNationalKeyPress}
      onChangeText={view.handleNationalChange}
    />
  );
}

// The full field row: flag button + calling-code field + national field.
export function PhoneField(props: PhoneFieldProps) {
  const { view, editable, sizeMetrics, hasError, testID, label, placeholder, chooseCountryLabel, renderFlag, styles } = props;
  const { returnKeyType, onSubmitEditing } = props;
  const textSizeStyle = { fontSize: sizeMetrics.fontSize };
  const nationalPlaceholder = view.isCallingCodeComplete ? (placeholder ?? view.selectedCountry.example) : '';

  return (
    <Pressable
      testID={testID}
      onPress={view.focusActiveInput}
      focusable={false}
      style={[
        defaultStyles.field,
        { minHeight: sizeMetrics.minHeight, paddingHorizontal: sizeMetrics.paddingHorizontal },
        view.focused && !hasError && defaultStyles.fieldFocused,
        hasError && defaultStyles.fieldInvalid,
        !editable && defaultStyles.fieldDisabled,
        styles?.field,
      ]}
    >
      <FlagButton
        view={view}
        editable={editable}
        flagSize={sizeMetrics.fontSize + 6}
        chooseCountryLabel={chooseCountryLabel}
        renderFlag={renderFlag}
        styles={styles}
      />
      <CallingCodeField view={view} editable={editable} testID={testID} textSizeStyle={textSizeStyle} styles={styles} />
      <NationalField
        view={view}
        editable={editable}
        testID={testID}
        label={label}
        placeholder={nationalPlaceholder}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        textSizeStyle={textSizeStyle}
        styles={styles}
      />
    </Pressable>
  );
}
