import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from '../components/PhoneInput';
import { Harness } from './support/harness';

describe('PhoneInput — masking & E.164', () => {
  it('seeds the calling code from the default country', () => {
    render(<Harness defaultCountry="US" />);
    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+1');
  });

  it('formats typed digits with the country mask and emits E.164', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '2025550123' } });

    // Display is masked, stored value is E.164 (no separators, with calling code).
    expect(screen.getByTestId('phone-national')).toHaveValue('(202) 555-0123');
    expect(onChange).toHaveBeenLastCalledWith('+12025550123');
  });

  it('re-masks the existing number when the country changes', () => {
    render(<Harness defaultCountry="US" />);
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '612345678' } });

    // Open the picker and pick France; the digits reflow under the FR mask.
    fireEvent.click(screen.getByLabelText('Choose country'));
    fireEvent.click(screen.getByTestId('rnt-country-option-FR'));

    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+33');
    expect(screen.getByTestId('phone-national')).toHaveValue('6 12 34 56 78');
  });

  it('hydrates from a controlled E.164 value', () => {
    render(<PhoneInput testID="phone" locale="en-US" value="+33612345678" onChangeText={vi.fn()} />);
    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+33');
    expect(screen.getByTestId('phone-national')).toHaveValue('6 12 34 56 78');
  });

  it('reveals a typed separator before the next digit arrives', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    // Typing up through ")" — the closing paren shows immediately instead of
    // being swallowed until the next digit "earns" it.
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '(204)' } });
    expect(screen.getByTestId('phone-national')).toHaveValue('(204)');
    expect(onChange).toHaveBeenLastCalledWith('+1204');
  });

  it('keeps digits aligned when a separator is typed mid-group', () => {
    render(<Harness defaultCountry="US" />);
    // A "-" inside the area code is dropped; the "4" still completes it.
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '20-4' } });
    expect(screen.getByTestId('phone-national')).toHaveValue('(204');
  });

  it("falls back to the locale's country when defaultCountry is absent", () => {
    // No defaultCountry; locale fr-FR should seed France.
    function FrHarness() {
      const [value, setValue] = useState('');
      return <PhoneInput testID="phone" locale="fr-FR" value={value} onChangeText={setValue} />;
    }
    render(<FrHarness />);
    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+33');
  });
});
