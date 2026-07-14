// biome-ignore-all lint/style/useComponentExportOnlyModules: this is a test file

import { fireEvent, render, screen } from '@testing-library/react';
import { useCallback } from 'react';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import type { RenderContainerProps, RenderCountryPickerProps, RenderFlag } from '../components/types';
import { Harness } from './support/harness';

describe('PhoneInput — rendering & props', () => {
  it('renders a custom flag via renderFlag', () => {
    const renderFlag: RenderFlag = ({ code }) => <Text testID={`flag-${code}`}>{code}</Text>;
    render(<Harness renderFlag={renderFlag} defaultCountry="US" />);
    expect(screen.getByTestId('flag-US')).toHaveTextContent('US');
  });

  it('renders a custom container via renderContainer', () => {
    const renderContainer = (props: RenderContainerProps) => (
      <div data-testid="custom-container">
        <span>{props.label}</span>
        {props.children}
      </div>
    );
    render(<Harness label="My phone" renderContainer={renderContainer} defaultCountry="US" />);
    expect(screen.getByTestId('custom-container')).toBeInTheDocument();
    expect(screen.getByText('My phone')).toBeInTheDocument();
    // The field row is still rendered inside the custom container.
    expect(screen.getByTestId('phone-national')).toBeInTheDocument();
  });

  it('renders a custom picker via renderCountryPicker', () => {
    const renderCountryPicker = (props: RenderCountryPickerProps) => {
      const onClick = useCallback(() => props.onSelect('FR'), [props.onSelect]);
      const pickFrLabel = 'pick FR';
      return (
        <div data-testid="custom-picker">
          <button type="button" onClick={onClick}>
            {pickFrLabel}
          </button>
        </div>
      );
    };
    const onCountryChange = vi.fn();
    render(<Harness renderCountryPicker={renderCountryPicker} onCountryChange={onCountryChange} defaultCountry="US" />);
    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByText('pick FR'));
    expect(onCountryChange).toHaveBeenCalledWith('FR');
    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+33');
  });

  it('disables the picker and inputs when editable is false', () => {
    render(<Harness editable={false} defaultCountry="US" />);
    expect(screen.getByLabelText('Choose country')).toBeDisabled();
    // react-native-web expresses editable={false} on a TextInput as `readonly`.
    expect(screen.getByTestId('phone-calling-code')).toHaveAttribute('readonly');
    expect(screen.getByTestId('phone-national')).toHaveAttribute('readonly');
  });
});
