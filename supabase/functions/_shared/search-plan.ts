export const SEARCH_PLAN_SCHEMA_VERSION = 1 as const;
export const SEARCH_PLAN_TARGETS = ['people', 'jobs', 'businesses'] as const;
export const SEARCH_PLAN_SORTS = ['relevance', 'newest'] as const;

export const PEOPLE_EXPERIENCE_LEVELS = [
  'just_starting',
  'some_experience',
  'experienced',
  'expert',
] as const;
export const PEOPLE_AVAILABILITY = [
  'few_hours_per_week',
  'hours_5_10',
  'hours_10_20',
  'hours_20_plus',
  'flexible_hours',
] as const;
export const REMOTE_PREFERENCES = [
  'remote',
  'hybrid',
  'in_person',
  'flexible',
] as const;
export const OPPORTUNITY_INTERESTS = [
  'paid_freelance',
  'ongoing_part_time',
  'one_time_project',
  'retainer_work',
  'cofounder',
  'project_collaboration',
  'commission',
  'revenue_share',
  'equity',
  'local_work',
  'remote_work',
  'open_to_discussing',
] as const;
export const CURRENT_INTENTS = [
  'building_startup',
  'looking_for_cofounder',
  'looking_for_collaborators',
  'open_to_freelance',
  'looking_for_internships',
  'looking_for_job',
  'hiring',
  'looking_for_projects',
  'offering_skills',
  'just_networking',
  'offering_mentorship',
  'seeking_mentorship',
] as const;

export const JOB_CATEGORIES = [
  'software_development',
  'web_development',
  'mobile_development',
  'product_design',
  'graphic_design',
  'video_editing',
  'photography',
  'content_creation',
  'social_media',
  'marketing',
  'sales',
  'copywriting',
  'virtual_assistance',
  'community_management',
  'operations',
  'consulting',
  'finance',
  'real_estate',
  'customer_support',
  'other',
] as const;
export const COMPENSATION_TYPES = [
  'hourly',
  'fixed_project',
  'weekly',
  'monthly',
  'retainer',
  'salary',
  'commission',
  'revenue_share',
  'equity',
  'unpaid',
  'negotiable',
  'mixed',
] as const;
export const WORK_TYPES = [
  'one_time_project',
  'ongoing_freelance',
  'part_time',
  'full_time',
  'cofounder',
  'project_collaboration',
  'retainer',
  'internship',
  'commission_based',
  'other',
] as const;
export const WORK_ARRANGEMENTS = [
  'remote',
  'hybrid',
  'in_person',
  'flexible',
] as const;
export const TIME_COMMITMENTS = [
  'under_5_hours',
  'hours_5_10',
  'hours_10_20',
  'hours_20_30',
  'hours_30_plus',
  'flexible',
  'one_time_deliverable',
] as const;
export const JOB_EXPERIENCE_LEVELS = [
  'none_required',
  'beginner',
  'intermediate',
  'experienced',
  'expert',
  'any_level',
] as const;
export const POSTING_IDENTITY_TYPES = ['personal', 'business'] as const;

export const BUSINESS_TYPES = [
  'solo_operator',
  'creator',
  'startup',
  'agency',
  'small_business',
  'local_business',
  'nonprofit',
  'project',
  'community',
  'other',
] as const;
export const BUSINESS_SIZES = [
  'one_person',
  'two_to_ten',
  'eleven_to_fifty',
  'fifty_one_plus',
] as const;
export const BUSINESS_REMOTE_STATUSES = [
  'remote',
  'hybrid',
  'in_person',
  'flexible',
  'not_applicable',
] as const;

export type SearchPlanTarget = (typeof SEARCH_PLAN_TARGETS)[number];
export type SearchPlanSort = (typeof SEARCH_PLAN_SORTS)[number];

export type SearchPlanV1 = {
  schema_version: 1;
  target_type: SearchPlanTarget;
  original_intent_summary: string;
  keywords: string[];
  location_terms: string[];
  sort: SearchPlanSort;
  needs_clarification: boolean;
  clarification_question: string;
  ignored_unsafe_constraints: string[];
  confidence: number;
  people_filters: {
    primary_roles: string[];
    skills: string[];
    industries: string[];
    experience_levels: (typeof PEOPLE_EXPERIENCE_LEVELS)[number][];
    availability: (typeof PEOPLE_AVAILABILITY)[number][];
    remote_preferences: (typeof REMOTE_PREFERENCES)[number][];
    current_intents: (typeof CURRENT_INTENTS)[number][];
    opportunity_interests: (typeof OPPORTUNITY_INTERESTS)[number][];
  };
  job_filters: {
    categories: (typeof JOB_CATEGORIES)[number][];
    required_skills: string[];
    industries: string[];
    compensation_types: (typeof COMPENSATION_TYPES)[number][];
    clearly_paid_only: boolean;
    work_types: (typeof WORK_TYPES)[number][];
    work_arrangements: (typeof WORK_ARRANGEMENTS)[number][];
    time_commitments: (typeof TIME_COMMITMENTS)[number][];
    experience_levels: (typeof JOB_EXPERIENCE_LEVELS)[number][];
    posting_identity_types: (typeof POSTING_IDENTITY_TYPES)[number][];
    newest_only: boolean;
  };
  business_filters: {
    business_types: (typeof BUSINESS_TYPES)[number][];
    business_sizes: (typeof BUSINESS_SIZES)[number][];
    industries: string[];
    remote_statuses: (typeof BUSINESS_REMOTE_STATUSES)[number][];
    has_active_jobs: boolean;
  };
};

type Catalogs = {
  industries: string[];
  locations: { id: string; label: string; search: string }[];
  skills: string[];
};

const rootKeys = [
  'schema_version',
  'target_type',
  'original_intent_summary',
  'keywords',
  'location_terms',
  'sort',
  'needs_clarification',
  'clarification_question',
  'ignored_unsafe_constraints',
  'confidence',
  'people_filters',
  'job_filters',
  'business_filters',
] as const;

const peopleKeys = [
  'primary_roles',
  'skills',
  'industries',
  'experience_levels',
  'availability',
  'remote_preferences',
  'current_intents',
  'opportunity_interests',
] as const;

const jobKeys = [
  'categories',
  'required_skills',
  'industries',
  'compensation_types',
  'clearly_paid_only',
  'work_types',
  'work_arrangements',
  'time_commitments',
  'experience_levels',
  'posting_identity_types',
  'newest_only',
] as const;

const businessKeys = [
  'business_types',
  'business_sizes',
  'industries',
  'remote_statuses',
  'has_active_jobs',
] as const;

function stringArraySchema(maxItems: number, enumValues?: readonly string[]) {
  return {
    type: 'array',
    maxItems,
    items: {
      type: 'string',
      ...(enumValues ? { enum: enumValues } : {}),
    },
  };
}

export const searchPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...rootKeys],
  properties: {
    schema_version: { type: 'integer', enum: [SEARCH_PLAN_SCHEMA_VERSION] },
    target_type: { type: 'string', enum: SEARCH_PLAN_TARGETS },
    original_intent_summary: { type: 'string', maxLength: 180 },
    keywords: stringArraySchema(8),
    location_terms: stringArraySchema(3),
    sort: { type: 'string', enum: SEARCH_PLAN_SORTS },
    needs_clarification: { type: 'boolean' },
    clarification_question: { type: 'string', maxLength: 180 },
    ignored_unsafe_constraints: stringArraySchema(5),
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    people_filters: {
      type: 'object',
      additionalProperties: false,
      required: [...peopleKeys],
      properties: {
        primary_roles: stringArraySchema(1),
        skills: stringArraySchema(8),
        industries: stringArraySchema(4),
        experience_levels: stringArraySchema(1, PEOPLE_EXPERIENCE_LEVELS),
        availability: stringArraySchema(1, PEOPLE_AVAILABILITY),
        remote_preferences: stringArraySchema(1, REMOTE_PREFERENCES),
        current_intents: stringArraySchema(3, CURRENT_INTENTS),
        opportunity_interests: stringArraySchema(4, OPPORTUNITY_INTERESTS),
      },
    },
    job_filters: {
      type: 'object',
      additionalProperties: false,
      required: [...jobKeys],
      properties: {
        categories: stringArraySchema(1, JOB_CATEGORIES),
        required_skills: stringArraySchema(8),
        industries: stringArraySchema(1),
        compensation_types: stringArraySchema(1, COMPENSATION_TYPES),
        clearly_paid_only: { type: 'boolean' },
        work_types: stringArraySchema(1, WORK_TYPES),
        work_arrangements: stringArraySchema(1, WORK_ARRANGEMENTS),
        time_commitments: stringArraySchema(1, TIME_COMMITMENTS),
        experience_levels: stringArraySchema(1, JOB_EXPERIENCE_LEVELS),
        posting_identity_types: stringArraySchema(1, POSTING_IDENTITY_TYPES),
        newest_only: { type: 'boolean' },
      },
    },
    business_filters: {
      type: 'object',
      additionalProperties: false,
      required: [...businessKeys],
      properties: {
        business_types: stringArraySchema(1, BUSINESS_TYPES),
        business_sizes: stringArraySchema(1, BUSINESS_SIZES),
        industries: stringArraySchema(1),
        remote_statuses: stringArraySchema(1, BUSINESS_REMOTE_STATUSES),
        has_active_jobs: { type: 'boolean' },
      },
    },
  },
} as const;

export function createEmptySearchPlan(
  targetType: SearchPlanTarget = 'people',
): SearchPlanV1 {
  return {
    schema_version: SEARCH_PLAN_SCHEMA_VERSION,
    target_type: targetType,
    original_intent_summary: '',
    keywords: [],
    location_terms: [],
    sort: targetType === 'jobs' ? 'newest' : 'relevance',
    needs_clarification: false,
    clarification_question: '',
    ignored_unsafe_constraints: [],
    confidence: 1,
    people_filters: {
      primary_roles: [],
      skills: [],
      industries: [],
      experience_levels: [],
      availability: [],
      remote_preferences: [],
      current_intents: [],
      opportunity_interests: [],
    },
    job_filters: {
      categories: [],
      required_skills: [],
      industries: [],
      compensation_types: [],
      clearly_paid_only: false,
      work_types: [],
      work_arrangements: [],
      time_commitments: [],
      experience_levels: [],
      posting_identity_types: [],
      newest_only: false,
    },
    business_filters: {
      business_types: [],
      business_sizes: [],
      industries: [],
      remote_statuses: [],
      has_active_jobs: false,
    },
  };
}

export function validateSearchPlan(
  value: unknown,
): { data?: SearchPlanV1; error?: string; success: boolean } {
  if (!isExactObject(value, rootKeys)) {
    return { error: 'The search plan has unsupported fields.', success: false };
  }
  const plan = value as Record<string, unknown>;
  if (plan.schema_version !== SEARCH_PLAN_SCHEMA_VERSION) {
    return { error: 'Unsupported search plan version.', success: false };
  }
  if (!isOneOf(plan.target_type, SEARCH_PLAN_TARGETS)) {
    return { error: 'Unsupported search target.', success: false };
  }
  if (
    !boundedString(plan.original_intent_summary, 180) ||
    !boundedStringArray(plan.keywords, 8, 80) ||
    !boundedStringArray(plan.location_terms, 3, 100) ||
    !isOneOf(plan.sort, SEARCH_PLAN_SORTS) ||
    typeof plan.needs_clarification !== 'boolean' ||
    !boundedString(plan.clarification_question, 180) ||
    !boundedStringArray(plan.ignored_unsafe_constraints, 5, 120) ||
    typeof plan.confidence !== 'number' ||
    plan.confidence < 0 ||
    plan.confidence > 1
  ) {
    return { error: 'The search plan contains invalid values.', success: false };
  }

  if (
    !validatePeopleFilters(plan.people_filters) ||
    !validateJobFilters(plan.job_filters) ||
    !validateBusinessFilters(plan.business_filters)
  ) {
    return { error: 'The search plan contains invalid filters.', success: false };
  }

  if (
    plan.needs_clarification === true &&
    String(plan.clarification_question).trim().length < 3
  ) {
    return { error: 'A clarification question is required.', success: false };
  }
  if (containsForbiddenPlanText(value)) {
    return { error: 'The search plan contains unsafe text.', success: false };
  }

  return { data: value as SearchPlanV1, success: true };
}

export function normalizeSearchPlan(
  input: SearchPlanV1,
  catalogs: Catalogs,
): SearchPlanV1 {
  const plan = structuredClone(input);
  plan.original_intent_summary = cleanText(plan.original_intent_summary, 180);
  plan.keywords = uniqueClean(plan.keywords, 8, 80);
  plan.location_terms = normalizeLocations(plan.location_terms, catalogs);
  plan.clarification_question = cleanText(plan.clarification_question, 180);
  plan.ignored_unsafe_constraints = uniqueClean(
    plan.ignored_unsafe_constraints,
    5,
    120,
  );
  plan.people_filters.primary_roles = uniqueClean(
    plan.people_filters.primary_roles,
    1,
    60,
  ).filter((role) => detectProtectedConstraints(role).length === 0);
  plan.people_filters.skills = normalizeCatalogLabels(
    plan.people_filters.skills,
    catalogs.skills,
    skillAliases,
    plan.keywords,
    8,
  );
  plan.people_filters.industries = normalizeCatalogLabels(
    plan.people_filters.industries,
    catalogs.industries,
    industryAliases,
    plan.keywords,
    4,
  );
  plan.job_filters.required_skills = normalizeCatalogLabels(
    plan.job_filters.required_skills,
    catalogs.skills,
    skillAliases,
    plan.keywords,
    8,
  );
  plan.job_filters.industries = normalizeCatalogLabels(
    plan.job_filters.industries,
    catalogs.industries,
    industryAliases,
    plan.keywords,
    1,
  );
  plan.business_filters.industries = normalizeCatalogLabels(
    plan.business_filters.industries,
    catalogs.industries,
    industryAliases,
    plan.keywords,
    1,
  );
  // These remain versioned for later search work but are not executable by
  // Lance's current Phase 4 Search RPCs.
  plan.people_filters.current_intents = [];
  plan.job_filters.posting_identity_types = [];

  const unsafe = detectProtectedConstraints(
    `${plan.original_intent_summary} ${plan.keywords.join(' ')}`,
  );
  plan.ignored_unsafe_constraints = uniqueClean(
    [...plan.ignored_unsafe_constraints, ...unsafe],
    5,
    120,
  );
  plan.keywords = plan.keywords.filter(
    (keyword) => detectProtectedConstraints(keyword).length === 0,
  );

  if (plan.target_type !== 'people') {
    plan.people_filters = createEmptySearchPlan().people_filters;
  }
  if (plan.target_type !== 'jobs') {
    plan.job_filters = createEmptySearchPlan('jobs').job_filters;
  }
  if (plan.target_type !== 'businesses') {
    plan.business_filters =
      createEmptySearchPlan('businesses').business_filters;
  }
  return plan;
}

export function detectProtectedConstraints(query: string) {
  const normalized = normalizeValue(query);
  const matches: string[] = [];
  const rules = [
    {
      label: 'Protected race or ethnicity constraint',
      terms: ['race', 'racial', 'ethnicity', 'ethnic', 'white only', 'black only'],
    },
    {
      label: 'Protected religion constraint',
      terms: [
        'religion',
        'religious',
        'christian',
        'muslim',
        'jewish',
        'hindu',
      ],
    },
    {
      label: 'Protected sex or gender constraint',
      terms: [
        'women only',
        'men only',
        'female only',
        'male only',
        'young women',
        'young men',
        'gender',
        'sexual orientation',
        'transgender',
        'lesbian',
        'gay only',
      ],
    },
    {
      label: 'Protected disability or health constraint',
      terms: ['disabled', 'disability', 'health condition', 'pregnant', 'pregnancy'],
    },
    {
      label: 'Protected age constraint',
      terms: ['young only', 'under 30', 'under 25', 'over 50', 'exact age'],
    },
    {
      label: 'Protected political or union constraint',
      terms: ['political affiliation', 'republican only', 'democrat only', 'union member'],
    },
  ];
  for (const rule of rules) {
    if (rule.terms.some((term) => normalized.includes(normalizeValue(term)))) {
      matches.push(rule.label);
    }
  }
  if (
    /\b(?:black|white|asian|latino|latina|hispanic|native american)\s+(?:developers?|designers?|candidates?|workers?|freelancers?|person|people|talent)\b/.test(
      normalized,
    )
  ) {
    matches.push('Protected race or ethnicity constraint');
  }
  if (
    /\b(?:woman|women|man|men|female|male)\s+(?:developers?|designers?|candidates?|workers?|freelancers?|person|people|talent)\b/.test(
      normalized,
    )
  ) {
    matches.push('Protected sex or gender constraint');
  }
  if (
    /\b(?:age\s*)?\d{1,2}\s*(?:year old|years old)\b/.test(normalized) ||
    /\bage\s+\d{1,2}\b/.test(normalized)
  ) {
    matches.push('Protected age constraint');
  }
  return [...new Set(matches)];
}

export function looksLikePromptInjection(query: string) {
  const normalized = normalizeValue(query);
  return [
    'reveal system prompt',
    'show system prompt',
    'show your instructions',
    'reveal your instructions',
    'system instructions',
    'developer message',
    'ignore previous instructions',
    'ignore developer instructions',
    'api key',
    'secret key',
    'service role key',
    'generate sql',
    'write sql',
    'bypass rls',
    'private data',
  ].some((phrase) => normalized.includes(normalizeValue(phrase)));
}

function validatePeopleFilters(value: unknown) {
  if (!isExactObject(value, peopleKeys)) return false;
  const filters = value as Record<string, unknown>;
  return (
    boundedStringArray(filters.primary_roles, 1, 60) &&
    boundedStringArray(filters.skills, 8, 60) &&
    boundedStringArray(filters.industries, 4, 80) &&
    enumArray(filters.experience_levels, PEOPLE_EXPERIENCE_LEVELS, 1) &&
    enumArray(filters.availability, PEOPLE_AVAILABILITY, 1) &&
    enumArray(filters.remote_preferences, REMOTE_PREFERENCES, 1) &&
    enumArray(filters.current_intents, CURRENT_INTENTS, 3) &&
    enumArray(filters.opportunity_interests, OPPORTUNITY_INTERESTS, 4)
  );
}

function validateJobFilters(value: unknown) {
  if (!isExactObject(value, jobKeys)) return false;
  const filters = value as Record<string, unknown>;
  return (
    enumArray(filters.categories, JOB_CATEGORIES, 1) &&
    boundedStringArray(filters.required_skills, 8, 60) &&
    boundedStringArray(filters.industries, 1, 80) &&
    enumArray(filters.compensation_types, COMPENSATION_TYPES, 1) &&
    typeof filters.clearly_paid_only === 'boolean' &&
    enumArray(filters.work_types, WORK_TYPES, 1) &&
    enumArray(filters.work_arrangements, WORK_ARRANGEMENTS, 1) &&
    enumArray(filters.time_commitments, TIME_COMMITMENTS, 1) &&
    enumArray(filters.experience_levels, JOB_EXPERIENCE_LEVELS, 1) &&
    enumArray(filters.posting_identity_types, POSTING_IDENTITY_TYPES, 1) &&
    typeof filters.newest_only === 'boolean'
  );
}

function validateBusinessFilters(value: unknown) {
  if (!isExactObject(value, businessKeys)) return false;
  const filters = value as Record<string, unknown>;
  return (
    enumArray(filters.business_types, BUSINESS_TYPES, 1) &&
    enumArray(filters.business_sizes, BUSINESS_SIZES, 1) &&
    boundedStringArray(filters.industries, 1, 80) &&
    enumArray(filters.remote_statuses, BUSINESS_REMOTE_STATUSES, 1) &&
    typeof filters.has_active_jobs === 'boolean'
  );
}

function isExactObject(value: unknown, allowedKeys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return (
    keys.length === allowedKeys.length &&
    keys.every((key) => allowedKeys.includes(key))
  );
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.length <= maxLength;
}

function boundedStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => boundedString(item, maxLength))
  );
}

function enumArray(
  value: unknown,
  allowed: readonly string[],
  maxItems: number,
) {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isOneOf(item, allowed))
  );
}

function isOneOf(value: unknown, allowed: readonly string[]) {
  return typeof value === 'string' && allowed.includes(value);
}

function containsForbiddenPlanText(value: unknown): boolean {
  if (typeof value === 'string') {
    return (
      /https?:\/\//i.test(value) ||
      /\b(?:select|insert|update|delete|drop|alter|grant|revoke)\b[\s\S]{0,80}\b(?:from|into|table|set|on)\b/i.test(
        value,
      ) ||
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(
        value,
      ) ||
      /ignore (?:previous|developer|system) instructions|reveal (?:the )?system prompt/i.test(
        value,
      )
    );
  }
  if (Array.isArray(value)) return value.some(containsForbiddenPlanText);
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsForbiddenPlanText);
  }
  return false;
}

function cleanText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function uniqueClean(values: string[], maxItems: number, maxLength: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value, maxLength);
    const normalized = normalizeValue(cleaned);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(cleaned);
    if (result.length >= maxItems) break;
  }
  return result;
}

function normalizeCatalogLabels(
  values: string[],
  catalog: string[],
  aliases: Record<string, string>,
  keywordSink: string[],
  maxItems: number,
) {
  const byNormalized = new Map(
    catalog.map((label) => [normalizeValue(label), label]),
  );
  const result: string[] = [];
  for (const raw of values) {
    const normalized = normalizeValue(raw);
    const aliased = aliases[normalized] ?? normalized;
    const canonical = byNormalized.get(normalizeValue(aliased));
    if (canonical && !result.includes(canonical)) {
      result.push(canonical);
    } else if (raw.trim()) {
      keywordSink.push(cleanText(raw, 80));
    }
    if (result.length >= maxItems) break;
  }
  return result;
}

function normalizeLocations(values: string[], catalogs: Catalogs) {
  const result: string[] = [];
  for (const raw of values) {
    const normalized = normalizeValue(raw);
    const exact = catalogs.locations.find(
      (location) =>
        normalizeValue(location.id) === normalized ||
        normalizeValue(location.label) === normalized,
    );
    const broad =
      exact ??
      catalogs.locations.find((location) =>
        normalizeValue(location.search).includes(normalized),
      );
    result.push(broad?.label ?? cleanText(raw, 100));
    if (result.length >= 3) break;
  }
  return uniqueClean(result, 3, 100);
}

function normalizeValue(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ').trim();
}

const skillAliases: Record<string, string> = {
  'cap cut': 'CapCut',
  clips: 'Clipping',
  'clipping guy': 'Clipping',
  editor: 'Video Editing',
  'socials manager': 'Social Media Marketing',
  socials: 'Social Media Marketing',
  'sales rep': 'Sales',
};

const industryAliases: Record<string, string> = {
  crypto: 'Blockchain / Crypto',
  creator: 'Creator Economy',
  creators: 'Creator Economy',
  tech: 'Technology',
};
