import {
  countryFlag,
  countryNameForCode,
  countryOptions,
  normalizeCountryCode,
} from './countries';

export type CatalogOption = {
  label: string;
  category: string;
};

export const skillCatalog: CatalogOption[] = [
  ['Marketing', 'Marketing and Growth'], ['Growth Marketing', 'Marketing and Growth'],
  ['Digital Marketing', 'Marketing and Growth'], ['Social Media Marketing', 'Marketing and Growth'],
  ['Content Marketing', 'Marketing and Growth'], ['Email Marketing', 'Marketing and Growth'],
  ['Influencer Marketing', 'Marketing and Growth'], ['Affiliate Marketing', 'Marketing and Growth'],
  ['Community Management', 'Marketing and Growth'], ['Brand Strategy', 'Marketing and Growth'],
  ['Market Research', 'Marketing and Growth'], ['SEO', 'Marketing and Growth'],
  ['Paid Ads', 'Marketing and Growth'], ['Google Ads', 'Marketing and Growth'],
  ['Meta Ads', 'Marketing and Growth'], ['TikTok Ads', 'Marketing and Growth'],
  ['Campaign Management', 'Marketing and Growth'], ['Lead Generation', 'Marketing and Growth'],
  ['Landing Pages', 'Marketing and Growth'], ['Funnel Building', 'Marketing and Growth'],
  ['Newsletter Writing', 'Marketing and Growth'], ['Social Media Management', 'Marketing and Growth'],
  ['TikTok Growth', 'Marketing and Growth'], ['X/Twitter Growth', 'Marketing and Growth'],
  ['Instagram Growth', 'Marketing and Growth'], ['Meme Marketing', 'Marketing and Growth'],
  ['Partnerships', 'Marketing and Growth'], ['Public Relations', 'Marketing and Growth'],
  ['Sales', 'Sales and Business'], ['B2B Sales', 'Sales and Business'],
  ['B2C Sales', 'Sales and Business'], ['SaaS Sales', 'Sales and Business'],
  ['Business Development', 'Sales and Business'], ['Account Management', 'Sales and Business'],
  ['Customer Success', 'Sales and Business'], ['Cold Outreach', 'Sales and Business'],
  ['Appointment Setting', 'Sales and Business'], ['Closing', 'Sales and Business'],
  ['Sales Outreach', 'Sales and Business'], ['Creator Operations', 'Sales and Business'],
  ['Sales Operations', 'Sales and Business'], ['CRM', 'Sales and Business'],
  ['HubSpot', 'Sales and Business'], ['Salesforce', 'Sales and Business'],
  ['Negotiation', 'Sales and Business'], ['Fundraising', 'Sales and Business'],
  ['Investor Relations', 'Sales and Business'], ['Operations', 'Sales and Business'],
  ['Project Management', 'Sales and Business'], ['Product Management', 'Sales and Business'],
  ['Strategy', 'Sales and Business'],
  ['Content Creation', 'Content and Creative'], ['Content Strategy', 'Content and Creative'],
  ['Video Editing', 'Content and Creative'], ['Short-form editing', 'Content and Creative'],
  ['Short-Form Video', 'Content and Creative'], ['Long-Form Video', 'Content and Creative'],
  ['Clipping', 'Content and Creative'], ['Stream Clipping', 'Content and Creative'],
  ['CapCut', 'Content and Creative'], ['YouTube Shorts', 'Content and Creative'],
  ['Adobe Premiere Pro', 'Content and Creative'], ['Final Cut Pro', 'Content and Creative'],
  ['After Effects', 'Content and Creative'], ['Motion Graphics', 'Content and Creative'],
  ['Graphic Design', 'Content and Creative'], ['Canva', 'Content and Creative'],
  ['Figma', 'Content and Creative'], ['Branding', 'Content and Creative'],
  ['Copywriting', 'Content and Creative'], ['Scriptwriting', 'Content and Creative'],
  ['Photography', 'Content and Creative'], ['Camera Operator', 'Content and Creative'],
  ['Videography', 'Content and Creative'],
  ['Podcast Editing', 'Content and Creative'], ['Thumbnail Design', 'Content and Creative'],
  ['UGC Content', 'Content and Creative'], ['UGC', 'Content and Creative'],
  ['Creative Direction', 'Content and Creative'],
  ['Web Development', 'Technology and Product'], ['Mobile Development', 'Technology and Product'],
  ['Frontend Development', 'Technology and Product'], ['Backend Development', 'Technology and Product'],
  ['Full-Stack Development', 'Technology and Product'], ['React', 'Technology and Product'],
  ['React Native', 'Technology and Product'], ['TypeScript', 'Technology and Product'],
  ['JavaScript', 'Technology and Product'], ['Python', 'Technology and Product'],
  ['Node.js', 'Technology and Product'], ['Supabase', 'Technology and Product'],
  ['PostgreSQL', 'Technology and Product'], ['SQL', 'Technology and Product'],
  ['No-Code', 'Technology and Product'], ['Vibe Coding', 'Technology and Product'],
  ['MVP Building', 'Technology and Product'], ['Bubble', 'Technology and Product'],
  ['Webflow', 'Technology and Product'], ['Framer', 'Technology and Product'],
  ['Shopify', 'Technology and Product'], ['WordPress', 'Technology and Product'],
  ['API Integration', 'Technology and Product'], ['Automation', 'Technology and Product'],
  ['AI Tools', 'Technology and Product'], ['AI Automations', 'Technology and Product'],
  ['Automation Workflows', 'Technology and Product'], ['Prompt Engineering', 'Technology and Product'],
  ['Data Analysis', 'Technology and Product'], ['UI Design', 'Technology and Product'],
  ['UX Design', 'Technology and Product'], ['Product Design', 'Technology and Product'],
  ['QA Testing', 'Technology and Product'], ['Cybersecurity', 'Technology and Product'],
  ['Financial Modeling', 'Finance and Professional'], ['Valuation', 'Finance and Professional'],
  ['Accounting', 'Finance and Professional'], ['Bookkeeping', 'Finance and Professional'],
  ['Corporate Finance', 'Finance and Professional'], ['Investment Research', 'Finance and Professional'],
  ['Real Estate', 'Finance and Professional'], ['Underwriting', 'Finance and Professional'],
  ['Excel', 'Finance and Professional'], ['PowerPoint', 'Finance and Professional'],
  ['Legal Research', 'Finance and Professional'], ['Recruiting', 'Finance and Professional'],
  ['People Operations', 'Finance and Professional'], ['Consulting', 'Finance and Professional'],
  ['Business Analysis', 'Finance and Professional'],
  ['Crypto Research', 'Crypto and Internet Finance'], ['Trading Content', 'Crypto and Internet Finance'],
  ['DeFi', 'Crypto and Internet Finance'], ['Wallet Tracking', 'Crypto and Internet Finance'],
  ['Meme Coin Research', 'Crypto and Internet Finance'], ['Token Research', 'Crypto and Internet Finance'],
  ['On-chain Analysis', 'Crypto and Internet Finance'], ['Community Growth', 'Crypto and Internet Finance'],
  ['YouTube', 'Creator and Online Business'], ['TikTok', 'Creator and Online Business'],
  ['Instagram', 'Creator and Online Business'], ['X / Twitter', 'Creator and Online Business'],
  ['Discord', 'Creator and Online Business'], ['Discord Management', 'Creator and Online Business'],
  ['Newsletter', 'Creator and Online Business'],
  ['Community Building', 'Creator and Online Business'], ['Creator Partnerships', 'Creator and Online Business'],
  ['E-commerce', 'Creator and Online Business'], ['Amazon', 'Creator and Online Business'],
  ['Etsy', 'Creator and Online Business'], ['Dropshipping', 'Creator and Online Business'],
  ['Online Courses', 'Creator and Online Business'], ['Coaching', 'Creator and Online Business'],
  ['Livestreaming', 'Creator and Online Business'], ['Personal Branding', 'Creator and Online Business'],
].map(([label, category]) => ({ label, category }));

export const industryCatalog = [
  'Advertising', 'Aerospace', 'Agriculture', 'AI / Machine Learning', 'Automotive',
  'Beauty', 'Biotechnology', 'Blockchain / Crypto', 'Business Services',
  'Consumer Products', 'Creator Economy', 'Cybersecurity', 'E-commerce', 'Education',
  'Energy', 'Entertainment', 'Fashion', 'Financial Services', 'Fitness',
  'Food and Beverage', 'Gaming', 'Government', 'Healthcare', 'Hospitality',
  'Insurance', 'Legal', 'Logistics', 'Manufacturing', 'Marketing', 'Media', 'Music',
  'Nonprofit', 'Professional Services', 'Real Estate', 'Recruiting', 'Retail', 'SaaS',
  'Social Media', 'Sports', 'Technology', 'Telecommunications', 'Travel',
  'Venture Capital', 'Web3',
];

export type LocationOption = {
  id: string;
  catalogId?: string | null;
  label: string;
  city: string | null;
  region: string | null;
  country: string;
  countryCode: string;
  search: string;
};

export const usStates = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'],
  ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'], ['WY', 'Wyoming'], ['DC', 'District of Columbia'],
] as const;

const canadaRegions: Record<string, string> = {
  alberta: 'AB',
  'british columbia': 'BC',
  manitoba: 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'northwest territories': 'NT',
  'nova scotia': 'NS',
  nunavut: 'NU',
  ontario: 'ON',
  'prince edward island': 'PE',
  quebec: 'QC',
  saskatchewan: 'SK',
  yukon: 'YT',
};

const australiaRegions: Record<string, string> = {
  'australian capital territory': 'ACT',
  'new south wales': 'NSW',
  'northern territory': 'NT',
  queensland: 'QLD',
  'south australia': 'SA',
  tasmania: 'TAS',
  victoria: 'VIC',
  'western australia': 'WA',
};

const featuredLocations: LocationOption[] = [
  location('us-il-chicago', 'Chicago', 'Illinois', 'United States'),
  location('us-ny-new-york', 'New York', 'New York', 'United States'),
  location('us-ca-los-angeles', 'Los Angeles', 'California', 'United States'),
  location('us-ca-san-francisco', 'San Francisco', 'California', 'United States', 'bay area'),
  location('us-tx-austin', 'Austin', 'Texas', 'United States'),
  location('us-ma-boston', 'Boston', 'Massachusetts', 'United States'),
  location('us-wa-seattle', 'Seattle', 'Washington', 'United States'),
  location('us-fl-miami', 'Miami', 'Florida', 'United States'),
  location('us-dc-washington', 'Washington', 'District of Columbia', 'United States', 'dc'),
  location('us-in-south-bend', 'South Bend', 'Indiana', 'United States', 'notre dame'),
  location('gb-eng-london', 'London', 'England', 'United Kingdom', 'uk'),
  location('ca-on-toronto', 'Toronto', 'Ontario', 'Canada'),
  location('fr-idf-paris', 'Paris', 'Ile-de-France', 'France'),
  location('de-be-berlin', 'Berlin', 'Berlin', 'Germany'),
  location('nl-nh-amsterdam', 'Amsterdam', 'North Holland', 'Netherlands'),
  location('ie-l-dublin', 'Dublin', 'Leinster', 'Ireland'),
  location('au-nsw-sydney', 'Sydney', 'New South Wales', 'Australia'),
  location('sg-singapore', 'Singapore', 'Singapore', 'Singapore'),
  location('in-mh-mumbai', 'Mumbai', 'Maharashtra', 'India'),
  location('in-ka-bengaluru', 'Bengaluru', 'Karnataka', 'India', 'bangalore'),
  location('jp-13-tokyo', 'Tokyo', 'Tokyo', 'Japan'),
  location('ae-du-dubai', 'Dubai', 'Dubai', 'United Arab Emirates', 'uae'),
];

const stateLocations = usStates.map(([code, name]): LocationOption => ({
  id: `us-${code.toLowerCase()}`,
  catalogId: `us-${code.toLowerCase()}`,
  label: `${name} ${countryFlag('US')}`,
  city: null,
  region: name,
  country: 'United States',
  countryCode: 'US',
  search: `${name} ${code} United States USA ${countryFlag('US')}`.toLowerCase(),
}));

const seededCountryIds = new Set([
  'US', 'CA', 'GB', 'AU', 'IN', 'FR', 'DE', 'ES', 'NL', 'IE', 'SG', 'JP', 'AE', 'BR', 'MX',
]);

const countryLocations = countryOptions.map((country): LocationOption => ({
  id: `country-${country.code.toLowerCase()}`,
  catalogId: seededCountryIds.has(country.code) ? `country-${country.code.toLowerCase()}` : null,
  label: `${country.name} ${countryFlag(country.code)}`,
  city: null,
  region: null,
  country: country.name,
  countryCode: country.code,
  search: [country.name, country.code, country.aliases?.join(' ') ?? '', countryFlag(country.code)]
    .join(' ')
    .toLowerCase(),
}));

export const locationCatalog = [
  ...featuredLocations,
  ...stateLocations,
  ...countryLocations,
].filter((option, index, values) => values.findIndex((item) => item.id === option.id) === index);

export function normalizeCatalogValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function location(
  id: string,
  city: string,
  region: string,
  country: string,
  aliases = '',
): LocationOption {
  const countryCode = normalizeCountryCode(country);
  const countryName = countryNameForCode(countryCode) || country;
  const regionLabel = formatRegionForDisplay(region, countryCode);
  const label = formatLocationLabel(city, regionLabel, countryCode, countryName);
  return {
    id,
    catalogId: id,
    label,
    city,
    region,
    country: countryName,
    countryCode,
    search: `${label} ${city} ${region} ${countryName} ${countryCode} ${aliases}`.toLowerCase(),
  };
}

function formatLocationLabel(
  city: string | null,
  region: string | null,
  countryCode: string,
  country: string,
) {
  const flag = countryFlag(countryCode);
  const needsRegion = Boolean(region && countryCode && ['US', 'CA', 'AU'].includes(countryCode));

  if (city && needsRegion) {
    return `${city}, ${region} ${flag}`.trim();
  }

  if (city) {
    return `${city} ${flag}`.trim();
  }

  if (region) {
    return `${region} ${flag}`.trim();
  }

  return `${country} ${flag}`.trim();
}

function formatRegionForDisplay(region: string | null, countryCode: string) {
  if (!region) return null;

  const normalized = region.toLowerCase();

  if (countryCode === 'US') {
    return usStates.find(([code, name]) => (
      code.toLowerCase() === normalized || name.toLowerCase() === normalized
    ))?.[0] ?? region;
  }

  if (countryCode === 'CA') {
    return canadaRegions[normalized] ?? region;
  }

  if (countryCode === 'AU') {
    return australiaRegions[normalized] ?? region;
  }

  return region;
}
