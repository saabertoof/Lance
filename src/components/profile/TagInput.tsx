import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/constants/theme';
import { addUniqueListEntry } from '@/lib/profile';

type TagInputProps = {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
};

export function TagInput({ label, max = 20, onChange, placeholder, values }: TagInputProps) {
  const [value, setValue] = useState('');

  function addValue() {
    const additions = value.split(',');
    let nextValues = values;

    additions.forEach((addition) => {
      nextValues = addUniqueListEntry(nextValues, addition, max);
    });

    onChange(nextValues);
    setValue('');
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          autoCapitalize="words"
          onChangeText={setValue}
          onSubmitEditing={addValue}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.mutedLight}
          returnKeyType="done"
          style={styles.input}
          value={value}
        />
        <Pressable
          accessibilityLabel={`Add ${label.toLowerCase()}`}
          accessibilityRole="button"
          disabled={!value.trim()}
          onPress={addValue}
          style={({ pressed }) => [
            styles.addButton,
            !value.trim() && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Ionicons color={theme.colors.white} name="add" size={22} />
        </Pressable>
      </View>
      {values.length > 0 ? (
        <View style={styles.tags}>
          {values.map((tag) => (
            <View key={tag.toLowerCase()} style={styles.tag}>
              <Text style={styles.tagLabel}>{tag}</Text>
              <Pressable
                accessibilityLabel={`Remove ${tag}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => onChange(values.filter((valueItem) => valueItem !== tag))}>
                <Ionicons color={theme.colors.muted} name="close" size={16} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSoft,
    fontFamily: theme.typography.familyMonoSemiBold,
    fontSize: theme.typography.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.lg,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderColor: 'rgba(167,139,250,0.45)',
    borderWidth: 1,
    borderRadius: theme.radii.md,
    height: theme.layout.inputHeight,
    justifyContent: 'center',
    width: theme.layout.inputHeight,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.72,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    alignItems: 'center',
    backgroundColor: theme.colors.chip,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  tagLabel: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.small,
    fontFamily: theme.typography.familyMedium,
  },
});
