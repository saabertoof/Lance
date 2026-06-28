import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { Button, Card, EmptyState, LoadingState, Screen, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFeedback } from '@/context/FeedbackContext';
import { useSearchAlerts } from '@/context/SearchAlertsContext';
import { routes } from '@/lib/routes';
import {
  deleteSavedSearch,
  loadAlertSchedulerStatus,
  loadSavedSearches,
  updateSavedSearch,
} from '@/lib/searchPhase6';
import { getSearchPlanChips } from '@/lib/searchPlan';
import type {
  SavedSearchAlertFrequency,
  SavedSearchRecord,
} from '@/types/searchPhase6';

export default function SavedSearchManagementScreen() {
  const { showSuccess, showWarning } = useFeedback();
  const { refreshUnread, unreadCount } = useSearchAlerts();
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<SavedSearchRecord | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [saved, scheduler] = await Promise.all([
        loadSavedSearches(),
        loadAlertSchedulerStatus().catch(() => false),
      ]);
      setSearches(saved);
      setSchedulerEnabled(scheduler);
    } catch {
      setError(
        'Saved searches are not available yet. Apply the Phase 6 migration, then try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setFrequency(
    search: SavedSearchRecord,
    frequency: SavedSearchAlertFrequency,
  ) {
    try {
      const updated = await updateSavedSearch(search.id, {
        alertFrequency: frequency,
      });
      setSearches((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      showSuccess(
        frequency === 'paused'
          ? 'Opportunity alert paused.'
          : `${frequency === 'daily' ? 'Daily' : 'Weekly'} opportunity alert enabled.`,
      );
    } catch {
      showWarning('That alert setting could not be updated.');
    }
  }

  function chooseFrequency(search: SavedSearchRecord) {
    if (!schedulerEnabled) {
      Alert.alert(
        'Opportunity alerts are not active yet',
        'The scheduler must be configured before Daily or Weekly alerts can be enabled.',
        [
          {
            text: 'Pause alert',
            onPress: () => void setFrequency(search, 'paused'),
          },
          { text: 'OK' },
        ],
      );
      return;
    }
    Alert.alert('Opportunity alert frequency', search.name, [
      { text: 'Daily', onPress: () => void setFrequency(search, 'daily') },
      { text: 'Weekly', onPress: () => void setFrequency(search, 'weekly') },
      { text: 'Paused', onPress: () => void setFrequency(search, 'paused') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmDelete(search: SavedSearchRecord) {
    Alert.alert(
      'Delete saved search?',
      'Its opportunity alert history will also be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavedSearch(search.id);
              setSearches((current) =>
                current.filter((item) => item.id !== search.id),
              );
              await refreshUnread();
              showSuccess('Saved search deleted.');
            } catch {
              showWarning('That saved search could not be deleted.');
            }
          },
        },
      ],
    );
  }

  const opportunitySearches = searches.filter((search) => search.targetType === 'jobs');

  return (
    <Screen
      compact
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      scroll
      contentStyle={styles.screen}>
      <PageHeader title="Saved searches" />

      <Pressable
        accessibilityLabel={
          unreadCount
            ? `Open ${unreadCount} unread opportunity alerts`
            : 'Open opportunity alert inbox'
        }
        accessibilityRole="button"
        onPress={() => router.push(routes.searchAlerts)}
        style={({ pressed }) => [
          styles.inbox,
          pressed && styles.pressed,
        ]}>
        <View style={styles.inboxMark}>
          <Ionicons
            color={theme.colors.accentStrong}
            name="notifications-outline"
            size={22}
          />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {Math.min(unreadCount, 99)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.inboxCopy}>
          <Text style={styles.sectionTitle}>New matches</Text>
          <Text style={styles.meta}>
            {unreadCount
              ? `${unreadCount} unread opportunity match${unreadCount === 1 ? '' : 'es'}`
              : 'No new opportunity matches yet'}
          </Text>
        </View>
        <Ionicons
          color={theme.colors.muted}
          name="chevron-forward"
          size={20}
        />
      </Pressable>

      {loading ? <LoadingState message="Loading saved searches" /> : null}
      {!loading && error ? (
        <View style={styles.state}>
          <EmptyState body={error} title="Saved searches unavailable" />
          <Button label="Retry" onPress={() => void load()} />
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          <SectionHeading
            body="People, opportunities, and businesses you can run again."
            title="Saved searches"
          />
          {searches.length === 0 ? (
            <EmptyState
              body="Save a search to return to it quickly."
              title="Nothing saved yet"
            />
          ) : (
            <View style={styles.list}>
              {searches.map((search) => (
                <SavedSearchCard
                  key={search.id}
                  onDelete={() => confirmDelete(search)}
                  onRename={() => setRenaming(search)}
                  onRun={() =>
                    router.replace({
                      pathname: '/(tabs)/search',
                      params: {
                        savedSearchId: search.id,
                        savedSearchRun: Date.now().toString(),
                      },
                    })
                  }
                  search={search}
                />
              ))}
            </View>
          )}

          <SectionHeading
            body={
              schedulerEnabled
                ? 'Daily or weekly alerts for newly published matching opportunities.'
                : 'Configure the scheduler before activating Daily or Weekly alerts.'
            }
            title="Opportunity alerts"
          />
          {opportunitySearches.length === 0 ? (
            <Text style={styles.emptyLine}>
              Save an opportunity search to create an alert.
            </Text>
          ) : (
            <View style={styles.list}>
              {opportunitySearches.map((search) => (
                <Pressable
                  accessibilityLabel={`Change alert frequency for ${search.name}`}
                  accessibilityRole="button"
                  key={search.id}
                  onPress={() => chooseFrequency(search)}
                  style={({ pressed }) => [
                    styles.alertRow,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.alertIcon}>
                    <Ionicons
                      color={
                        schedulerEnabled && search.alertEnabled
                          ? theme.colors.accentStrong
                          : theme.colors.muted
                      }
                      name={
                        schedulerEnabled && search.alertEnabled
                          ? 'notifications'
                          : 'notifications-off-outline'
                      }
                      size={20}
                    />
                  </View>
                  <View style={styles.alertCopy}>
                    <Text numberOfLines={1} style={styles.rowTitle}>
                      {search.name}
                    </Text>
                    <Text style={styles.meta}>
                      {!schedulerEnabled
                        ? 'Scheduler not configured'
                        : search.alertEnabled
                          ? `${capitalize(search.alertFrequency)} UTC schedule`
                          : 'Paused'}
                    </Text>
                  </View>
                  <Ionicons
                    color={theme.colors.muted}
                    name="chevron-down"
                    size={18}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}

      <RenameSearchModal
        onClose={() => setRenaming(null)}
        onSaved={(updated) => {
          setSearches((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          setRenaming(null);
          showSuccess('Saved search renamed.');
        }}
        search={renaming}
      />
    </Screen>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.headerButton}>
        <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerButton} />
    </View>
  );
}

function SectionHeading({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.meta}>{body}</Text>
    </View>
  );
}

function SavedSearchCard({
  onDelete,
  onRename,
  onRun,
  search,
}: {
  onDelete: () => void;
  onRename: () => void;
  onRun: () => void;
  search: SavedSearchRecord;
}) {
  const chips = getSearchPlanChips(search.filterPlan).slice(0, 4);
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {search.name}
          </Text>
          <Text style={styles.target}>{targetLabel(search.targetType)}</Text>
        </View>
        <Pressable
          accessibilityLabel={`Delete ${search.name}`}
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.smallButton}>
          <Ionicons color={theme.colors.danger} name="trash-outline" size={18} />
        </Pressable>
      </View>
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip.id} style={styles.chip}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.meta}>
        {search.lastOpenedAt
          ? `Opened ${formatTimestamp(search.lastOpenedAt)}`
          : `Saved ${formatTimestamp(search.createdAt)}`}
      </Text>
      <View style={styles.cardActions}>
        <Button label="Run search" onPress={onRun} style={styles.runButton} />
        <Pressable
          accessibilityLabel={`Rename ${search.name}`}
          accessibilityRole="button"
          onPress={onRename}
          style={styles.renameButton}>
          <Ionicons color={theme.colors.text} name="pencil-outline" size={18} />
        </Pressable>
      </View>
    </Card>
  );
}

function RenameSearchModal({
  onClose,
  onSaved,
  search,
}: {
  onClose: () => void;
  onSaved: (search: SavedSearchRecord) => void;
  search: SavedSearchRecord | null;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setName(search?.name ?? '');
    setError(null);
  }, [search]);

  async function save() {
    if (!search || !name.trim()) {
      setError('Enter a search name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateSavedSearch(search.id, { name }));
    } catch {
      setError('This name could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(search)}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={() => undefined} style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Rename saved search</Text>
          <TextField
            error={error ?? undefined}
            label="Name"
            maxLength={80}
            onChangeText={setName}
            value={name}
          />
          <View style={styles.modalActions}>
            <Button label="Cancel" onPress={onClose} variant="ghost" />
            <Button label="Save" loading={saving} onPress={() => void save()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function targetLabel(target: SavedSearchRecord['targetType']) {
  return target === 'jobs'
    ? 'Opportunity search'
    : target === 'people'
      ? 'People search'
      : 'Business search';
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
  },
  inbox: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderColor: '#D8CEFF',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 72,
    padding: theme.spacing.md,
  },
  inboxMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  inboxCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#E34949',
    borderColor: theme.colors.surface,
    borderRadius: 9,
    borderWidth: 2,
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 8,
    fontWeight: '900',
  },
  sectionHeading: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 17,
  },
  list: {
    gap: theme.spacing.md,
  },
  state: {
    gap: theme.spacing.md,
  },
  card: {
    borderRadius: theme.radii.md,
    gap: theme.spacing.md,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cardCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
  },
  target: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.label,
    fontWeight: '700',
  },
  smallButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  runButton: {
    flex: 1,
  },
  renameButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  alertRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 64,
    padding: theme.spacing.md,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  alertCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  emptyLine: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,10,18,0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    gap: theme.spacing.lg,
    maxWidth: 440,
    padding: theme.spacing.lg,
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.72,
  },
});
