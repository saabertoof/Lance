import {
  compensationTypeOptions,
  opportunityCategoryOptions,
  opportunityExperienceOptions,
  ratePeriodOptions,
  timeCommitmentOptions,
  workArrangementOptions,
  workTypeOptions,
  type CompensationType,
  type OpportunityCategory,
  type OpportunityExperience,
  type RatePeriod,
  type TimeCommitment,
  type WorkArrangement,
  type WorkType,
} from '../../../src/types/opportunity.ts';

export type MagicOpportunityDraftV1 = {
  additional_requirements: string;
  category: OpportunityCategory;
  compensation_max: string;
  compensation_min: string;
  compensation_notes: string;
  compensation_type: CompensationType;
  currency: string;
  experience_level: OpportunityExperience;
  expiration_date: string;
  expected_start_date: string;
  full_description: string;
  industry: string;
  location_country: string;
  location_label: string;
  location_region: string;
  people_needed: string;
  portfolio_required: boolean;
  rate_period: RatePeriod | '';
  share_caption: string;
  share_hook: string;
  short_summary: string;
  skills: string[];
  time_commitment: TimeCommitment;
  title: string;
  workplace: WorkArrangement;
  work_type: WorkType;
};

const categories = opportunityCategoryOptions.map((option) => option.value) as
  readonly OpportunityCategory[];
const workTypes = workTypeOptions.map((option) => option.value) as
  readonly WorkType[];
const compensationTypes = compensationTypeOptions.map((option) => option.value) as
  readonly CompensationType[];
const ratePeriods = ['', ...ratePeriodOptions.map((option) => option.value)] as
  readonly (RatePeriod | '')[];
const workplaces = workArrangementOptions.map((option) => option.value) as
  readonly WorkArrangement[];
const timeCommitments = timeCommitmentOptions.map((option) => option.value) as
  readonly TimeCommitment[];
const experienceLevels = opportunityExperienceOptions.map((option) => option.value) as
  readonly OpportunityExperience[];

export const magicOpportunityDraftJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'additional_requirements',
    'category',
    'compensation_max',
    'compensation_min',
    'compensation_notes',
    'compensation_type',
    'currency',
    'experience_level',
    'expiration_date',
    'expected_start_date',
    'full_description',
    'industry',
    'location_country',
    'location_label',
    'location_region',
    'people_needed',
    'portfolio_required',
    'rate_period',
    'share_caption',
    'share_hook',
    'short_summary',
    'skills',
    'time_commitment',
    'title',
    'work_type',
    'workplace',
  ],
  properties: {
    additional_requirements: boundedString(0, 1200),
    category: { type: 'string', enum: categories },
    compensation_max: numericString(),
    compensation_min: numericString(),
    compensation_notes: boundedString(0, 500),
    compensation_type: { type: 'string', enum: compensationTypes },
    currency: {
      type: 'string',
      pattern: '^[A-Z]{3}$',
      description: 'Three-letter currency code such as USD, GBP, EUR.',
    },
    experience_level: { type: 'string', enum: experienceLevels },
    expiration_date: dateString(),
    expected_start_date: dateString(),
    full_description: boundedString(20, 1800),
    industry: boundedString(1, 80),
    location_country: {
      type: 'string',
      maxLength: 2,
      pattern: '^$|^[A-Z]{2}$',
    },
    location_label: boundedString(0, 90),
    location_region: boundedString(0, 32),
    people_needed: numericString(),
    portfolio_required: { type: 'boolean' },
    rate_period: { type: 'string', enum: ratePeriods },
    share_caption: boundedString(0, 180),
    share_hook: boundedString(0, 80),
    short_summary: boundedString(10, 180),
    skills: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: boundedString(1, 50),
    },
    time_commitment: { type: 'string', enum: timeCommitments },
    title: boundedString(3, 120),
    workplace: { type: 'string', enum: workplaces },
    work_type: { type: 'string', enum: workTypes },
  },
} as const;

export function validateMagicOpportunityDraft(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const draft: MagicOpportunityDraftV1 = {
    additional_requirements: cleanString(record.additional_requirements, 1200),
    category: enumValue(record.category, categories, 'content_creation'),
    compensation_max: cleanMoney(record.compensation_max),
    compensation_min: cleanMoney(record.compensation_min),
    compensation_notes: cleanString(record.compensation_notes, 500),
    compensation_type: enumValue(
      record.compensation_type,
      compensationTypes,
      'negotiable',
    ),
    currency: cleanCurrency(record.currency),
    experience_level: enumValue(
      record.experience_level,
      experienceLevels,
      'any_level',
    ),
    expiration_date: cleanDate(record.expiration_date),
    expected_start_date: cleanDate(record.expected_start_date),
    full_description: cleanString(record.full_description, 1800),
    industry: cleanString(record.industry, 80) || 'Creator Economy',
    location_country: cleanCountry(record.location_country),
    location_label: cleanString(record.location_label, 90),
    location_region: cleanString(record.location_region, 32).toUpperCase(),
    people_needed: cleanWholeNumber(record.people_needed, '1'),
    portfolio_required: record.portfolio_required === true,
    rate_period: enumValue(record.rate_period, ratePeriods, ''),
    share_caption: cleanString(record.share_caption, 180),
    share_hook: cleanString(record.share_hook, 80),
    short_summary: cleanString(record.short_summary, 180),
    skills: cleanStringArray(record.skills, 8, 50),
    time_commitment: enumValue(
      record.time_commitment,
      timeCommitments,
      'flexible',
    ),
    title: cleanString(record.title, 120),
    workplace: enumValue(record.workplace, workplaces, 'remote'),
    work_type: enumValue(record.work_type, workTypes, 'one_time_project'),
  };

  if (
    draft.title.length < 3 ||
    draft.short_summary.length < 10 ||
    draft.full_description.length < 20 ||
    draft.skills.length === 0
  ) {
    return null;
  }

  return draft;
}

function boundedString(minLength: number, maxLength: number) {
  return { type: 'string', minLength, maxLength };
}

function numericString() {
  return {
    type: 'string',
    maxLength: 12,
    pattern: '^$|^\\d+(?:\\.\\d{1,2})?$',
  };
}

function dateString() {
  return {
    type: 'string',
    maxLength: 10,
    pattern: '^$|^\\d{4}-\\d{2}-\\d{2}$',
  };
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
    : '';
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Map(
      value
        .map((item) => cleanString(item, maxLength))
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item] as const),
    ).values(),
  ].slice(0, maxItems);
}

function cleanMoney(value: unknown) {
  const text = cleanString(value, 12).replace(/,/g, '');
  return /^\d+(?:\.\d{1,2})?$/.test(text) ? text : '';
}

function cleanWholeNumber(value: unknown, fallback: string) {
  const text = cleanString(value, 3).replace(/\D/g, '');
  if (!text) return fallback;
  const number = Number(text);
  return number > 0 && number <= 99 ? String(number) : fallback;
}

function cleanCurrency(value: unknown) {
  const text = cleanString(value, 3).toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : 'USD';
}

function cleanCountry(value: unknown) {
  const text = cleanString(value, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(text) ? text : '';
}

function cleanDate(value: unknown) {
  const text = cleanString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function enumValue<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
) {
  return typeof value === 'string' && options.includes(value as T)
    ? value as T
    : fallback;
}
