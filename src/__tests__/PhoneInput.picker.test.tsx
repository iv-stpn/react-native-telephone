import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from '../components/PhoneInput';
import { Harness } from './support/harness';

describe('PhoneInput — country picker', () => {
  it('shows the unique area code beside the calling code in the picker', () => {
    render(<Harness defaultCountry="GB" />);
    fireEvent.click(screen.getByLabelText('Choose country'));
    // Guernsey shares +44 with GB but is pinned by the single area code 1481, so
    // the picker lists it as "+44 1481". The default (GB) shows no suffix.
    expect(screen.getByTestId('rnt-country-option-GG')).toHaveTextContent('+44 1481');
    const gb = screen.getByTestId('rnt-country-option-GB');
    expect(gb).toHaveTextContent('+44');
    expect(gb).not.toHaveTextContent('1481');
  });

  it('wraps a NANP area code in parentheses in the picker', () => {
    render(<Harness defaultCountry="US" />);
    fireEvent.click(screen.getByLabelText('Choose country'));
    // Bahamas shares +1 with the US; its single area code 242 is shown as
    // "(242)" beside the calling code, matching the NANP mask grouping.
    expect(screen.getByTestId('rnt-country-option-BS')).toHaveTextContent('+1 (242)');
  });

  it('filters the picker list by search query', () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText('Choose country'));

    fireEvent.change(screen.getByTestId('rnt-country-search'), { target: { value: 'germany' } });

    expect(screen.getByTestId('rnt-country-option-DE')).toBeInTheDocument();
    expect(screen.queryByTestId('rnt-country-option-US')).not.toBeInTheDocument();
  });

  it('restricts the catalog to allowedCountries', () => {
    render(<PhoneInput testID="phone" locale="en-US" value="" allowedCountries={['FR', 'DE']} onChangeText={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Choose country'));

    expect(screen.getByTestId('rnt-country-option-FR')).toBeInTheDocument();
    expect(screen.queryByTestId('rnt-country-option-US')).not.toBeInTheDocument();
  });

  it('restricts the picker to allowedCountries and preserves their order', () => {
    render(<Harness allowedCountries={['DE', 'FR', 'US']} />);
    fireEvent.click(screen.getByLabelText('Choose country'));
    const options = screen.getAllByRole('option');
    // allowedCountries is authoritative order — the picker keeps it as given
    // (so a consumer can float likely countries to the top) rather than
    // alphabetizing.
    expect(options.map((o) => o.getAttribute('data-testid'))).toEqual([
      'rnt-country-option-DE',
      'rnt-country-option-FR',
      'rnt-country-option-US',
    ]);
  });
});
