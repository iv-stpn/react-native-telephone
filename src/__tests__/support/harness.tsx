// biome-ignore-all lint/style/useComponentExportOnlyModules: shared test harness, not a component module

import type { CountryCode } from 'country-data-ts/countries';
import { type ReactNode, useCallback, useState } from 'react';
import type { NativeSyntheticEvent, ReturnKeyTypeOptions, TargetedEvent, TextInputSubmitEditingEventData } from 'react-native';
import { PhoneInput } from '../../components/PhoneInput';
import type { RenderContainerProps, RenderCountryPickerProps, RenderFlag } from '../../components/types';

// A tiny controlled wrapper, since PhoneInput is a controlled component: it
// needs its `value` fed back to it to reflect what the user typed. Forwards the
// commonly exercised props; everything else stays at its default.
export type HarnessProps = {
  onChange?: (v: string) => void;
  onCountryChange?: (v: string) => void;
  onValidationChange?: (v: boolean) => void;
  testID?: string;
  defaultCountry?: CountryCode;
  validationMode?: 'onType' | 'onBlur' | 'never';
  editable?: boolean;
  allowedCountries?: CountryCode[];
  label?: string;
  renderFlag?: RenderFlag;
  renderContainer?: (props: RenderContainerProps) => ReactNode;
  renderCountryPicker?: (props: RenderCountryPickerProps) => ReactNode;
  onFocus?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
};

export function Harness({ onChange, onCountryChange, onValidationChange, ...props }: HarnessProps) {
  const [value, setValue] = useState('');
  const onChangeText = useCallback(
    (next: string) => {
      setValue(next);
      onChange?.(next);
    },
    [onChange],
  );

  return (
    <PhoneInput
      testID={props.testID ?? 'phone'}
      locale="en-US"
      value={value}
      label={props.label}
      defaultCountry={props.defaultCountry ?? 'US'}
      allowedCountries={props.allowedCountries}
      validationMode={props.validationMode}
      editable={props.editable}
      onChangeText={onChangeText}
      onCountryChange={onCountryChange}
      onValidationChange={onValidationChange}
      renderFlag={props.renderFlag}
      renderContainer={props.renderContainer}
      renderCountryPicker={props.renderCountryPicker}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      returnKeyType={props.returnKeyType}
      onSubmitEditing={props.onSubmitEditing}
    />
  );
}
