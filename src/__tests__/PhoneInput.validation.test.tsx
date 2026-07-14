import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Harness } from './support/harness';

describe('PhoneInput — validation', () => {
  it('shows the validation error once an invalid number fills the mask', () => {
    render(<Harness defaultCountry="US" />);
    // 10 digits fills the US mask, but 000... fails the national regex.
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '0000000000' } });
    expect(screen.getByTestId('phone-error')).toHaveTextContent('Invalid phone number');
  });

  it('fires onValidationChange with validity on each edit and on blur', () => {
    const onValidationChange = vi.fn();
    render(<Harness onValidationChange={onValidationChange} defaultCountry="US" />);

    const national = screen.getByTestId('phone-national');
    fireEvent.change(national, { target: { value: '2025550123' } }); // valid
    expect(onValidationChange).toHaveBeenLastCalledWith(true);

    fireEvent.change(national, { target: { value: '0000000000' } }); // invalid (fills mask)
    expect(onValidationChange).toHaveBeenLastCalledWith(false);

    fireEvent.blur(national);
    expect(onValidationChange).toHaveBeenLastCalledWith(false);
  });

  it('does not show the built-in error before blur when validationMode is onBlur', () => {
    render(<Harness validationMode="onBlur" defaultCountry="US" />);
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '0000000000' } });
    // Mask is full and invalid, but onBlur keeps the error hidden until blur.
    expect(screen.queryByTestId('phone-error')).not.toBeInTheDocument();
    fireEvent.blur(screen.getByTestId('phone-national'));
    expect(screen.getByTestId('phone-error')).toHaveTextContent('Invalid phone number');
  });

  it('never shows the built-in error when validationMode is never', () => {
    render(<Harness validationMode="never" defaultCountry="US" />);
    fireEvent.change(screen.getByTestId('phone-national'), { target: { value: '0000000000' } });
    fireEvent.blur(screen.getByTestId('phone-national'));
    expect(screen.queryByTestId('phone-error')).not.toBeInTheDocument();
  });
});
