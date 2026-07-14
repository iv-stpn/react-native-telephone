import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Harness } from './support/harness';

describe('PhoneInput — focus/blur', () => {
  it('fires onFocus once when the field gains focus', () => {
    const onFocus = vi.fn();
    render(<Harness defaultCountry="US" onFocus={onFocus} />);
    // US's "+1" is complete, so focusing the national input is a true entry.
    fireEvent.focus(screen.getByTestId('phone-national'));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('fires onBlur once focus leaves the field', async () => {
    const onBlur = vi.fn();
    render(<Harness defaultCountry="US" onBlur={onBlur} />);
    const national = screen.getByTestId('phone-national');
    fireEvent.focus(national);
    fireEvent.blur(national);
    // onBlur is deferred a tick so a sibling focus can cancel it; nothing
    // refocused here, so it runs.
    await waitFor(() => expect(onBlur).toHaveBeenCalledTimes(1));
  });

  it('does not fire onBlur on the internal calling-code↔national hop', async () => {
    const onBlur = vi.fn();
    const onFocus = vi.fn();
    render(<Harness defaultCountry="US" onFocus={onFocus} onBlur={onBlur} />);
    const national = screen.getByTestId('phone-national');
    const callingCode = screen.getByTestId('phone-calling-code');

    fireEvent.focus(national);
    // Focus hops to the sibling input in the same frame: the blur is scheduled,
    // then the sibling focus cancels it before it can run.
    fireEvent.blur(national);
    fireEvent.focus(callingCode);

    // Give the deferred blur a chance to (not) fire.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onBlur).not.toHaveBeenCalled();
    // onFocus fired once on entry, not again on the internal hop.
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('does not fire onFocus/onBlur when the field is not editable', () => {
    const onFocus = vi.fn();
    render(<Harness defaultCountry="US" editable={false} onFocus={onFocus} />);
    fireEvent.focus(screen.getByTestId('phone-national'));
    expect(onFocus).not.toHaveBeenCalled();
  });

  it('forwards onSubmitEditing to the national input', () => {
    const onSubmitEditing = vi.fn();
    render(<Harness defaultCountry="US" onSubmitEditing={onSubmitEditing} />);
    const national = screen.getByTestId('phone-national');
    // react-native-web maps a plain Enter keypress to onSubmitEditing.
    fireEvent.keyDown(national, { key: 'Enter' });
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });

  it('forwards returnKeyType to the national input', () => {
    render(<Harness defaultCountry="US" returnKeyType="done" />);
    // react-native-web maps returnKeyType onto the DOM enterkeyhint attribute.
    expect(screen.getByTestId('phone-national')).toHaveAttribute('enterkeyhint', 'done');
  });
});
