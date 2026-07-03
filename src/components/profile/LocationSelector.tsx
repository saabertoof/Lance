import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { locationCatalog, type LocationOption } from '@/constants/catalogs';
import {
  countryFlag,
  countryOptionForCode,
  countryOptions,
  countrySearchText,
  normalizeCountryCode,
  type CountryOption,
} from '@/constants/countries';
import { theme } from '@/constants/theme';
import {
  getLocationCatalogId,
  getLocationCountryCode,
  locationOptionFromParts,
} from '@/lib/location';

type LocationInputProps = {
  defaultCountryCode?: string;
  helperText?: string;
  label?: string;
  legacyValue?: string;
  onChange: (location: LocationOption | null) => void;
  placeholderCity?: string;
  value: LocationOption | null;
};

export function LocationInput({
  defaultCountryCode = 'US',
  helperText = 'City-level only. No exact address or GPS.',
  label = 'Location',
  legacyValue,
  onChange,
  placeholderCity = 'Chicago',
  value,
}: LocationInputProps) {
  const [city, setCity] = useState(value?.city ?? '');
  const [countryCode, setCountryCode] = useState(
    getLocationCountryCode(value) || normalizeCountryCode(defaultCountryCode),
  );
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState(value?.region ?? '');

  useEffect(() => {
    setCity(value?.city ?? '');
    setRegion(value?.region ?? '');
    setCountryCode(getLocationCountryCode(value) || normalizeCountryCode(defaultCountryCode));
  }, [defaultCountryCode, value]);

  const selectedCountry = countryOptionForCode(countryCode);
  const hasLocationInput = Boolean(value || city.trim() || region.trim());
  const selectedPreview = hasLocationInput
    ? locationOptionFromParts({
        catalogId: getLocationCatalogId(value),
        city,
        countryCode,
        region,
      })
    : null;

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return locationCatalog.slice(0, 10);
    }

    return locationCatalog
      .filter((option) => option.search.includes(normalized))
      .slice(0, 12);
  }, [query]);

  const countries = useMemo(() => {
    const normalized = countryQuery.trim().toLowerCase();

    if (!normalized) {
      return countryOptions;
    }

    return countryOptions.filter((country) =>
      countrySearchText(country).includes(normalized),
    );
  }, [countryQuery]);

  function update(next: {
    city?: string;
    countryCode?: string;
    region?: string;
  }) {
    const nextCity = next.city ?? city;
    const nextRegion = next.region ?? region;
    const nextCountryCode =
      normalizeCountryCode(next.countryCode) || countryCode || normalizeCountryCode(defaultCountryCode);

    setCity(nextCity);
    setRegion(nextRegion);
    setCountryCode(nextCountryCode);

    onChange(locationOptionFromParts({
      city: nextCity,
      countryCode: nextCountryCode,
      region: nextRegion,
    }));
  }

  function selectSuggestion(location: LocationOption) {
    setCity(location.city ?? '');
    setRegion(location.region ?? '');
    setCountryCode(location.countryCode);
    setQuery('');
    onChange(location);
  }

  function selectCountry(country: CountryOption) {
    setCountryCode(country.code);
    setCountryOpen(false);
    setCountryQuery('');
    onChange(locationOptionFromParts({
      city,
      countryCode: country.code,
      region,
    }));
  }

  function clear() {
    setCity('');
    setRegion('');
    setCountryCode(normalizeCountryCode(defaultCountryCode));
    setQuery('');
    onChange(null);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>

      {legacyValue && !value ? (
        <View style={styles.legacy}>
          <Ionicons color={theme.colors.muted} name="information-circle-outline" size={18} />
          <Text style={styles.legacyText}>
            Current saved location: {legacyValue}. Choose a city and country to clean it up.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.twoColumns}>
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={(nextCity) => update({ city: nextCity })}
              placeholder={placeholderCity}
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
              value={city}
            />
          </View>
          <View style={styles.regionGroup}>
            <Text style={styles.fieldLabel}>Region</Text>
            <TextInput
              autoCapitalize="characters"
              maxLength={32}
              onChangeText={(nextRegion) => update({ region: nextRegion })}
              placeholder="IL"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.input}
              value={region}
            />
          </View>
        </View>

        <Pressable
          accessibilityLabel="Choose country"
          accessibilityRole="button"
          onPress={() => setCountryOpen(true)}
          style={({ pressed }) => [styles.countryButton, pressed && styles.pressed]}>
          <Text style={styles.countryFlag}>{countryFlag(countryCode)}</Text>
          <View style={styles.countryCopy}>
            <Text style={styles.fieldLabel}>Country</Text>
            <Text numberOfLines={1} style={styles.countryText}>
              {selectedCountry?.name ?? 'Choose country'}
            </Text>
          </View>
          <Ionicons color={theme.colors.muted} name="chevron-down" size={18} />
        </Pressable>

        {selectedPreview ? (
          <View style={styles.preview}>
            <Ionicons color={theme.colors.accentStrong} name="location-outline" size={18} />
            <Text numberOfLines={1} style={styles.previewText}>{selectedPreview.label}</Text>
            <Pressable accessibilityLabel="Remove location" onPress={clear} style={styles.clear}>
              <Ionicons color={theme.colors.muted} name="close" size={18} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.search}>
        <Ionicons color={theme.colors.muted} name="search-outline" size={18} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Quick search city, state, or country"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.searchInput}
          value={query}
        />
      </View>

      {query ? (
        <View style={styles.results}>
          {suggestions.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() => selectSuggestion(option)}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
              <Ionicons color={theme.colors.muted} name="location-outline" size={17} />
              <Text numberOfLines={1} style={styles.resultText}>{option.label}</Text>
            </Pressable>
          ))}
          {suggestions.length === 0 ? (
            <Text style={styles.empty}>
              No exact match. Type the city above and choose a country.
            </Text>
          ) : null}
        </View>
      ) : null}

      <CountryModal
        countries={countries}
        onClose={() => setCountryOpen(false)}
        onQueryChange={setCountryQuery}
        onSelect={selectCountry}
        query={countryQuery}
        selectedCode={countryCode}
        visible={countryOpen}
      />
    </View>
  );
}

export function LocationSelector(props: LocationInputProps) {
  return <LocationInput {...props} />;
}

function CountryModal({
  countries,
  onClose,
  onQueryChange,
  onSelect,
  query,
  selectedCode,
  visible,
}: {
  countries: CountryOption[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (country: CountryOption) => void;
  query: string;
  selectedCode: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Country</Text>
            <Text style={styles.modalSubtitle}>Search by name, code, or common shorthand.</Text>
          </View>
          <Pressable accessibilityLabel="Close country picker" onPress={onClose} style={styles.closeButton}>
            <Ionicons color={theme.colors.text} name="close" size={22} />
          </Pressable>
        </View>
        <View style={styles.modalSearch}>
          <Ionicons color={theme.colors.muted} name="search-outline" size={18} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onQueryChange}
            placeholder="United States, US, Canada, UK..."
            placeholderTextColor={theme.colors.mutedLight}
            style={styles.searchInput}
            value={query}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.countryList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {countries.map((country) => {
            const selected = country.code === selectedCode;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={country.code}
                onPress={() => onSelect(country)}
                style={({ pressed }) => [
                  styles.countryRow,
                  selected && styles.countryRowSelected,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.countryFlag}>{countryFlag(country.code)}</Text>
                <View style={styles.countryCopy}>
                  <Text style={styles.countryText}>{country.name}</Text>
                  <Text style={styles.countryCode}>{country.code}</Text>
                </View>
                {selected ? (
                  <Ionicons color={theme.colors.accentStrong} name="checkmark" size={20} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.sm },
  labelRow: { gap: 2 },
  label: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  helper: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 17 },
  legacy: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  legacyText: { color: theme.colors.muted, flex: 1, fontSize: theme.typography.tiny, lineHeight: 18 },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  twoColumns: { flexDirection: 'row', gap: theme.spacing.sm },
  inputGroup: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
  regionGroup: { gap: theme.spacing.xs, width: 92 },
  fieldLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.sm,
    color: theme.colors.text,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.small,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  countryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  countryFlag: { fontSize: 20, width: 28 },
  countryCopy: { flex: 1, gap: 2, minWidth: 0 },
  countryText: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  countryCode: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoMedium,
    fontSize: theme.typography.caption,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 40,
    paddingLeft: theme.spacing.md,
  },
  previewText: {
    color: theme.colors.accentStrong,
    flex: 1,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familySemiBold,
  },
  clear: {
    alignItems: 'center',
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  search: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.small,
  },
  results: { borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, overflow: 'hidden' },
  result: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 42,
    paddingHorizontal: theme.spacing.md,
  },
  resultText: { color: theme.colors.textSoft, flex: 1, fontSize: theme.typography.small },
  empty: { color: theme.colors.muted, fontSize: theme.typography.small, padding: theme.spacing.md },
  modalSafe: { backgroundColor: theme.colors.background, flex: 1 },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.lg,
  },
  modalTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.heading,
    letterSpacing: -0.3,
  },
  modalSubtitle: { color: theme.colors.muted, fontSize: theme.typography.small, marginTop: 2 },
  closeButton: {
    alignItems: 'center',
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  modalSearch: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginHorizontal: theme.layout.screenPadding,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  countryList: {
    gap: theme.spacing.sm,
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  countryRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
  countryRowSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  pressed: { opacity: 0.72 },
});
