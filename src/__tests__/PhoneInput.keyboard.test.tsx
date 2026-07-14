import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Harness } from './support/harness';

describe('PhoneInput — keyboard', () => {
  it('steps back into the calling code on backspace in an empty national field', () => {
    render(<Harness defaultCountry="CA" />);
    // Canada's calling code is +1; backspace on an empty national field should
    // delete the last code digit rather than be a no-op.
    const national = screen.getByTestId('phone-national');
    fireEvent.keyDown(national, { key: 'Backspace' });
    expect(screen.getByTestId('phone-calling-code')).toHaveValue('+');
  });

  it('selects the calling code on select-all in an empty national field', () => {
    render(<Harness defaultCountry="US" />);
    const national = screen.getByTestId('phone-national');
    national.focus();
    // Ctrl+A with nothing typed retargets the calling-code field so the user
    // can replace the code, instead of selecting an empty national field.
    fireEvent.keyDown(national, { key: 'a', ctrlKey: true });
    expect(screen.getByTestId('phone-calling-code')).toHaveFocus();
  });

  it('keeps select-all on the national field when a number is typed', () => {
    render(<Harness defaultCountry="US" />);
    const national = screen.getByTestId('phone-national');
    fireEvent.change(national, { target: { value: '2025550123' } });
    national.focus();
    // With a number present, select-all selects the typed number — focus must
    // not jump to the calling-code field.
    fireEvent.keyDown(national, { key: 'a', ctrlKey: true });
    expect(national).toHaveFocus();
  });
});
