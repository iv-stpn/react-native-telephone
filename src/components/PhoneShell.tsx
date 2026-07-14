import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { defaultRenderFlag } from '../utils/flags';
import { CountryPicker } from './CountryPicker';
import { PhoneField } from './PhoneField';
import type { PhoneInputProps } from './PhoneInput';
import type { PhoneInputView } from './phoneController.types';
import { defaultStyles, SIZES } from './styles';
import type { RenderCountryPickerProps } from './types';

const DEFAULT_PICKER_TITLE = 'Select a country';
const DEFAULT_SEARCH_PLACEHOLDER = 'Search countries';
const DEFAULT_NO_RESULTS_LABEL = 'No countries found';
const DEFAULT_INVALID_ERROR = 'Invalid phone number';
const DEFAULT_CHOOSE_COUNTRY_LABEL = 'Choose country';

type PhonePickerProps = {
  view: PhoneInputView;
  props: PhoneInputProps;
};

type PhoneFooterProps = {
  displayedError?: string;
  hint?: string;
  testID?: string;
  styles: PhoneInputProps['styles'];
};

type PhoneShellProps = {
  view: PhoneInputView;
  props: PhoneInputProps;
};

// Renders the country picker (custom via renderCountryPicker, else the default
// modal) only while open. The picker props mirror the default CountryPicker's
// contract so a custom renderer is a drop-in replacement.
function PhonePicker({ view, props }: PhonePickerProps): ReactNode {
  if (!view.isPickerOpen) return null;
  const pickerProps: RenderCountryPickerProps = {
    visible: view.isPickerOpen,
    onClose: view.closePicker,
    options: view.countryOptions,
    selectedCountry: view.country,
    onSelect: view.selectCountry,
    renderFlag: props.renderFlag ?? defaultRenderFlag,
    title: props.pickerTitle ?? DEFAULT_PICKER_TITLE,
    searchPlaceholder: props.pickerSearchPlaceholder ?? DEFAULT_SEARCH_PLACEHOLDER,
    noResultsLabel: props.noCountriesFoundLabel ?? DEFAULT_NO_RESULTS_LABEL,
    styles: props.styles,
  };
  return props.renderCountryPicker ? props.renderCountryPicker(pickerProps) : <CountryPicker {...pickerProps} />;
}

// The error (or, failing that, hint) line beneath the field.
function PhoneFooter({ displayedError, hint, testID, styles }: PhoneFooterProps): ReactNode {
  if (displayedError)
    return (
      <Text testID={testID ? `${testID}-error` : undefined} role="alert" style={[defaultStyles.error, styles?.error]}>
        {displayedError}
      </Text>
    );
  if (hint) return <Text style={[defaultStyles.hint, styles?.hint]}>{hint}</Text>;
  return null;
}

// Composes the field row, picker, and (label/error) shell. Derives the display
// error and sizing from props + view; a custom renderContainer replaces the shell.
export function PhoneShell({ view, props }: PhoneShellProps): ReactNode {
  const {
    error,
    hint,
    invalidError = DEFAULT_INVALID_ERROR,
    validationMode = 'onType',
    size = 'md',
    style,
    styles,
    label,
  } = props;
  const validationError = validationMode !== 'never' && view.showValidationError ? invalidError : undefined;
  const displayedError = error ?? validationError;

  const field = (
    <PhoneField
      view={view}
      editable={props.editable ?? true}
      sizeMetrics={SIZES[size]}
      hasError={Boolean(displayedError)}
      testID={props.testID}
      label={label}
      placeholder={props.placeholder}
      chooseCountryLabel={props.chooseCountryLabel ?? DEFAULT_CHOOSE_COUNTRY_LABEL}
      renderFlag={props.renderFlag ?? defaultRenderFlag}
      styles={styles}
    />
  );
  const picker = <PhonePicker view={view} props={props} />;

  if (props.renderContainer)
    return (
      <>
        {props.renderContainer({
          id: props.testID ?? 'rnt-phone',
          label,
          error: displayedError,
          hint: displayedError ? undefined : hint,
          children: field,
          style,
        })}
        {picker}
      </>
    );

  return (
    <View style={[defaultStyles.root, style, styles?.root]}>
      {label ? <Text style={[defaultStyles.label, styles?.label]}>{label}</Text> : null}
      {field}
      <PhoneFooter displayedError={displayedError} hint={hint} testID={props.testID} styles={styles} />
      {picker}
    </View>
  );
}
