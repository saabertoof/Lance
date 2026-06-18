import type { ImagePickerAsset } from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  availabilityOptions,
  experienceOptions,
  opportunityInterestOptions,
  ProfileDraft,
  profileLinkOptions,
  remotePreferenceOptions,
  roleOptions,
} from '@/types/profile';

import { AvatarPicker } from './AvatarPicker';
import { FormSection } from './FormSection';
import { MultiSelectChips } from './MultiSelectChips';
import { SingleSelectChips } from './SingleSelectChips';
import { TagInput } from './TagInput';

type ProfileFieldsProps = {
  draft: ProfileDraft;
  onChange: (draft: ProfileDraft) => void;
  onError: (message: string) => void;
};

export function BasicProfileFields({
  draft,
  onChange,
  onError,
  showAdultConfirmation = true,
}: ProfileFieldsProps & { showAdultConfirmation?: boolean }) {
  function selectAvatar(asset: ImagePickerAsset) {
    onChange({
      ...draft,
      localAvatarUri: asset.uri,
      localAvatarBase64: asset.base64 ?? null,
    });
  }

  return (
    <>
      <AvatarPicker
        displayName={draft.displayName}
        imageUri={draft.localAvatarUri ?? draft.avatarUrl}
        onChange={selectAvatar}
        onError={onError}
      />
      <TextField
        autoCapitalize="words"
        label="Display name"
        maxLength={60}
        onChangeText={(displayName) => onChange({ ...draft, displayName })}
        placeholder="Alex Carter"
        value={draft.displayName}
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        label="Username"
        maxLength={24}
        onChangeText={(username) =>
          onChange({
            ...draft,
            username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
          })
        }
        placeholder="alexcarter"
        value={draft.username}
      />
      <TextField
        autoCapitalize="words"
        label="City or general location"
        maxLength={80}
        onChangeText={(city) => onChange({ ...draft, city })}
        placeholder="Chicago, IL"
        value={draft.city}
      />
      <FormSection title="Remote preference">
        <SingleSelectChips
          onChange={(remotePreference) => onChange({ ...draft, remotePreference })}
          options={remotePreferenceOptions}
          selected={draft.remotePreference}
        />
      </FormSection>
      {showAdultConfirmation ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.confirmedAdult }}
          onPress={() => onChange({ ...draft, confirmedAdult: !draft.confirmedAdult })}
          style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}>
          <View style={[styles.checkbox, draft.confirmedAdult && styles.checkboxSelected]}>
            {draft.confirmedAdult ? (
              <Ionicons color={theme.colors.white} name="checkmark" size={17} />
            ) : null}
          </View>
          <Text style={styles.checkboxLabel}>I confirm that I am at least 18 years old.</Text>
        </Pressable>
      ) : null}
    </>
  );
}

export function ProfessionalProfileFields({ draft, onChange }: ProfileFieldsProps) {
  const roles = roleOptions.map((role) => ({ label: role, value: role }));

  return (
    <>
      <FormSection title="Primary role">
        <SingleSelectChips
          onChange={(primaryRole) => onChange({ ...draft, primaryRole })}
          options={roles}
          selected={draft.primaryRole}
        />
      </FormSection>
      <TextField
        label="Headline"
        maxLength={120}
        onChangeText={(headline) => onChange({ ...draft, headline })}
        placeholder="Designer helping early teams ship clear products"
        value={draft.headline}
      />
      <TextField
        label="Short bio"
        maxLength={600}
        multiline
        numberOfLines={5}
        onChangeText={(bio) => onChange({ ...draft, bio })}
        placeholder="Share what you do, what you care about, and the kind of work you enjoy."
        style={styles.multiline}
        textAlignVertical="top"
        value={draft.bio}
      />
      <FormSection title="Experience level">
        <SingleSelectChips
          onChange={(experienceLevel) => onChange({ ...draft, experienceLevel })}
          options={experienceOptions}
          selected={draft.experienceLevel}
        />
      </FormSection>
      <FormSection title="Availability">
        <SingleSelectChips
          onChange={(availability) => onChange({ ...draft, availability })}
          options={availabilityOptions}
          selected={draft.availability}
        />
      </FormSection>
      <TagInput
        label="Skills"
        onChange={(skills) => onChange({ ...draft, skills })}
        placeholder="Add a skill"
        values={draft.skills}
      />
      <FormSection
        description="Choose every kind of opportunity you would consider."
        title="Opportunity interests">
        <MultiSelectChips
          onChange={(opportunityInterests) => onChange({ ...draft, opportunityInterests })}
          options={opportunityInterestOptions}
          selected={draft.opportunityInterests}
        />
      </FormSection>
      <TagInput
        label="Industry experience (optional)"
        max={15}
        onChange={(industryExperience) => onChange({ ...draft, industryExperience })}
        placeholder="Add an industry"
        values={draft.industryExperience}
      />
    </>
  );
}

export function ProfileLinksFields({ draft, onChange }: ProfileFieldsProps) {
  function updateLink(linkType: (typeof profileLinkOptions)[number]['value'], value: string) {
    const option = profileLinkOptions.find((item) => item.value === linkType)!;
    const remaining = draft.links.filter((link) => link.linkType !== linkType);
    const links = value
      ? [
          ...remaining,
          {
            label: option.label,
            linkType,
            value,
            displayOrder: optionIndex(linkType),
          },
        ].sort((first, second) => first.displayOrder - second.displayOrder)
      : remaining;

    onChange({ ...draft, links });
  }

  return (
    <>
      {profileLinkOptions.map((option) => (
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          inputMode={option.value === 'email' ? 'email' : 'url'}
          key={option.value}
          label={option.label}
          onChangeText={(value) => updateLink(option.value, value)}
          placeholder={option.value === 'email' ? 'you@example.com' : 'https://'}
          value={draft.links.find((link) => link.linkType === option.value)?.value ?? ''}
        />
      ))}
    </>
  );
}

function optionIndex(linkType: (typeof profileLinkOptions)[number]['value']) {
  return profileLinkOptions.findIndex((option) => option.value === linkType);
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 128,
    paddingTop: theme.spacing.lg,
  },
  checkboxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: theme.layout.minTouchTarget,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkboxLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '600',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
