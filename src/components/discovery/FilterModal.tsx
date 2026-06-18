import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FormSection,
  MultiSelectChips,
  SingleSelectChips,
  TagInput,
} from '@/components/profile';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import {
  businessRemoteOptions,
  businessSizeOptions,
  businessTypeOptions,
  industryOptions,
} from '@/types/business';
import {
  BusinessFilters,
  emptyBusinessFilters,
  emptyOpportunityFilters,
  emptyPeopleFilters,
  OpportunityFilters,
  PeopleFilters,
  SearchMode,
} from '@/types/discovery';
import {
  compensationTypeOptions,
  opportunityCategoryOptions,
  opportunityExperienceOptions,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
} from '@/types/opportunity';
import {
  availabilityOptions,
  experienceOptions,
  opportunityInterestOptions,
  remotePreferenceOptions,
  roleOptions,
} from '@/types/profile';

type FilterModalProps = {
  businessFilters: BusinessFilters;
  mode: SearchMode;
  onApplyBusiness: (filters: BusinessFilters) => void;
  onApplyOpportunity: (filters: OpportunityFilters) => void;
  onApplyPeople: (filters: PeopleFilters) => void;
  onClose: () => void;
  opportunityFilters: OpportunityFilters;
  peopleFilters: PeopleFilters;
  skillOptions: string[];
  visible: boolean;
};

export function FilterModal({
  businessFilters,
  mode,
  onApplyBusiness,
  onApplyOpportunity,
  onApplyPeople,
  onClose,
  opportunityFilters,
  peopleFilters,
  skillOptions,
  visible,
}: FilterModalProps) {
  const [peopleDraft, setPeopleDraft] = useState(peopleFilters);
  const [opportunityDraft, setOpportunityDraft] = useState(opportunityFilters);
  const [businessDraft, setBusinessDraft] = useState(businessFilters);
  const [skillQuery, setSkillQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPeopleDraft(clonePeopleFilters(peopleFilters));
    setOpportunityDraft(cloneOpportunityFilters(opportunityFilters));
    setBusinessDraft({ ...businessFilters });
    setSkillQuery('');
  }, [businessFilters, opportunityFilters, peopleFilters, visible]);

  const filteredSkills = useMemo(() => {
    const normalized = skillQuery.trim().toLowerCase();
    const selected =
      mode === 'people' ? peopleDraft.skills : opportunityDraft.skills;
    const candidates = normalized
      ? skillOptions.filter((skill) => skill.toLowerCase().includes(normalized))
      : skillOptions;

    return [...new Set([...selected, ...candidates])].slice(0, 40);
  }, [mode, opportunityDraft.skills, peopleDraft.skills, skillOptions, skillQuery]);

  function apply() {
    if (mode === 'people') onApplyPeople(peopleDraft);
    else if (mode === 'opportunities') onApplyOpportunity(opportunityDraft);
    else onApplyBusiness(businessDraft);
    onClose();
  }

  function clear() {
    if (mode === 'people') setPeopleDraft(clonePeopleFilters(emptyPeopleFilters));
    else if (mode === 'opportunities') {
      setOpportunityDraft(cloneOpportunityFilters(emptyOpportunityFilters));
    } else {
      setBusinessDraft({ ...emptyBusinessFilters });
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{modeLabels[mode]} filters</Text>
            <Text style={styles.subtitle}>Choose only what matters right now.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close filters"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.iconButton}>
            <Ionicons color={theme.colors.text} name="close" size={24} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {mode === 'people' ? (
            <PeopleFilterFields
              draft={peopleDraft}
              filteredSkills={filteredSkills}
              onChange={setPeopleDraft}
              onSkillQueryChange={setSkillQuery}
              skillQuery={skillQuery}
            />
          ) : null}
          {mode === 'opportunities' ? (
            <OpportunityFilterFields
              draft={opportunityDraft}
              filteredSkills={filteredSkills}
              onChange={setOpportunityDraft}
              onSkillQueryChange={setSkillQuery}
              skillQuery={skillQuery}
            />
          ) : null}
          {mode === 'businesses' ? (
            <BusinessFilterFields draft={businessDraft} onChange={setBusinessDraft} />
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Button label="Clear all" onPress={clear} variant="ghost" />
          <Button label="Apply filters" onPress={apply} style={styles.apply} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function PeopleFilterFields({
  draft,
  filteredSkills,
  onChange,
  onSkillQueryChange,
  skillQuery,
}: {
  draft: PeopleFilters;
  filteredSkills: string[];
  onChange: (filters: PeopleFilters) => void;
  onSkillQueryChange: (value: string) => void;
  skillQuery: string;
}) {
  return (
    <>
      <FormSection title="Primary role">
        <SingleSelectChips
          onChange={(primaryRole) => onChange({ ...draft, primaryRole })}
          options={[
            { label: 'Any role', value: '' },
            ...roleOptions.map((role) => ({ label: role, value: role })),
          ]}
          selected={draft.primaryRole}
        />
      </FormSection>
      <SkillFilter
        filteredSkills={filteredSkills}
        onChange={(skills) => onChange({ ...draft, skills })}
        onQueryChange={onSkillQueryChange}
        query={skillQuery}
        selected={draft.skills}
      />
      <FormSection title="Experience level">
        <SingleSelectChips
          onChange={(experienceLevel) => onChange({ ...draft, experienceLevel })}
          options={[{ label: 'Any level', value: '' }, ...experienceOptions]}
          selected={draft.experienceLevel}
        />
      </FormSection>
      <FormSection title="Availability">
        <SingleSelectChips
          onChange={(availability) => onChange({ ...draft, availability })}
          options={[{ label: 'Any availability', value: '' }, ...availabilityOptions]}
          selected={draft.availability}
        />
      </FormSection>
      <TextField
        label="General location"
        onChangeText={(location) => onChange({ ...draft, location })}
        placeholder="Chicago or Midwest"
        value={draft.location}
      />
      <FormSection title="Remote preference">
        <SingleSelectChips
          onChange={(remotePreference) => onChange({ ...draft, remotePreference })}
          options={[{ label: 'Any preference', value: '' }, ...remotePreferenceOptions]}
          selected={draft.remotePreference}
        />
      </FormSection>
      <FormSection
        description="Matches any selected opportunity interest."
        title="Opportunity interests">
        <MultiSelectChips
          onChange={(opportunityInterests) =>
            onChange({ ...draft, opportunityInterests })
          }
          options={opportunityInterestOptions}
          selected={draft.opportunityInterests}
        />
      </FormSection>
      <TagInput
        label="Industry experience"
        onChange={(industryExperience) => onChange({ ...draft, industryExperience })}
        placeholder="Add an industry"
        values={draft.industryExperience}
      />
    </>
  );
}

function OpportunityFilterFields({
  draft,
  filteredSkills,
  onChange,
  onSkillQueryChange,
  skillQuery,
}: {
  draft: OpportunityFilters;
  filteredSkills: string[];
  onChange: (filters: OpportunityFilters) => void;
  onSkillQueryChange: (value: string) => void;
  skillQuery: string;
}) {
  const industries = industryOptions.map((industry) => ({
    label: industry,
    value: industry,
  }));

  return (
    <>
      <FormSection title="Category">
        <SingleSelectChips
          onChange={(category) => onChange({ ...draft, category })}
          options={[{ label: 'Any category', value: '' }, ...opportunityCategoryOptions]}
          selected={draft.category}
        />
      </FormSection>
      <SkillFilter
        filteredSkills={filteredSkills}
        onChange={(skills) => onChange({ ...draft, skills })}
        onQueryChange={onSkillQueryChange}
        query={skillQuery}
        selected={draft.skills}
      />
      <FormSection title="Industry">
        <SingleSelectChips
          onChange={(industry) => onChange({ ...draft, industry })}
          options={[{ label: 'Any industry', value: '' }, ...industries]}
          selected={draft.industry}
        />
      </FormSection>
      <FormSection title="Compensation">
        <SingleSelectChips
          onChange={(compensationType) => onChange({ ...draft, compensationType })}
          options={[
            { label: 'Any compensation', value: '' },
            ...compensationTypeOptions,
          ]}
          selected={draft.compensationType}
        />
        <BooleanFilter
          checked={draft.paidOnly}
          label="Clearly paid only"
          onPress={() => onChange({ ...draft, paidOnly: !draft.paidOnly })}
        />
      </FormSection>
      <FormSection title="Work type">
        <SingleSelectChips
          onChange={(workType) => onChange({ ...draft, workType })}
          options={[{ label: 'Any work type', value: '' }, ...workTypeOptions]}
          selected={draft.workType}
        />
      </FormSection>
      <FormSection title="Work arrangement">
        <SingleSelectChips
          onChange={(workplace) => onChange({ ...draft, workplace })}
          options={[{ label: 'Any arrangement', value: '' }, ...workArrangementOptions]}
          selected={draft.workplace}
        />
      </FormSection>
      <FormSection title="Time commitment">
        <SingleSelectChips
          onChange={(timeCommitment) => onChange({ ...draft, timeCommitment })}
          options={[{ label: 'Any commitment', value: '' }, ...timeCommitmentOptions]}
          selected={draft.timeCommitment}
        />
      </FormSection>
      <FormSection title="Experience level">
        <SingleSelectChips
          onChange={(experienceLevel) => onChange({ ...draft, experienceLevel })}
          options={[{ label: 'Any level', value: '' }, ...opportunityExperienceOptions]}
          selected={draft.experienceLevel}
        />
      </FormSection>
      <TextField
        label="General location"
        onChangeText={(location) => onChange({ ...draft, location })}
        placeholder="Chicago or Midwest"
        value={draft.location}
      />
    </>
  );
}

function BusinessFilterFields({
  draft,
  onChange,
}: {
  draft: BusinessFilters;
  onChange: (filters: BusinessFilters) => void;
}) {
  const industries = industryOptions.map((industry) => ({
    label: industry,
    value: industry,
  }));

  return (
    <>
      <FormSection title="Business or project type">
        <SingleSelectChips
          onChange={(businessType) => onChange({ ...draft, businessType })}
          options={[{ label: 'Any type', value: '' }, ...businessTypeOptions]}
          selected={draft.businessType}
        />
      </FormSection>
      <FormSection title="Size">
        <SingleSelectChips
          onChange={(businessSize) => onChange({ ...draft, businessSize })}
          options={[{ label: 'Any size', value: '' }, ...businessSizeOptions]}
          selected={draft.businessSize}
        />
      </FormSection>
      <FormSection title="Industry">
        <SingleSelectChips
          onChange={(industry) => onChange({ ...draft, industry })}
          options={[{ label: 'Any industry', value: '' }, ...industries]}
          selected={draft.industry}
        />
      </FormSection>
      <TextField
        label="General location"
        onChangeText={(location) => onChange({ ...draft, location })}
        placeholder="Chicago or Midwest"
        value={draft.location}
      />
      <FormSection title="Remote status">
        <SingleSelectChips
          onChange={(remoteStatus) => onChange({ ...draft, remoteStatus })}
          options={[{ label: 'Any status', value: '' }, ...businessRemoteOptions]}
          selected={draft.remoteStatus}
        />
      </FormSection>
      <BooleanFilter
        checked={draft.hasActiveOpportunities}
        label="Has active published opportunities"
        onPress={() =>
          onChange({
            ...draft,
            hasActiveOpportunities: !draft.hasActiveOpportunities,
          })
        }
      />
    </>
  );
}

function SkillFilter({
  filteredSkills,
  onChange,
  onQueryChange,
  query,
  selected,
}: {
  filteredSkills: string[];
  onChange: (skills: string[]) => void;
  onQueryChange: (value: string) => void;
  query: string;
  selected: string[];
}) {
  return (
    <FormSection description="Matches any selected normalized skill." title="Skills">
      <View style={styles.skillSearch}>
        <Ionicons color={theme.colors.muted} name="search-outline" size={19} />
        <TextInput
          onChangeText={onQueryChange}
          placeholder="Find a skill"
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.skillInput}
          value={query}
        />
      </View>
      <MultiSelectChips
        onChange={onChange}
        options={filteredSkills.map((skill) => ({ label: skill, value: skill }))}
        selected={selected}
      />
      {filteredSkills.length === 0 ? (
        <Text style={styles.noSkills}>No normalized skills match that search.</Text>
      ) : null}
    </FormSection>
  );
}

function BooleanFilter({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.booleanRow, pressed && styles.pressed]}>
      <View style={[styles.checkbox, checked && styles.checked]}>
        {checked ? <Ionicons color={theme.colors.white} name="checkmark" size={17} /> : null}
      </View>
      <Text style={styles.booleanLabel}>{label}</Text>
    </Pressable>
  );
}

function clonePeopleFilters(filters: PeopleFilters): PeopleFilters {
  return {
    ...filters,
    skills: [...filters.skills],
    opportunityInterests: [...filters.opportunityInterests],
    industryExperience: [...filters.industryExperience],
  };
}

function cloneOpportunityFilters(filters: OpportunityFilters): OpportunityFilters {
  return { ...filters, skills: [...filters.skills] };
}

const modeLabels: Record<SearchMode, string> = {
  people: 'People',
  opportunities: 'Opportunity',
  businesses: 'Business',
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    marginTop: theme.spacing.xs,
  },
  iconButton: {
    alignItems: 'center',
    height: theme.layout.minTouchTarget,
    justifyContent: 'center',
    width: theme.layout.minTouchTarget,
  },
  content: {
    gap: theme.spacing.xxl,
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  actions: {
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.md,
  },
  apply: {
    flex: 1,
  },
  skillSearch: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.inputHeight,
    paddingHorizontal: theme.spacing.md,
  },
  skillInput: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    minHeight: theme.layout.inputHeight,
  },
  noSkills: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  booleanRow: {
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
  checked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  booleanLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
