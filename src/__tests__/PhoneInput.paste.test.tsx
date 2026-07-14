import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Harness } from './support/harness';

describe('PhoneInput — paste handling', () => {
  it('parses a pasted international number and switches country by area code', () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // Pasting "+1 (204) 234-2222" recognizes the +1 code and the 204 area code
    // (Canada), so the country switches to CA and the national number is
    // formatted without the leading "1" being treated as a national digit.
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '+1 (204) 234-2222' } });

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
    expect(screen.getByTestId('phone-national')).toHaveValue('(204) 234-2222');
    expect(onChange).toHaveBeenLastCalledWith('+12042342222');
    expect(onCountryChange).toHaveBeenCalledWith('CA');
  });

  it('does not treat a fitting national paste as international', () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // A plain US-formatted number (no "+") stays on the US selection.
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '(204) 234-2222' } });

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
    expect(screen.getByTestId('phone-national')).toHaveValue('(204) 234-2222');
    expect(onChange).toHaveBeenLastCalledWith('+12042342222');
    expect(onCountryChange).not.toHaveBeenCalled();
  });

  it('routes a full number pasted into the calling-code field to the national field', () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // Pasting into the small "+1" field switches country to Canada (area 204),
    // fills the national field, and resets the calling-code field to "+1".
    fireEvent.change(screen.getByTestId('phone-calling-code'), { target: { value: '+1 (204) 234-2222' } });

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
    expect(screen.getByTestId('phone-national')).toHaveValue('(204) 234-2222');
    expect(onChange).toHaveBeenLastCalledWith('+12042342222');
    expect(onCountryChange).toHaveBeenCalledWith('CA');
  });

  it('routes a +44 paste into the calling-code field and switches to GB', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    fireEvent.change(screen.getByTestId('phone-calling-code'), { target: { value: '+44 7700 900123' } });

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+44');
    expect(screen.getByTestId('phone-national')).toHaveValue('7700 900123');
    expect(onChange).toHaveBeenLastCalledWith('+447700900123');
  });
});
