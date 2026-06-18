import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  PortfolioCarousel,
  ProfileSocialLinks,
  recognizedSocialPlatform,
} from '@/components/profile';
import { SaveButton } from '@/components/saved';
import { Chip, LoadingState, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSaved } from '@/context/SavedContext';
import { formatDiscoveryError, loadPublicProfile } from '@/lib/discovery';
import {
  availabilityOptions,
  experienceOptions,
  getOptionLabel,
  opportunityInterestOptions,
  remotePreferenceOptions,
  type PublicProfile,
} from '@/types/profile';
import { currentIntentOptions, profilePromptOptions } from '@/types/profilePolish';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isProfileSaved, setProfileSaved } = useSaved();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadPublicProfile(id)
      .then((result) => active && setProfile(result))
      .catch((loadError) => active && setError(formatDiscoveryError(loadError)))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <LoadingState message="Loading profile" />;
  if (!profile) {
    return (
      <Screen centered>
        <Text style={styles.error}>{error ?? 'This profile is unavailable.'}</Text>
      </Screen>
    );
  }

  const polish = profile.polish;
  const accent = accentColors[polish.theme.accent];
  const radius = shapeRadius(polish.theme.cardShape);
  const isOwnProfile = profile.id === user?.id;
  const saved = isProfileSaved(profile.id);
  const initials = initialsFor(profile.displayName);

  return (
    <Screen
      scroll
      style={{ backgroundColor: profileBackground(polish.theme.background) }}
      contentStyle={styles.screen}>
      <View style={styles.banner}>
        {polish.bannerUrl ? (
          <Image contentFit="cover" source={polish.bannerUrl} style={styles.fill} />
        ) : (
          <View style={[styles.defaultBanner, { backgroundColor: `${accent}18` }]}>
            <View style={[styles.bannerLine, { backgroundColor: accent }]} />
          </View>
        )}
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.overlayButton}>
            <Ionicons color={theme.colors.text} name="arrow-back" size={22} />
          </Pressable>
          {isOwnProfile ? (
            <Pressable accessibilityLabel="Edit profile" onPress={() => router.push('/profile/edit')} style={styles.overlayButton}>
              <Ionicons color={theme.colors.text} name="create-outline" size={21} />
            </Pressable>
          ) : (
            <SaveButton isSaved={saved} onPress={() => void setProfileSaved(profile.id, !saved)} />
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.identity, polish.theme.headerAlignment === 'center' && styles.centered]}>
          <View style={[styles.avatar, { borderColor: theme.colors.surface }]}>
            {profile.avatarUrl ? (
              <Image contentFit="cover" source={profile.avatarUrl} style={styles.fill} />
            ) : (
              <Text style={[styles.initials, { color: accent }]}>{initials}</Text>
            )}
          </View>
          <Text
            style={[
              styles.name,
              polish.theme.template === 'bold' && styles.boldName,
              polish.theme.headerAlignment === 'center' && styles.centerText,
            ]}>
            {profile.displayName}
          </Text>
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={[styles.headline, polish.theme.headerAlignment === 'center' && styles.centerText]}>
            {profile.headline}
          </Text>
          <View style={[styles.meta, polish.theme.headerAlignment === 'center' && styles.centerWrap]}>
            {[profile.primaryRole, polish.location?.label ?? profile.city].filter(Boolean).map((value) => (
              <Text key={value} style={styles.metaText}>{value}</Text>
            ))}
          </View>
          <View style={[styles.chips, polish.theme.headerAlignment === 'center' && styles.centerWrap]}>
            <Chip accent label={getOptionLabel(availabilityOptions, profile.availability)} />
            <Chip label={getOptionLabel(remotePreferenceOptions, profile.remotePreference)} />
          </View>
          {polish.currentIntents.length > 0 ? (
            <View style={[styles.chips, polish.theme.headerAlignment === 'center' && styles.centerWrap]}>
              {polish.currentIntents.map((intent) => (
                <View key={intent} style={[styles.intent, { borderColor: `${accent}55` }]}>
                  <Text style={[styles.intentText, { color: accent }]}>
                    {currentIntentOptions.find((option) => option.value === intent)?.label ?? intent}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {profile.links.length > 0 || polish.customLinks.some((link) => recognizedSocialPlatform(link.url)) ? (
            <ProfileSocialLinks
              customLinks={polish.customLinks}
              links={profile.links}
              onError={setError}
            />
          ) : null}
        </View>

        {polish.portfolio.length > 0 ? (
          <Section title="Portfolio">
            <PortfolioCarousel
              accent={accent}
              items={polish.portfolio}
              onError={setError}
              radius={radius}
            />
          </Section>
        ) : isOwnProfile ? (
          <Pressable onPress={() => router.push('/profile/edit')} style={[styles.ownerEmpty, { borderRadius: radius }]}>
            <Ionicons color={accent} name="images-outline" size={24} />
            <Text style={styles.ownerEmptyTitle}>Add proof of work</Text>
            <Text style={styles.ownerEmptyBody}>Images and project links make your profile more credible.</Text>
          </Pressable>
        ) : null}

        {polish.prompts.length > 0 ? (
          <Section title="Right now">
            <View style={styles.promptGrid}>
              {polish.prompts.map((prompt) => (
                <View key={prompt.id} style={[styles.prompt, { borderRadius: radius }]}>
                  <Text style={[styles.promptLabel, { color: accent }]}>
                    {profilePromptOptions.find((option) => option.value === prompt.promptKey)?.label ?? prompt.promptKey}
                  </Text>
                  <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {profile.bio ? (
          <Section title="About"><Text style={styles.bodyText}>{profile.bio}</Text></Section>
        ) : null}

        {profile.skills.length > 0 ? (
          <Section title="Skills">
            <View style={styles.chips}>{profile.skills.map((skill) => <Chip key={skill.toLowerCase()} label={skill} />)}</View>
          </Section>
        ) : null}

        <Section title="Experience">
          <Detail label="Level" value={getOptionLabel(experienceOptions, profile.experienceLevel)} />
          {profile.industryExperience.length > 0 ? (
            <View style={styles.chips}>{profile.industryExperience.map((industry) => <Chip key={industry.toLowerCase()} label={industry} />)}</View>
          ) : null}
        </Section>

        {profile.opportunityInterests.length > 0 ? (
          <Section title="Open to">
            <View style={styles.chips}>
              {profile.opportunityInterests.map((interest) => (
                <Chip accent key={interest} label={getOptionLabel(opportunityInterestOptions, interest)} />
              ))}
            </View>
          </Section>
        ) : null}

        {polish.customLinks.some((link) => !recognizedSocialPlatform(link.url)) ? (
          <Section title="Other links">
            {polish.customLinks.filter((link) => !recognizedSocialPlatform(link.url)).map((link) => (
              <Pressable
                accessibilityRole="link"
                key={link.id}
                onPress={() => void openCustomLink(link.url, setError)}
                style={({ pressed }) => [
                  styles.customLink,
                  { borderRadius: radius },
                  pressed && styles.pressed,
                ]}>
                <Ionicons color={accent} name="link-outline" size={20} />
                <View style={styles.linkCopy}>
                  <Text style={styles.linkLabel}>{link.label}</Text>
                  <Text numberOfLines={1} style={styles.linkHost}>{safeHost(link.url)}</Text>
                </View>
                <Ionicons color={theme.colors.muted} name="open-outline" size={18} />
              </Pressable>
            ))}
          </Section>
        ) : null}

        {!isOwnProfile ? (
          <Text style={styles.privateNote}>Saving is private and does not notify this person or express interest.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Screen>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

async function openCustomLink(url: string, onError: (message: string) => void) {
  try {
    if (!url.startsWith('https://') || !(await Linking.canOpenURL(url))) throw new Error();
    await Linking.openURL(url);
  } catch {
    onError('This link could not be opened safely.');
  }
}

function safeHost(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function initialsFor(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'L';
}

function shapeRadius(shape: PublicProfile['polish']['theme']['cardShape']) {
  if (shape === 'pill') return 28;
  if (shape === 'squared') return 8;
  return 18;
}

function profileBackground(background: PublicProfile['polish']['theme']['background']) {
  if (background === 'soft_gradient') return '#FAF8FF';
  if (background === 'banner_led') return '#FCFCFE';
  return theme.colors.background;
}

const accentColors = { purple: '#6843F4', blue: '#1769E0', green: '#147A4B', rose: '#B52B62', charcoal: '#252730' };

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0 },
  banner: { height: 176, position: 'relative' },
  fill: { height: '100%', width: '100%' },
  defaultBanner: { flex: 1, justifyContent: 'flex-end' },
  bannerLine: { height: 5, width: '100%' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', left: 20, position: 'absolute', right: 20, top: 16 },
  overlayButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  body: { gap: theme.spacing.xxl, paddingBottom: theme.spacing.xxxl, paddingHorizontal: theme.layout.screenPadding },
  identity: { alignItems: 'flex-start', gap: theme.spacing.sm },
  centered: { alignItems: 'center' },
  avatar: { alignItems: 'center', backgroundColor: theme.colors.accentSoft, borderRadius: 54, borderWidth: 5, height: 108, justifyContent: 'center', marginTop: -54, overflow: 'hidden', width: 108 },
  initials: { fontSize: theme.typography.title, fontWeight: '900' },
  name: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: '900' },
  boldName: { fontSize: 32 },
  centerText: { textAlign: 'center' },
  username: { color: theme.colors.muted, fontSize: theme.typography.small },
  headline: { color: theme.colors.textSoft, fontSize: theme.typography.body, fontWeight: '600', lineHeight: 24, maxWidth: 430 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  metaText: { color: theme.colors.muted, fontSize: theme.typography.small },
  centerWrap: { justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  intent: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill, borderWidth: 1, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  intentText: { fontSize: theme.typography.tiny, fontWeight: '800' },
  section: { gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.subheading, fontWeight: '900' },
  promptGrid: { gap: theme.spacing.md },
  prompt: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, gap: theme.spacing.sm, padding: theme.spacing.lg },
  promptLabel: { fontSize: theme.typography.small, fontWeight: '900' },
  promptAnswer: { color: theme.colors.textSoft, fontSize: theme.typography.body, lineHeight: 24 },
  bodyText: { color: theme.colors.textSoft, fontSize: theme.typography.body, lineHeight: 25 },
  detail: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: theme.colors.muted, fontSize: theme.typography.small },
  detailValue: { color: theme.colors.text, fontSize: theme.typography.small, fontWeight: '800' },
  customLink: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md, minHeight: 64, paddingHorizontal: theme.spacing.lg },
  linkCopy: { flex: 1 },
  linkLabel: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '800' },
  linkHost: { color: theme.colors.muted, fontSize: theme.typography.tiny, marginTop: 2 },
  ownerEmpty: { alignItems: 'center', borderColor: theme.colors.border, borderStyle: 'dashed', borderWidth: 1, gap: theme.spacing.sm, padding: theme.spacing.xl },
  ownerEmptyTitle: { color: theme.colors.text, fontSize: theme.typography.body, fontWeight: '900' },
  ownerEmptyBody: { color: theme.colors.muted, fontSize: theme.typography.small, textAlign: 'center' },
  privateNote: { color: theme.colors.muted, fontSize: theme.typography.tiny, lineHeight: 18, textAlign: 'center' },
  error: { color: theme.colors.danger, fontSize: theme.typography.small, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
