import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CatalogOption } from '@/constants/catalogs';
import { normalizeCatalogValue } from '@/constants/catalogs';
import { theme } from '@/constants/theme';
import { searchCatalogValues } from '@/lib/catalogs';

type CatalogSelectorProps = {
  allowCustom?: boolean;
  catalog: CatalogOption[];
  catalogType?: 'skills' | 'industries';
  label: string;
  max?: number;
  onChange: (values: string[]) => void;
  placeholder: string;
  values: string[];
};

export function CatalogSelector({
  allowCustom = true,
  catalog,
  catalogType,
  label,
  max = 20,
  onChange,
  placeholder,
  values,
}: CatalogSelectorProps) {
  const [query, setQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<CatalogOption[]>([]);
  const normalizedQuery = normalizeCatalogValue(query);
  useEffect(() => {
    if (!catalogType || normalizedQuery.length < 2) {
      setRemoteOptions([]);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      searchCatalogValues(catalogType, query)
        .then((options) => active && setRemoteOptions(options))
        .catch(() => active && setRemoteOptions([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [catalogType, normalizedQuery, query]);
  const matches = useMemo(() => {
    const selected = values.map((value) => ({
      label: value,
      category: 'Selected',
    }));
    const candidates = normalizedQuery
      ? catalog.filter((option) =>
          normalizeCatalogValue(option.label).includes(normalizedQuery),
        )
      : catalog.slice(0, 24);
    return uniqueOptions([...selected, ...candidates, ...remoteOptions]).slice(0, 36);
  }, [catalog, normalizedQuery, remoteOptions, values]);
  const exactMatch = [...values, ...catalog.map((option) => option.label)].some(
    (value) => normalizeCatalogValue(value) === normalizedQuery,
  );

  function toggle(value: string) {
    const normalized = normalizeCatalogValue(value);
    const selected = values.find(
      (item) => normalizeCatalogValue(item) === normalized,
    );
    if (selected) {
      onChange(values.filter((item) => item !== selected));
    } else if (values.length < max) {
      onChange([...values, value.trim().replace(/\s+/g, ' ')]);
    }
  }

  function addCustom() {
    const clean = query.trim().replace(/\s+/g, ' ');
    if (!clean || exactMatch || values.length >= max) return;
    onChange([...values, clean]);
    setQuery('');
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{values.length}/{max}</Text>
      </View>
      <View style={styles.search}>
        <Ionicons color={theme.colors.muted} name="search-outline" size={19} />
        <TextInput
          autoCapitalize="words"
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            style={styles.clear}>
            <Ionicons color={theme.colors.muted} name="close-circle" size={20} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.options}>
        {matches.map((option) => {
          const selected = values.some(
            (value) =>
              normalizeCatalogValue(value) === normalizeCatalogValue(option.label),
          );
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={normalizeCatalogValue(option.label)}
              onPress={() => toggle(option.label)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {allowCustom && normalizedQuery && !exactMatch ? (
        <Pressable
          accessibilityRole="button"
          disabled={values.length >= max}
          onPress={addCustom}
          style={({ pressed }) => [
            styles.addCustom,
            values.length >= max && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Ionicons color={theme.colors.accentStrong} name="add-circle-outline" size={20} />
          <Text numberOfLines={2} style={styles.addCustomText}>
            Add &quot;{query.trim()}&quot;
          </Text>
        </Pressable>
      ) : null}
      {!normalizedQuery ? (
        <Text style={styles.hint}>Common curated choices are shown first. Search to find more.</Text>
      ) : null}
    </View>
  );
}

function uniqueOptions(options: CatalogOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = normalizeCatalogValue(option.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  count: {
    color: theme.colors.muted,
    fontFamily: theme.typography.familyMonoMedium,
    fontSize: theme.typography.tiny,
  },
  search: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.small,
  },
  clear: {
    alignItems: 'center',
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  option: {
    backgroundColor: theme.colors.chip,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
  },
  optionSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(139,92,246,0.65)',
  },
  optionText: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.label,
  },
  optionTextSelected: { color: theme.colors.accentStrong },
  addCustom: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.minTouchTarget,
  },
  addCustomText: {
    color: theme.colors.accentStrong,
    flex: 1,
    fontFamily: theme.typography.familySemiBold,
    fontSize: theme.typography.small,
  },
  hint: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
