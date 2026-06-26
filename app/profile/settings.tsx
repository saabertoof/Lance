import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { formatAuthError } from '@/lib/authErrors';
import { loadPersonalProfile } from '@/lib/profile';
import { routes } from '@/lib/routes';
import {
  defaultLocalSettingsPreferences,
  loadLocalSettingsPreferences,
  saveLocalSettingsPreferences,
  type AppearanceMode,
  type LocalSettingsPreferences,
} from '@/lib/settingsPreferences';
import { supabase } from '@/lib/supabase';
import {
  getOptionLabel,
  remotePreferenceOptions,
  type PersonalProfile,
} from '@/types/profile';

type IconName = keyof typeof Ionicons.glyphMap;
type ToggleKey = Exclude<keyof LocalSettingsPreferences, 'appearanceMode'>;

const appearanceOptions: {
  description: string;
  label: string;
  value: AppearanceMode;
}[] = [
  {
    label: 'System',
    description: 'Follow device preference later.',
    value: 'system',
  },
  {
    label: 'Light',
    description: 'Current Lance theme.',
    value: 'light',
  },
  {
    label: 'Dark',
    description: 'Saved for the theme pass.',
    value: 'dark',
  },
];

const notificationToggles: {
  detail: string;
  icon: IconName;
  key: ToggleKey;
  label: string;
}[] = [
  {
    detail: 'When someone applies to one of your opportunities.',
    icon: 'person-add-outline',
    key: 'newApplicantNotifications',
    label: 'New applicants',
  },
  {
    detail: 'New direct messages and request follow-ups.',
    icon: 'paper-plane-outline',
    key: 'messageNotifications',
    label: 'Messages',
  },
  {
    detail: 'Updates on opportunities you applied to.',
    icon: 'checkmark-done-outline',
    key: 'applicationUpdates',
    label: 'Application updates',
  },
  {
    detail: 'In-app alerts from your saved searches.',
    icon: 'notifications-outline',
    key: 'savedSearchAlerts',
    label: 'Saved search alerts',
  },
  {
    detail: 'New opportunities that match your profile.',
    icon: 'sparkles-outline',
    key: 'matchingOpportunities',
    label: 'Matching opportunities',
  },
  {
    detail: 'Drafts, paused opportunities, and follow-up nudges.',
    icon: 'calendar-outline',
    key: 'opportunityReminders',
    label: 'Opportunity reminders',
  },
];

const aiToggles: {
  detail: string;
  icon: IconName;
  key: ToggleKey;
  label: string;
}[] = [
  {
    detail: 'Let Lance suggest cleaner copy and next steps when safe AI tools are available.',
    icon: 'sparkles-outline',
    key: 'aiDrafting',
    label: 'AI drafting help',
  },
  {
    detail: 'Future profile rewrite prompts and polish suggestions.',
    icon: 'person-circle-outline',
    key: 'aiProfileHelp',
    label: 'Profile writing help',
  },
  {
    detail: 'Controls future AI-backed versions of Magic Draft.',
    icon: 'document-text-outline',
    key: 'aiOpportunityDraft',
    label: 'Opportunity Magic Draft help',
  },
  {
    detail: 'Future summaries for applicant review. No private data is sent from this screen.',
    icon: 'reader-outline',
    key: 'aiApplicantSummary',
    label: 'Applicant summary help',
  },
];

export default function ProfileSettingsScreen() {
  const { signOut, user } = useAuth();
  const { showSuccess, showWarning } = useFeedback();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [preferences, setPreferences] = useState<LocalSettingsPreferences>(
    defaultLocalSettingsPreferences,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) return;
      setIsLoading(true);
      const [settingsResult, profileResult] = await Promise.allSettled([
        loadLocalSettingsPreferences(user.id),
        loadPersonalProfile(user.id, user.email ?? null),
      ]);

      if (!active) return;

      if (settingsResult.status === 'fulfilled') {
        setPreferences(settingsResult.value);
      }
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const savedLocation = useMemo(() => {
    if (!profile) return 'Not set yet';
    return profile.city || 'Not set yet';
  }, [profile]);

  function updatePreferences(patch: Partial<LocalSettingsPreferences>) {
    if (!user) return;
    setPreferences((current) => {
      const next = { ...current, ...patch };
      void saveLocalSettingsPreferences(user.id, next).catch(() =>
        showWarning('Settings could not be saved on this device.'),
      );
      return next;
    });
  }

  async function logOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      showWarning('Could not log out. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  async function sendPasswordReset() {
    if (!user?.email || isSendingReset) return;
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      showSuccess('Password reset email sent.');
    } catch (resetError) {
      showWarning(formatAuthError(resetError));
    } finally {
      setIsSendingReset(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Opening settings" />;
  }

  return (
    <Screen compact scroll contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons color={theme.colors.text} name="arrow-back" size={21} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Account, privacy, alerts, and app controls.</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <SettingsSection
        description="Your login, profile, and communication basics."
        title="Account">
        <InfoRow
          icon="mail-outline"
          label="Signed in as"
          value={user?.email ?? 'Email unavailable'}
        />
        <SettingsRow
          detail="Update your public Lance profile."
          icon="create-outline"
          label="Edit profile"
          onPress={() => router.push(routes.editProfile)}
        />
        {user ? (
          <SettingsRow
            detail="See what other members see."
            icon="eye-outline"
            label="Preview profile"
            onPress={() => router.push(routes.profile(user.id))}
          />
        ) : null}
        <SettingsRow
          detail="Sends a reset link to your signed-in email."
          disabled={!user?.email || isSendingReset}
          icon="key-outline"
          label={isSendingReset ? 'Sending reset email...' : 'Reset password'}
          onPress={() => void sendPasswordReset()}
        />
        <SettingsRow
          detail="Who can request to connect with you."
          icon="chatbubbles-outline"
          label="Communication preferences"
          onPress={() => router.push(routes.communicationSettings)}
        />
        <Button
          label="Log out"
          loading={isSigningOut}
          onPress={() => void logOut()}
          variant="secondary"
        />
      </SettingsSection>

      <SettingsSection
        description="Theme controls are staged here. Lance still uses the light theme until the full theme pass."
        title="Appearance">
        <SegmentedSetting
          onChange={(appearanceMode) => {
            updatePreferences({ appearanceMode });
            showSuccess('Appearance preference saved for this device.');
          }}
          options={appearanceOptions}
          value={preferences.appearanceMode}
        />
      </SettingsSection>

      <SettingsSection
        description="Local preferences for future push and in-app alert controls. No APNs or FCM setup was added."
        title="Notifications">
        {notificationToggles.map((item) => (
          <SwitchRow
            detail={item.detail}
            icon={item.icon}
            key={item.key}
            label={item.label}
            onValueChange={(value) => updatePreferences({ [item.key]: value })}
            value={Boolean(preferences[item.key])}
          />
        ))}
      </SettingsSection>

      <SettingsSection
        description="These controls show where privacy options will live. Server rules still protect real data."
        title="Privacy">
        <StatusRow
          detail="Changing visibility needs a backend policy pass."
          icon="lock-open-outline"
          label="Profile visibility"
          value="Public profile for now"
        />
        <PlaceholderSwitch
          detail="Location visibility needs server-backed profile rules before it can be changed here."
          icon="location-outline"
          label="Show location"
          value={Boolean(profile?.city)}
        />
        <PlaceholderSwitch
          detail="Social links are still controlled by your profile editor."
          icon="link-outline"
          label="Show social links"
          value={Boolean((profile?.links.length ?? 0) > 0)}
        />
        <PlaceholderSwitch
          detail="Lance does not currently expose active status."
          icon="pulse-outline"
          label="Show active status"
          value={false}
        />
        <StatusRow
          detail="A full blocked-users manager needs a later backend and UI pass."
          icon="ban-outline"
          label="Blocked users"
          value="Coming soon"
        />
      </SettingsSection>

      <SettingsSection
        description="Location search/autocomplete will come later without adding API keys in the client."
        title="Location">
        <InfoRow
          icon="pin-outline"
          label="Saved location"
          value={savedLocation}
        />
        <InfoRow
          icon="navigate-outline"
          label="Work preference"
          value={
            profile
              ? getOptionLabel(remotePreferenceOptions, profile.remotePreference)
              : 'Flexible'
          }
        />
        <SettingsRow
          detail="Update location and remote preference from your profile."
          icon="create-outline"
          label="Edit profile location"
          onPress={() => router.push(routes.editProfile)}
        />
      </SettingsSection>

      <SettingsSection
        description="Future-facing controls only. No OpenAI key or AI request is added to the app."
        title="AI preferences">
        {aiToggles.map((item) => (
          <SwitchRow
            detail={item.detail}
            icon={item.icon}
            key={item.key}
            label={item.label}
            onValueChange={(value) => updatePreferences({ [item.key]: value })}
            value={Boolean(preferences[item.key])}
          />
        ))}
      </SettingsSection>

      <SettingsSection title="Support / About">
        <SettingsRow
          detail="Manage Ask Lance searches and alert schedules."
          icon="search-outline"
          label="Saved searches"
          onPress={() => router.push(routes.savedSearches)}
        />
        <SettingsRow
          detail="Review matching opportunity alerts."
          icon="notifications-outline"
          label="Search alerts"
          onPress={() => router.push(routes.searchAlerts)}
        />
        <StatusRow
          detail="Creator opportunity links, discovery, applications, and profiles."
          icon="information-circle-outline"
          label="About Lance"
          value="Version 1.0"
        />
      </SettingsSection>

      <SettingsSection
        description="Sensitive account actions need careful server support before they become live."
        danger
        title="Danger zone">
        <StatusRow
          danger
          detail="Full account deletion needs a secure backend deletion flow."
          icon="trash-outline"
          label="Delete account"
          value="Not available yet"
        />
      </SettingsSection>
    </Screen>
  );
}

function SettingsSection({
  children,
  danger,
  description,
  title,
}: {
  children: React.ReactNode;
  danger?: boolean;
  description?: string;
  title: string;
}) {
  return (
    <View style={[styles.section, danger && styles.dangerSection]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, danger && styles.dangerText]}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <RowIcon icon={icon} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.rowDetail}>{value}</Text>
      </View>
    </View>
  );
}

function SettingsRow({
  detail,
  disabled,
  icon,
  label,
  onPress,
}: {
  detail?: string;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <RowIcon icon={icon} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Ionicons color={theme.colors.mutedLight} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function StatusRow({
  danger,
  detail,
  icon,
  label,
  value,
}: {
  danger?: boolean;
  detail?: string;
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <RowIcon danger={danger} icon={icon} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Text style={[styles.rowValue, danger && styles.dangerText]}>{value}</Text>
    </View>
  );
}

function SwitchRow({
  detail,
  icon,
  label,
  onValueChange,
  value,
}: {
  detail: string;
  icon: IconName;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.row}>
      <RowIcon icon={icon} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        ios_backgroundColor={theme.colors.border}
        onValueChange={onValueChange}
        thumbColor={theme.colors.white}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.accent,
        }}
        value={value}
      />
    </View>
  );
}

function PlaceholderSwitch({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: IconName;
  label: string;
  value: boolean;
}) {
  return (
    <View style={styles.row}>
      <RowIcon icon={icon} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        disabled
        ios_backgroundColor={theme.colors.border}
        thumbColor={theme.colors.white}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.accent,
        }}
        value={value}
      />
    </View>
  );
}

function SegmentedSetting({
  onChange,
  options,
  value,
}: {
  onChange: (value: AppearanceMode) => void;
  options: typeof appearanceOptions;
  value: AppearanceMode;
}) {
  return (
    <View style={styles.segmentedWrap}>
      <View style={styles.segmented}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.segmentHint}>
        {options.find((option) => option.value === value)?.description}
      </Text>
    </View>
  );
}

function RowIcon({
  danger,
  icon,
}: {
  danger?: boolean;
  icon: IconName;
}) {
  return (
    <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
      <Ionicons
        color={danger ? theme.colors.danger : theme.colors.accentStrong}
        name={icon}
        size={18}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.md,
    paddingBottom: 120,
    paddingHorizontal: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.screenHeading,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(8,10,18,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  dangerSection: {
    backgroundColor: '#FFF8F8',
    borderColor: '#F4D4D4',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  sectionDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  sectionBody: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 56,
    paddingVertical: theme.spacing.sm,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dangerIcon: {
    backgroundColor: '#FFE8E8',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  rowDetail: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    lineHeight: 16,
  },
  rowValue: {
    color: theme.colors.muted,
    flexShrink: 0,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    maxWidth: 112,
    textAlign: 'right',
  },
  segmentedWrap: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  segmented: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: theme.radii.pill,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  segmentLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
  segmentLabelSelected: {
    color: theme.colors.text,
  },
  segmentHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption,
    lineHeight: 17,
  },
  dangerText: {
    color: theme.colors.danger,
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.52,
  },
});
