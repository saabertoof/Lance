import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { locationCatalog, type LocationOption } from '@/constants/catalogs';
import { theme } from '@/constants/theme';

export function LocationSelector({
  legacyValue,
  onChange,
  value,
}: {
  legacyValue?: string;
  onChange: (location: LocationOption | null) => void;
  value: LocationOption | null;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (normalized
      ? locationCatalog.filter((option) => option.search.includes(normalized))
      : locationCatalog
    ).slice(0, 14);
  }, [query]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Location</Text>
      {legacyValue && !value ? (
        <View style={styles.legacy}>
          <Ionicons color={theme.colors.muted} name="information-circle-outline" size={19} />
          <Text style={styles.legacyText}>
            Current location: {legacyValue}. Select a structured location to update it.
          </Text>
        </View>
      ) : null}
      {value ? (
        <View style={styles.selected}>
          <Ionicons color={theme.colors.accentStrong} name="location-outline" size={20} />
          <Text numberOfLines={2} style={styles.selectedText}>{value.label}</Text>
          <Pressable accessibilityLabel="Remove location" onPress={() => onChange(null)}>
            <Ionicons color={theme.colors.muted} name="close" size={20} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.search}>
        <Ionicons color={theme.colors.muted} name="search-outline" size={19} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search city, state, or country"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
          value={query}
        />
      </View>
      <View style={styles.results}>
        {results.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.id}
            onPress={() => {
              onChange(option);
              setQuery('');
            }}
            style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
            <Ionicons color={theme.colors.muted} name="location-outline" size={18} />
            <Text numberOfLines={2} style={styles.resultText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      {query && results.length === 0 ? (
        <Text style={styles.empty}>
          No exact match. Try a state, region, or country instead.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.sm },
  label: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  legacy: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  legacyText: { color: theme.colors.muted, flex: 1, fontSize: theme.typography.tiny, lineHeight: 18 },
  selected: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  selectedText: { color: theme.colors.accentStrong, flex: 1, fontSize: theme.typography.small, fontWeight: '800' },
  search: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  input: { color: theme.colors.text, flex: 1, fontSize: theme.typography.body },
  results: { borderColor: theme.colors.border, borderRadius: theme.radii.md, borderWidth: 1, overflow: 'hidden' },
  result: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
  },
  resultText: { color: theme.colors.textSoft, flex: 1, fontSize: theme.typography.small },
  empty: { color: theme.colors.muted, fontSize: theme.typography.small },
  pressed: { backgroundColor: theme.colors.surfaceMuted },
});
