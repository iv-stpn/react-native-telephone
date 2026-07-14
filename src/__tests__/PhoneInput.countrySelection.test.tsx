import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Harness } from './support/harness';

describe('PhoneInput — country selection', () => {
  it('seeds the national field with the area code when a one-area-code country is selected', () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // Type a full US number, then switch to Guernsey (+44, single area 1481).
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '2025550123' } });
    expect(screen.getByTestId('phone-national')).toHaveValue('(202) 555-0123');

    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-GG'));

    // The typed number is reset to the area code, which is seeded into the
    // national field; E.164 carries the calling code + area code.
    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+44');
    expect(screen.getByTestId('phone-national')).toHaveValue('1481');
    expect(onChange).toHaveBeenLastCalledWith('+441481');
    expect(onCountryChange).toHaveBeenCalledWith('GG');
  });

  it('seeds a NANP national field with the parenthesized area code', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    // Pick the Bahamas (+1, single area 242): the national field is seeded with
    // "(242)" — parentheses included — and E.164 is "+1 242".
    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-BS'));

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
    expect(screen.getByTestId('phone-national')).toHaveValue('(242)');
    expect(onChange).toHaveBeenLastCalledWith('+1242');
  });

  it('keeps the typed digits when a multi-area-code shared country is selected', () => {
    // Canada shares +1 with the US but is pinned by many area codes, so picking
    // it must NOT reset the national field — the digits reflow unchanged.
    render(<Harness defaultCountry="US" />);
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '2042342222' } });

    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-CA'));

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
    expect(screen.getByTestId('phone-national')).toHaveValue('(204) 234-2222');
  });

  it('resets the national field when a same-code country with a foreign area code is selected', () => {
    // From the US, pick American Samoa (+1, single area 684): the field seeds
    // "(684)". Switching to Canada (same +1 code, no singular area code) must
    // drop the 684 — it belongs to American Samoa, not Canada — leaving just +1.
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-AS'));
    expect(screen.getByTestId('phone-national')).toHaveValue('(684)');

    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-CA'));

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
    expect(screen.getByTestId('phone-national')).toHaveValue('');
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(onCountryChange).toHaveBeenCalledWith('CA');
  });

  it('keeps the national digits when switching to a different calling code', () => {
    // From the same "+1 (684)" state, switching to Andorra (+376, unshared) is a
    // different calling code, so the 684 carries over as national digits.
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-AS'));
    expect(screen.getByTestId('phone-national')).toHaveValue('(684)');

    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-AD'));

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+376');
    expect(screen.getByTestId('phone-national')).toHaveValue('684');
    expect(onChange).toHaveBeenLastCalledWith('+376684');
  });
});
