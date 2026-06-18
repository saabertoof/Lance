import type { ImagePickerAsset } from 'expo-image-picker';
import { StyleSheet, Text, View } from 'react-native';

import {
  BusinessLogoPicker,
} from '@/components/business/BusinessLogoPicker';
import { FormSection, SingleSelectChips } from '@/components/profile';
import { Card, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { slugify } from '@/lib/business';
import {
  businessRemoteOptions,
  businessSizeOptions,
  businessTypeOptions,
  BusinessDraft,
  industryOptions,
} from '@/types/business';

type BusinessFormProps = {
  draft: BusinessDraft;
  onChange: (draft: BusinessDraft) => void;
  onError: (message: string) => void;
};

export function BusinessForm({ draft, onChange, onError }: BusinessFormProps) {
  function set<K extends keyof BusinessDraft>(key: K, value: BusinessDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  function selectLogo(asset: ImagePickerAsset) {
    onChange({
      ...draft,
      localLogoUri: asset.uri,
      localLogoBase64: asset.base64 ?? null,
      localLogoMimeType: asset.mimeType ?? null,
    });
  }

  const industries = industryOptions.map((industry) => ({
    label: industry,
    value: industry,
  }));

  return (
    <View style={styles.form}>
      <FormSection title="Identity">
        <TextField
          label="Name"
          maxLength={100}
          onChangeText={(name) =>
            onChange({
              ...draft,
              name,
              slug: draft.slug ? draft.slug : slugify(name),
            })
          }
          placeholder="Northstar Studio"
          value={draft.name}
        />
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          label="Unique slug"
          maxLength={60}
          onChangeText={(slug) => set('slug', slugify(slug))}
          placeholder="northstar-studio"
          value={draft.slug}
        />
        <SingleSelectChips
          onChange={(businessType) => set('businessType', businessType)}
          options={businessTypeOptions}
          selected={draft.businessType}
        />
      </FormSection>

      <FormSection title="Logo">
        <BusinessLogoPicker
          imageUri={draft.localLogoUri ?? draft.logoUrl}
          name={draft.name}
          onChange={selectLogo}
          onError={onError}
        />
      </FormSection>

      <FormSection title="About">
        <TextField
          label="Short description"
          maxLength={180}
          multiline
          onChangeText={(shortDescription) => set('shortDescription', shortDescription)}
          placeholder="A concise explanation of what this business or project does."
          style={styles.shortTextArea}
          textAlignVertical="top"
          value={draft.shortDescription}
        />
        <TextField
          label="Full description (optional)"
          maxLength={2000}
          multiline
          onChangeText={(fullDescription) => set('fullDescription', fullDescription)}
          placeholder="Add useful context, focus, customers, or project goals."
          style={styles.textArea}
          textAlignVertical="top"
          value={draft.fullDescription}
        />
      </FormSection>

      <FormSection title="Industry and size">
        <SingleSelectChips
          onChange={(industry) => set('industry', industry)}
          options={industries}
          selected={draft.industry}
        />
        <SingleSelectChips
          onChange={(businessSize) => set('businessSize', businessSize)}
          options={businessSizeOptions}
          selected={draft.businessSize}
        />
        <TextField
          inputMode="numeric"
          label="Founding year (optional)"
          maxLength={4}
          onChangeText={(foundingYear) => set('foundingYear', foundingYear.replace(/\D/g, ''))}
          placeholder="2024"
          value={draft.foundingYear}
        />
      </FormSection>

      <FormSection title="Location and work style">
        <TextField
          label="Location (optional)"
          maxLength={100}
          onChangeText={(location) => set('location', location)}
          placeholder="Chicago, IL"
          value={draft.location}
        />
        <SingleSelectChips
          onChange={(remoteStatus) => set('remoteStatus', remoteStatus)}
          options={businessRemoteOptions}
          selected={draft.remoteStatus}
        />
      </FormSection>

      <FormSection description="All links are optional and must use HTTPS." title="Links">
        <TextField
          autoCapitalize="none"
          inputMode="url"
          label="Website"
          onChangeText={(websiteUrl) => set('websiteUrl', websiteUrl)}
          placeholder="https://"
          value={draft.websiteUrl}
        />
        <TextField
          autoCapitalize="none"
          inputMode="url"
          label="Instagram"
          onChangeText={(instagramUrl) => set('instagramUrl', instagramUrl)}
          placeholder="https://"
          value={draft.instagramUrl}
        />
        <TextField
          autoCapitalize="none"
          inputMode="url"
          label="TikTok"
          onChangeText={(tiktokUrl) => set('tiktokUrl', tiktokUrl)}
          placeholder="https://"
          value={draft.tiktokUrl}
        />
        <TextField
          autoCapitalize="none"
          inputMode="url"
          label="X"
          onChangeText={(xUrl) => set('xUrl', xUrl)}
          placeholder="https://"
          value={draft.xUrl}
        />
        <TextField
          autoCapitalize="none"
          inputMode="url"
          label="LinkedIn"
          onChangeText={(linkedinUrl) => set('linkedinUrl', linkedinUrl)}
          placeholder="https://"
          value={draft.linkedinUrl}
        />
        <TextField
          autoCapitalize="none"
          inputMode="url"
          label="GitHub"
          onChangeText={(githubUrl) => set('githubUrl', githubUrl)}
          placeholder="https://"
          value={draft.githubUrl}
        />
        <TextField
          autoCapitalize="none"
          inputMode="email"
          label="Contact email"
          onChangeText={(contactEmail) => set('contactEmail', contactEmail)}
          placeholder="hello@example.com"
          value={draft.contactEmail}
        />
      </FormSection>

      <FormSection title="Preview">
        <Card style={styles.preview}>
          <Text style={styles.previewName}>{draft.name || 'Business or project name'}</Text>
          <Text style={styles.previewMeta}>
            {draft.industry} · {draft.location || 'Location not set'}
          </Text>
          <Text style={styles.previewBody}>
            {draft.shortDescription || 'Your short description will appear here.'}
          </Text>
        </Card>
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.xxl,
  },
  shortTextArea: {
    minHeight: 96,
    paddingTop: theme.spacing.lg,
  },
  textArea: {
    minHeight: 150,
    paddingTop: theme.spacing.lg,
  },
  preview: {
    gap: theme.spacing.sm,
  },
  previewName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  previewMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  previewBody: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
});
