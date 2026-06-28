import type { ImagePickerAsset } from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BusinessLogoPicker } from '@/components/business/BusinessLogoPicker';
import {
  CatalogSelector,
  FormSection,
  LocationInput,
  SingleSelectChips,
} from '@/components/profile';
import { Card, TextField } from '@/components/ui';
import { industryCatalog } from '@/constants/catalogs';
import { theme } from '@/constants/theme';
import {
  checkBusinessSlugAvailability,
  normalizeBusinessSlugInput,
  slugify,
} from '@/lib/business';
import {
  getLocationCatalogId,
  getLocationCountryCode,
  locationOptionFromStored,
} from '@/lib/location';
import {
  businessRemoteOptions,
  businessSizeOptions,
  businessTypeOptions,
  BusinessDraft,
} from '@/types/business';

export type BusinessUrlStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'error';

type BusinessFormProps = {
  businessId?: string;
  draft: BusinessDraft;
  onChange: (draft: BusinessDraft) => void;
  onError: (message: string) => void;
  onUrlStatusChange?: (status: BusinessUrlStatus) => void;
};

export function BusinessForm({
  businessId,
  draft,
  onChange,
  onError,
  onUrlStatusChange,
}: BusinessFormProps) {
  const [urlStatus, setUrlStatus] = useState<BusinessUrlStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const slug = slugify(draft.slug);

    if (slug.length < 3) {
      updateUrlStatus('idle');
      setSuggestions([]);
      return;
    }

    let active = true;
    updateUrlStatus('checking');
    setSuggestions([]);

    const timeout = setTimeout(() => {
      checkBusinessSlugAvailability(slug, businessId)
        .then(async (available) => {
          if (!active) return;

          if (available) {
            updateUrlStatus('available');
            return;
          }

          updateUrlStatus('unavailable');
          const candidates = buildSlugSuggestions(slug);
          const checks = await Promise.all(
            candidates.map(async (candidate) => ({
              candidate,
              available: await checkBusinessSlugAvailability(candidate, businessId),
            })),
          );

          if (active) {
            setSuggestions(
              checks.filter((check) => check.available).map((check) => check.candidate),
            );
          }
        })
        .catch(() => {
          if (active) updateUrlStatus('error');
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };

    function updateUrlStatus(status: BusinessUrlStatus) {
      setUrlStatus(status);
      onUrlStatusChange?.(status);
    }
  }, [businessId, draft.slug, onUrlStatusChange]);

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

  return (
    <View style={styles.form}>
      <FormSection title="Identity">
        <TextField
          label="Name"
          maxLength={100}
          onChangeText={(name) => {
            const shouldUpdateUrl =
              !draft.slug || draft.slug === slugify(draft.name);

            onChange({
              ...draft,
              name,
              slug: shouldUpdateUrl ? slugify(name) : draft.slug,
            });
          }}
          placeholder="Northstar Studio"
          value={draft.name}
        />
        <View style={styles.urlField}>
          <Text style={styles.fieldLabel}>Lance URL</Text>
          <View style={styles.urlInput}>
            <Text style={styles.urlPrefix}>https://lance.app/b/</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={60}
              onBlur={() => set('slug', slugify(draft.slug))}
              onChangeText={(slug) => set('slug', normalizeBusinessSlugInput(slug))}
              placeholder="northstar-studio"
              placeholderTextColor={theme.colors.mutedLight}
              style={styles.slugInput}
              value={draft.slug}
            />
          </View>
          <Text style={styles.urlPreview}>
            https://lance.app/b/{draft.slug || 'your-lance-url'}
          </Text>
          <View style={styles.availabilityRow}>
            {urlStatus === 'checking' ? (
              <>
                <ActivityIndicator color={theme.colors.accent} size="small" />
                <Text style={styles.availabilityText}>Checking availability...</Text>
              </>
            ) : null}
            {urlStatus === 'available' ? (
              <Text style={styles.available}>This Lance URL is available.</Text>
            ) : null}
            {urlStatus === 'unavailable' ? (
              <Text style={styles.unavailable}>That Lance URL is already in use.</Text>
            ) : null}
            {urlStatus === 'error' ? (
              <Text style={styles.unavailable}>
                Availability could not be checked. Try again before saving.
              </Text>
            ) : null}
          </View>
          {suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionLabel}>Available alternatives</Text>
              <View style={styles.suggestionList}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => set('slug', suggestion)}
                    style={({ pressed }) => [
                      styles.suggestion,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
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
        <CatalogSelector
          catalog={industryCatalog.map((label) => ({ label, category: 'Industries' }))}
          catalogType="industries"
          label="Industry"
          max={1}
          onChange={(industries) => set('industry', industries.at(-1) ?? '')}
          placeholder="Search industries"
          values={draft.industry ? [draft.industry] : []}
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
        <LocationInput
          legacyValue={draft.location}
          onChange={(location) =>
            onChange({
              ...draft,
              location: location?.label ?? '',
              locationId: getLocationCatalogId(location),
              locationRegion: location?.region ?? '',
              locationCountry: getLocationCountryCode(location),
            })
          }
          value={locationOptionFromStored({
            id: draft.locationId,
            label: draft.location,
            region: draft.locationRegion,
            country: draft.locationCountry,
          })}
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
            {draft.industry} | {draft.location || 'Location not set'}
          </Text>
          <Text style={styles.previewBody}>
            {draft.shortDescription || 'Your short description will appear here.'}
          </Text>
        </Card>
      </FormSection>
    </View>
  );
}

function buildSlugSuggestions(slug: string) {
  return ['-2', '-hq', '-studio'].map((suffix) => {
    const base = slug.slice(0, 60 - suffix.length).replace(/-+$/g, '');
    return `${base}${suffix}`;
  });
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
  urlField: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  urlInput: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: theme.layout.inputHeight,
    overflow: 'hidden',
  },
  urlPrefix: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    paddingLeft: theme.spacing.md,
  },
  slugInput: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    minHeight: theme.layout.inputHeight,
    minWidth: 80,
    paddingHorizontal: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  urlPreview: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  availabilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 20,
  },
  availabilityText: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  available: {
    color: theme.colors.success,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  unavailable: {
    color: theme.colors.danger,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  suggestions: {
    gap: theme.spacing.sm,
  },
  suggestionLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
  },
  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  suggestion: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  suggestionText: {
    color: theme.colors.accentStrong,
    fontSize: theme.typography.tiny,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
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
