import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { validateProfileImage } from '@/lib/profilePolish';
import {
  currentIntentOptions,
  PROFILE_INTENT_LIMIT,
  PROFILE_PORTFOLIO_LIMIT,
  PROFILE_PROMPT_LIMIT,
  profilePromptOptions,
  type CustomProfileLink,
  type PortfolioItem,
  type ProfilePolish,
} from '@/types/profilePolish';

import { FormSection } from './FormSection';
import { LocationSelector } from './LocationSelector';
import { MultiSelectChips } from './MultiSelectChips';
import { SingleSelectChips } from './SingleSelectChips';

export function ProfilePolishEditor({
  displayName,
  onChange,
  onError,
  polish,
}: {
  displayName: string;
  onChange: (polish: ProfilePolish) => void;
  onError: (message: string) => void;
  polish: ProfilePolish;
}) {
  function set<K extends keyof ProfilePolish>(key: K, value: ProfilePolish[K]) {
    onChange({ ...polish, [key]: value });
  }

  async function chooseBanner() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [3, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.82,
      });
      if (result.canceled) return;
      validateProfileImage(result.assets[0]);
      set('bannerUrl', result.assets[0].uri);
      onChange({
        ...polish,
        bannerUrl: result.assets[0].uri,
        pendingBannerBase64: result.assets[0].base64,
        pendingBannerMimeType: result.assets[0].mimeType,
        obsoleteBannerPath: polish.bannerPath,
      } as ProfilePolish);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The banner could not be selected.');
    }
  }

  function updateIntents(values: ProfilePolish['currentIntents']) {
    if (values.length <= PROFILE_INTENT_LIMIT) set('currentIntents', values);
    else onError('Choose up to three current intents.');
  }

  return (
    <>
      <FormSection
        description="A wide image works best. JPEG, PNG, or WebP up to 10 MB."
        title="Profile banner">
        <View style={styles.banner}>
          {polish.bannerUrl ? (
            <Image contentFit="cover" source={polish.bannerUrl} style={styles.fill} />
          ) : (
            <View style={styles.bannerDefault}>
              <Text style={styles.bannerMark}>L</Text>
            </View>
          )}
        </View>
        <View style={styles.inlineActions}>
          <Button
            label={polish.bannerUrl ? 'Replace banner' : 'Choose banner'}
            onPress={() => void chooseBanner()}
            variant="secondary"
          />
          {polish.bannerUrl ? (
            <Button
              label="Remove"
              onPress={() =>
                onChange({
                  ...polish,
                  bannerPath: null,
                  bannerUrl: null,
                  pendingBannerBase64: null,
                  pendingBannerMimeType: null,
                  obsoleteBannerPath: polish.bannerPath,
                } as ProfilePolish)
              }
              variant="ghost"
            />
          ) : null}
        </View>
      </FormSection>

      <FormSection
        description="Select a city, region, or country. Remote preference remains separate."
        title="Structured location">
        <LocationSelector
          legacyValue={polish.legacyLocation}
          onChange={(location) => set('location', location)}
          value={polish.location}
        />
      </FormSection>

      <FormSection
        description="Choose up to three public signals about what you want right now."
        title="Current intents">
        <MultiSelectChips
          onChange={updateIntents}
          options={currentIntentOptions}
          selected={polish.currentIntents}
        />
      </FormSection>

      <FormSection
        description="Choose a controlled template and accessible presentation settings."
        title="Profile style">
        <SingleSelectChips
          onChange={(template) => set('theme', { ...polish.theme, template })}
          options={[
            { label: 'Clean', value: 'clean' },
            { label: 'Creator', value: 'creator' },
            { label: 'Studio', value: 'studio' },
            { label: 'Bold', value: 'bold' },
          ]}
          selected={polish.theme.template}
        />
        <Text style={styles.fieldLabel}>Accent</Text>
        <View style={styles.swatches}>
          {(['purple', 'blue', 'green', 'rose', 'charcoal'] as const).map((accent) => (
            <Pressable
              accessibilityLabel={`${accent} accent`}
              accessibilityRole="radio"
              accessibilityState={{ selected: polish.theme.accent === accent }}
              key={accent}
              onPress={() => set('theme', { ...polish.theme, accent })}
              style={[
                styles.swatch,
                { backgroundColor: accentColors[accent] },
                polish.theme.accent === accent && styles.swatchSelected,
              ]}
            />
          ))}
        </View>
        <SingleSelectChips
          onChange={(headerAlignment) =>
            set('theme', { ...polish.theme, headerAlignment })
          }
          options={[
            { label: 'Left header', value: 'left' },
            { label: 'Centered header', value: 'center' },
          ]}
          selected={polish.theme.headerAlignment}
        />
        <SingleSelectChips
          onChange={(cardShape) => set('theme', { ...polish.theme, cardShape })}
          options={[
            { label: 'Soft rounded', value: 'soft' },
            { label: 'Pill', value: 'pill' },
            { label: 'Squared', value: 'squared' },
          ]}
          selected={polish.theme.cardShape}
        />
        <SingleSelectChips
          onChange={(background) => set('theme', { ...polish.theme, background })}
          options={[
            { label: 'Neutral', value: 'neutral' },
            { label: 'Soft gradient', value: 'soft_gradient' },
            { label: 'Banner-led', value: 'banner_led' },
          ]}
          selected={polish.theme.background}
        />
        <Card
          style={[
            styles.preview,
            {
              borderColor: accentColors[polish.theme.accent],
              borderRadius: shapeRadius(polish.theme.cardShape),
            },
          ]}>
          <Text style={styles.previewEyebrow}>{polish.theme.template.toUpperCase()}</Text>
          <Text
            style={[
              styles.previewName,
              polish.theme.template === 'bold' && styles.previewNameBold,
              { textAlign: polish.theme.headerAlignment },
            ]}>
            {displayName || 'Your profile'}
          </Text>
          <Text style={{ color: accentColors[polish.theme.accent] }}>
            Builder, creator, and collaborator
          </Text>
        </Card>
      </FormSection>

      <PromptEditor
        onChange={(prompts) => set('prompts', prompts)}
        prompts={polish.prompts}
      />
      <PortfolioEditor
        items={polish.portfolio}
        onChange={(portfolio) => set('portfolio', portfolio)}
        onError={onError}
      />
      <CustomLinksEditor
        links={polish.customLinks}
        onChange={(customLinks) => set('customLinks', customLinks)}
      />
    </>
  );
}

function PromptEditor({
  onChange,
  prompts,
}: {
  onChange: (prompts: ProfilePolish['prompts']) => void;
  prompts: ProfilePolish['prompts'];
}) {
  function add() {
    if (prompts.length >= PROFILE_PROMPT_LIMIT) return;
    const unused =
      profilePromptOptions.find(
        (option) => !prompts.some((prompt) => prompt.promptKey === option.value),
      ) ?? profilePromptOptions[0];
    onChange([
      ...prompts,
      {
        id: `new-${Date.now()}`,
        promptKey: unused.value,
        answer: '',
        displayOrder: prompts.length,
      },
    ]);
  }

  return (
    <FormSection description="Up to three short answers, 280 characters each." title="Profile prompts">
      {prompts.map((prompt, index) => (
        <View key={prompt.id} style={styles.editorBlock}>
          <SingleSelectChips
            onChange={(promptKey) =>
              onChange(prompts.map((item, itemIndex) => itemIndex === index ? { ...item, promptKey } : item))
            }
            options={profilePromptOptions}
            selected={prompt.promptKey}
          />
          <TextField
            label="Answer"
            maxLength={280}
            multiline
            onChangeText={(answer) =>
              onChange(prompts.map((item, itemIndex) => itemIndex === index ? { ...item, answer } : item))
            }
            placeholder="Keep it current and specific."
            style={styles.textArea}
            value={prompt.answer}
          />
          <ReorderRow
            canDown={index < prompts.length - 1}
            canUp={index > 0}
            onDelete={() => onChange(prompts.filter((_, itemIndex) => itemIndex !== index))}
            onDown={() => onChange(move(prompts, index, index + 1))}
            onUp={() => onChange(move(prompts, index, index - 1))}
          />
        </View>
      ))}
      {prompts.length < PROFILE_PROMPT_LIMIT ? <Button label="Add prompt" onPress={add} variant="secondary" /> : null}
    </FormSection>
  );
}

function PortfolioEditor({
  items,
  onChange,
  onError,
}: {
  items: PortfolioItem[];
  onChange: (items: PortfolioItem[]) => void;
  onError: (message: string) => void;
}) {
  function addLink(type: PortfolioItem['itemType']) {
    if (items.length >= PROFILE_PORTFOLIO_LIMIT) return;
    onChange([
      ...items,
      {
        id: `new-${Date.now()}`,
        itemType: type,
        title: '',
        caption: '',
        mediaUrl: null,
        storagePath: null,
        thumbnailUrl: null,
        externalUrl: null,
        accessibilityDescription: '',
        displayOrder: items.length,
      },
    ]);
  }

  async function addImage() {
    try {
      if (items.length >= PROFILE_PORTFOLIO_LIMIT) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        base64: true,
        mediaTypes: ['images'],
        quality: 0.82,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      validateProfileImage(asset);
      onChange([
        ...items,
        {
          id: `new-${Date.now()}`,
          itemType: 'image',
          title: '',
          caption: '',
          mediaUrl: asset.uri,
          storagePath: null,
          thumbnailUrl: null,
          externalUrl: null,
          accessibilityDescription: '',
          displayOrder: items.length,
          localUri: asset.uri,
          localBase64: asset.base64,
          localMimeType: asset.mimeType,
        },
      ]);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The image could not be selected.');
    }
  }

  return (
    <FormSection
      description={`${items.length}/${PROFILE_PORTFOLIO_LIMIT} items. Images upload directly; videos use safe external links.`}
      title="Portfolio">
      {items.map((item, index) => (
        <View key={item.id} style={styles.editorBlock}>
          {item.mediaUrl ? (
            <Image contentFit="cover" source={item.mediaUrl} style={styles.portfolioPreview} />
          ) : null}
          <Text style={styles.itemType}>{item.itemType.replace('_', ' ')}</Text>
          <TextField
            label="Title"
            maxLength={100}
            onChangeText={(title) => onChange(updateAt(items, index, { title }))}
            placeholder="Project or work title"
            value={item.title}
          />
          <TextField
            label="Short caption"
            maxLength={240}
            multiline
            onChangeText={(caption) => onChange(updateAt(items, index, { caption }))}
            placeholder="What this work shows"
            style={styles.textArea}
            value={item.caption}
          />
          {item.itemType !== 'image' ? (
            <TextField
              autoCapitalize="none"
              inputMode="url"
              label={item.itemType === 'external_video' ? 'Video URL' : 'Project URL'}
              onChangeText={(externalUrl) => onChange(updateAt(items, index, { externalUrl }))}
              placeholder="https://"
              value={item.externalUrl ?? ''}
            />
          ) : (
            <>
              <TextField
                autoCapitalize="none"
                inputMode="url"
                label="Optional destination URL"
                onChangeText={(externalUrl) => onChange(updateAt(items, index, { externalUrl }))}
                placeholder="https://"
                value={item.externalUrl ?? ''}
              />
              <TextField
                label="Image description"
                maxLength={180}
                onChangeText={(accessibilityDescription) =>
                  onChange(updateAt(items, index, { accessibilityDescription }))
                }
                placeholder="Describe the image for accessibility"
                value={item.accessibilityDescription}
              />
            </>
          )}
          <ReorderRow
            canDown={index < items.length - 1}
            canUp={index > 0}
            onDelete={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            onDown={() => onChange(move(items, index, index + 1))}
            onUp={() => onChange(move(items, index, index - 1))}
          />
        </View>
      ))}
      <View style={styles.inlineActions}>
        <Button label="Add image" onPress={() => void addImage()} variant="secondary" />
        <Button label="Add video link" onPress={() => addLink('external_video')} variant="secondary" />
        <Button label="Add project link" onPress={() => addLink('project_link')} variant="ghost" />
      </View>
    </FormSection>
  );
}

function CustomLinksEditor({
  links,
  onChange,
}: {
  links: CustomProfileLink[];
  onChange: (links: CustomProfileLink[]) => void;
}) {
  const visibleLinks =
    links.length > 0
      ? links
      : [{ id: 'blank-link', label: '', url: '', iconKey: 'link', displayOrder: 0 }];
  return (
    <FormSection
      description="Recognized social profiles stay in the icon row. These appear as full-width links."
      title="Other links">
      {visibleLinks.map((link, index) => (
        <View key={link.id} style={styles.editorBlock}>
          <TextField
            label="Label"
            maxLength={60}
            onChangeText={(label) => onChange(updateLink(visibleLinks, index, { label }))}
            placeholder="Newsletter"
            value={link.label}
          />
          <TextField
            autoCapitalize="none"
            inputMode="url"
            label="URL"
            onChangeText={(url) => onChange(updateLink(visibleLinks, index, { url }))}
            placeholder="https://"
            value={link.url}
          />
          <ReorderRow
            canDown={index < visibleLinks.length - 1}
            canUp={index > 0}
            onDelete={() => onChange(visibleLinks.filter((_, itemIndex) => itemIndex !== index))}
            onDown={() => onChange(move(visibleLinks, index, index + 1))}
            onUp={() => onChange(move(visibleLinks, index, index - 1))}
          />
        </View>
      ))}
      <Button
        label="Add another link"
        onPress={() =>
          onChange([
            ...visibleLinks,
            {
              id: `new-${Date.now()}`,
              label: '',
              url: '',
              iconKey: 'link',
              displayOrder: visibleLinks.length,
            },
          ])
        }
        variant="secondary"
      />
    </FormSection>
  );
}

function ReorderRow({
  canDown,
  canUp,
  onDelete,
  onDown,
  onUp,
}: {
  canDown: boolean;
  canUp: boolean;
  onDelete: () => void;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <View style={styles.reorder}>
      <IconButton disabled={!canUp} icon="arrow-up" label="Move up" onPress={onUp} />
      <IconButton disabled={!canDown} icon="arrow-down" label="Move down" onPress={onDown} />
      <View style={styles.spacer} />
      <IconButton danger icon="trash-outline" label="Delete" onPress={onDelete} />
    </View>
  );
}

function IconButton({
  danger,
  disabled,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabled]}>
      <Ionicons color={danger ? theme.colors.danger : theme.colors.text} name={icon} size={20} />
    </Pressable>
  );
}

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function updateLink(items: CustomProfileLink[], index: number, patch: Partial<CustomProfileLink>) {
  return updateAt(items, index, patch);
}

function shapeRadius(shape: ProfilePolish['theme']['cardShape']) {
  if (shape === 'pill') return 28;
  if (shape === 'squared') return 8;
  return 18;
}

const accentColors = {
  purple: '#6843F4',
  blue: '#1769E0',
  green: '#147A4B',
  rose: '#B52B62',
  charcoal: '#252730',
};

const styles = StyleSheet.create({
  banner: {
    aspectRatio: 3,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    width: '100%',
  },
  fill: { height: '100%', width: '100%' },
  bannerDefault: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    flex: 1,
    justifyContent: 'center',
  },
  bannerMark: { color: theme.colors.accentStrong, fontSize: 42, fontWeight: '900' },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  fieldLabel: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  swatches: { flexDirection: 'row', gap: theme.spacing.md },
  swatch: {
    borderColor: theme.colors.white,
    borderRadius: 22,
    borderWidth: 3,
    height: theme.layout.minTouchTarget,
    width: theme.layout.minTouchTarget,
  },
  swatchSelected: { outlineColor: theme.colors.text, outlineStyle: 'solid', outlineWidth: 2 },
  preview: { gap: theme.spacing.sm },
  previewEyebrow: { color: theme.colors.muted, fontSize: theme.typography.tiny, fontWeight: '800' },
  previewName: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: '800' },
  previewNameBold: { fontSize: theme.typography.title, fontWeight: '900' },
  editorBlock: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  textArea: { minHeight: 88, paddingTop: theme.spacing.md },
  itemType: { color: theme.colors.accentStrong, fontSize: theme.typography.tiny, fontWeight: '900', textTransform: 'uppercase' },
  portfolioPreview: { aspectRatio: 16 / 9, borderRadius: theme.radii.sm, width: '100%' },
  reorder: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  iconButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  spacer: { flex: 1 },
  disabled: { opacity: 0.35 },
});
