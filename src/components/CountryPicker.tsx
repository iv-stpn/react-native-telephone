import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { CountryCode } from "../data/countries";
import { countryCodeToEmoji } from "../utils/flags";
import { defaultStyles, noOutline } from "./styles";
import type { RenderCountryPickerProps } from "./types";

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
  const { visible, onClose, options, selectedCountry, onSelect, renderFlag, title, searchPlaceholder, noResultsLabel, styles } =
    props;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.searchableLabel.includes(q));
  }, [options, query]);

  function close() {
    setQuery("");
    onClose();
  }

  function pick(code: CountryCode) {
    onSelect(code);
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {/* Tap the backdrop to dismiss; taps inside the panel are swallowed below. */}
      <Pressable style={[defaultStyles.overlay, styles?.overlay]} onPress={close}>
        <Pressable style={[defaultStyles.panel, styles?.panel]} onPress={() => {}}>
          <View style={[defaultStyles.header, styles?.header]}>
            <Text style={[defaultStyles.title, styles?.title]}>{title}</Text>
            <Pressable
              testID="rnt-country-close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={[defaultStyles.closeButton, styles?.closeButton]}
            >
              <Text style={[defaultStyles.closeButtonText, styles?.closeButtonText]}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            testID="rnt-country-search"
            style={[defaultStyles.search, noOutline, styles?.search]}
            placeholder={searchPlaceholder}
            placeholderTextColor={defaultStyles.hint.color}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />

          <ScrollView style={[defaultStyles.list, styles?.list]} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <Text style={[defaultStyles.empty, styles?.empty]}>{noResultsLabel}</Text>
            ) : (
              filtered.map((option) => {
                const { code } = option.config;
                const isSelected = code === selectedCountry;
                return (
                  <Pressable
                    key={code}
                    testID={`rnt-country-option-${code}`}
                    role="option"
                    aria-selected={isSelected}
                    onPress={() => pick(code)}
                    style={[defaultStyles.option, isSelected && defaultStyles.optionSelected, styles?.option]}
                  >
                    <View style={styles?.optionFlag}>{renderFlag({ code, emoji: countryCodeToEmoji(code), size: 24 })}</View>
                    <Text numberOfLines={1} style={[defaultStyles.optionName, styles?.optionName]}>
                      {option.name}
                    </Text>
                    <Text style={[defaultStyles.optionCallingCode, styles?.optionCallingCode]}>{option.config.callingCode}</Text>
                    {isSelected ? <Text style={[defaultStyles.optionCheck, styles?.optionCheck]}>✓</Text> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
