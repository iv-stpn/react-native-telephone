import type { CountryCode } from 'country-data-ts/countries';
import { describe, expect, it } from 'vitest';
import { buildCountryOptions, getRegionLabel, normalizeForSearch } from '../utils/options';

const COMBINING_MARKS = /[̀-ͯ]/; // Unicode combining diacritical marks.

describe('normalizeForSearch', () => {
  it("lowercases and strips diacritics so accents don't block matches", () => {
    expect(normalizeForSearch("Côte d'Ivoire")).toBe("cote d'ivoire");
    expect(normalizeForSearch('Réunion')).toBe('reunion');
    expect(normalizeForSearch('SÃO TOMÉ')).toBe('sao tome');
  });

  it('leaves plain ASCII untouched apart from case', () => {
    expect(normalizeForSearch('United States')).toBe('united states');
    expect(normalizeForSearch('+44')).toBe('+44');
  });
});

describe('buildCountryOptions', () => {
  it('builds one option per country, sorted by localized name', () => {
    const options = buildCountryOptions('en-US');
    expect(options.length).toBe(250);

    const names = options.map((o) => o.name);
    const sorted = [...names].sort((a, b) => new Intl.Collator('en-US').compare(a, b));
    expect(names).toEqual(sorted);
  });

  it('restricts and orders the options by allowedCountries', () => {
    const allowed: CountryCode[] = ['FR', 'US', 'DE'];
    const options = buildCountryOptions('en-US', allowed);
    expect(options.map((o) => o.config.code)).toEqual(allowed);
  });

  it('folds diacritics into searchableLabel so an unaccented query matches', () => {
    const reunion = buildCountryOptions('fr', ['RE'])[0];
    if (!reunion) throw new Error('Réunion option not found');
    // "Réunion" in an fr locale — the label must be searchable as "reunion".
    expect(reunion.searchableLabel).toContain(normalizeForSearch('reunion'));
    expect(reunion.searchableLabel).not.toMatch(COMBINING_MARKS); // no combining marks
  });

  it('includes the code and calling code in searchableLabel', () => {
    const us = buildCountryOptions('en-US', ['US'])[0];
    if (!us) throw new Error('US option not found');
    expect(us.searchableLabel).toContain('us');
    expect(us.searchableLabel).toContain('+1');
  });
});

describe('getRegionLabel', () => {
  it('localizes a region name when Intl.DisplayNames is available', () => {
    // Node ships Intl.DisplayNames; "DE" in an fr locale is "Allemagne".
    expect(getRegionLabel('fr', 'DE', 'Germany')).toBe('Allemagne');
  });

  it('falls back to the provided name when Intl.DisplayNames throws on a bad locale', () => {
    // A malformed locale makes the Intl.DisplayNames constructor throw a
    // RangeError; getRegionLabel must swallow it and return the fallback.
    expect(getRegionLabel('!!bad', 'DE', 'Germany')).toBe('Germany');
  });
});
