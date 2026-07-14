import type { CountryCode } from 'country-data-ts/countries';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { RenderFlag } from '../utils/flags';
import { type CountryOption, normalizeForSearch } from '../utils/options';
import { defaultStyles, noOutline } from './styles';
import type { PhoneInputStyles, RenderCountryPickerProps } from './types';

const CLOSE_GLYPH = '\u2715';
const CHECK_GLYPH = '\u2713';

type CountryOptionRowProps = {
  option: CountryOption;
  isSelected: boolean;
  onPick: (code: CountryCode) => void;
  renderFlag: RenderFlag;
  styles?: Partial<PhoneInputStyles>;
};

// One picker row. `onPress` is bound per-row via useCallback (a stable
// reference) so it satisfies noJsxPropsBind. NOTE: not wrapped in React.memo —
// doing so currently panics Biome's module-graph resolver (index-out-of-bounds
// bug) on this file; the per-row callback is the part the lint rule needs.
function CountryOptionRow({ option, isSelected, onPick, renderFlag, styles }: CountryOptionRowProps) {
  const { code } = option.config;
  const handlePress = useCallback(() => onPick(code), [onPick, code]);

  return (
    <Pressable
      testID={`rnt-country-option-${code}`}
      role="option"
      aria-selected={isSelected}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={handlePress}
      style={[defaultStyles.option, isSelected && defaultStyles.optionSelected, styles?.option]}
    >
      <View style={styles?.optionFlag}>{renderFlag({ code, size: 24 })}</View>
      <Text numberOfLines={1} style={[defaultStyles.optionName, styles?.optionName]}>
        {option.name}
      </Text>
      <Text style={[defaultStyles.optionCallingCode, styles?.optionCallingCode]}>
        {option.config.callingCode}
        {option.areaCodeDisplay ? ` ${option.areaCodeDisplay}` : ''}
      </Text>
      {isSelected ? <Text style={[defaultStyles.optionCheck, styles?.optionCheck]}>{CHECK_GLYPH}</Text> : null}
    </Pressable>
  );
}

// Dependency-free country picker: a Modal overlay with a search box and a
// scrollable, searchable option list. Mirrors the shape of the address-tax
// Select so it stays familiar, but is specialized for phone country options
// (flag + localized name + calling code). Rendered by PhoneInput unless the
// consumer passes their own `renderCountryPicker`.
//
// A ScrollView (not FlatList) renders every option up-front so tests and screen
// readers see the full list. Each option carries role="option"/aria-selected and
// a stable testID so Testing Library resolves them predictably.
export function CountryPicker(props: RenderCountryPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return props.options;
    return props.options.filter((option) => option.searchableLabel.includes(q));
  }, [props.options, query]);

  const close = useCallback(() => {
    setQuery('');
    props.onClose();
  }, [props.onClose]);

  const pick = useCallback(
    (code: CountryCode) => {
      props.onSelect(code);
      close();
    },
    [props.onSelect, close],
  );

  return (
    <Modal visible={props.visible} transparent={true} animationType="fade" onRequestClose={close}>
      {/* Tap the backdrop to dismiss; taps inside the panel are swallowed below. */}
      <Pressable style={[defaultStyles.overlay, props.styles?.overlay]} onPress={close}>
        <Pressable style={[defaultStyles.panel, props.styles?.panel]}>
          <View style={[defaultStyles.header, props.styles?.header]}>
            <Text style={[defaultStyles.title, props.styles?.title]}>{props.title}</Text>
            <Pressable
              testID="rnt-country-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={[defaultStyles.closeButton, props.styles?.closeButton]}
            >
              <Text style={[defaultStyles.closeButtonText, props.styles?.closeButtonText]}>{CLOSE_GLYPH}</Text>
            </Pressable>
          </View>

          <TextInput
            testID="rnt-country-search"
            accessibilityLabel={props.searchPlaceholder}
            style={[defaultStyles.search, noOutline, props.styles?.search]}
            placeholder={props.searchPlaceholder}
            placeholderTextColor={defaultStyles.hint.color}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={true}
          />

          <ScrollView
            style={[defaultStyles.list, props.styles?.list]}
            accessibilityRole="list"
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <Text style={[defaultStyles.empty, props.styles?.empty]}>{props.noResultsLabel}</Text>
            ) : (
              filtered.map((option) => (
                <CountryOptionRow
                  key={option.config.code}
                  option={option}
                  isSelected={option.config.code === props.selectedCountry}
                  onPick={pick}
                  renderFlag={props.renderFlag}
                  styles={props.styles}
                />
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
