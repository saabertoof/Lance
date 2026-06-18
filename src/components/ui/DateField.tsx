import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { formatDateLabel, parseDateValue, toDateValue } from '@/lib/date';

type DateFieldProps = {
  label: string;
  minimumDate?: string;
  onChange: (value: string) => void;
  value: string;
};

export function DateField({ label, minimumDate, onChange, value }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDateValue(value) ?? new Date();
  const minimum = minimumDate ? parseDateValue(minimumDate) ?? undefined : undefined;
  const pickerDate =
    minimum && selectedDate.getTime() < minimum.getTime() ? minimum : selectedDate;

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }

    if (event.type === 'set' && date) {
      onChange(toDateValue(date));
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={value ? `${label}: ${formatDateLabel(value)}` : `${label}: not set`}
          accessibilityRole="button"
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.muted} name="calendar-outline" size={20} />
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? formatDateLabel(value) : 'Choose a date'}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            accessibilityRole="button"
            onPress={() => {
              onChange('');
              setIsOpen(false);
            }}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
            <Ionicons color={theme.colors.muted} name="close" size={21} />
          </Pressable>
        ) : null}
      </View>
      {isOpen ? (
        <View style={styles.picker}>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minimum}
            mode="date"
            onChange={handleChange}
            value={pickerDate}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsOpen(false)}
              style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
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
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  field: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.lg,
  },
  clear: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    height: theme.layout.inputHeight,
    justifyContent: 'center',
    width: theme.layout.inputHeight,
  },
  value: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
  },
  placeholder: {
    color: theme.colors.mutedLight,
  },
  picker: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: theme.spacing.sm,
  },
  done: {
    alignSelf: 'flex-end',
    minHeight: theme.layout.minTouchTarget,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  doneText: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
