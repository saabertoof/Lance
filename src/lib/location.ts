import { locationCatalog, usStates, type LocationOption } from '@/constants/catalogs';
import {
  countryFlag,
  countryNameForCode,
  normalizeCountryCode,
} from '@/constants/countries';

type LocationParts = {
  catalogId?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  id?: string | null;
  label?: string | null;
  region?: string | null;
};

const compactRegionCountries = new Set(['US', 'CA', 'AU']);

const canadaRegions: Record<string, string> = {
  alberta: 'AB',
  ab: 'AB',
  'british columbia': 'BC',
  bc: 'BC',
  manitoba: 'MB',
  mb: 'MB',
  'new brunswick': 'NB',
  nb: 'NB',
  'newfoundland and labrador': 'NL',
  nl: 'NL',
  'northwest territories': 'NT',
  nt: 'NT',
  'nova scotia': 'NS',
  ns: 'NS',
  nunavut: 'NU',
  nu: 'NU',
  ontario: 'ON',
  on: 'ON',
  'prince edward island': 'PE',
  pe: 'PE',
  quebec: 'QC',
  qc: 'QC',
  saskatchewan: 'SK',
  sk: 'SK',
  yukon: 'YT',
  yt: 'YT',
};

const australiaRegions: Record<string, string> = {
  act: 'ACT',
  'australian capital territory': 'ACT',
  nsw: 'NSW',
  'new south wales': 'NSW',
  nt: 'NT',
  'northern territory': 'NT',
  qld: 'QLD',
  queensland: 'QLD',
  sa: 'SA',
  'south australia': 'SA',
  tas: 'TAS',
  tasmania: 'TAS',
  vic: 'VIC',
  victoria: 'VIC',
  wa: 'WA',
  'western australia': 'WA',
};

export function formatLocationParts(parts: LocationParts) {
  const city = cleanLocationValue(parts.city);
  const countryCode = normalizeCountryCode(parts.countryCode) || normalizeCountryCode(parts.country);
  const country = countryNameForCode(countryCode) || cleanLocationValue(parts.country);
  const region = cleanLocationValue(parts.region);
  const regionLabel = compactRegion(region, countryCode);
  const flag = countryFlag(countryCode);
  const showRegion = Boolean(city && regionLabel && compactRegionCountries.has(countryCode));

  if (city && showRegion) {
    return `${city}, ${regionLabel} ${flag}`.trim();
  }

  if (city) {
    return `${city} ${flag}`.trim();
  }

  if (regionLabel) {
    return `${regionLabel} ${flag}`.trim();
  }

  if (country) {
    return `${country} ${flag}`.trim();
  }

  return cleanLocationValue(parts.label);
}

export function locationOptionFromParts(parts: LocationParts): LocationOption | null {
  const city = cleanLocationValue(parts.city);
  const countryCode = normalizeCountryCode(parts.countryCode) || normalizeCountryCode(parts.country);
  const country = countryNameForCode(countryCode) || cleanLocationValue(parts.country);
  const region = cleanLocationValue(parts.region);
  const label = formatLocationParts({ city, region, countryCode, country, label: parts.label });

  if (!label) {
    return null;
  }

  const id = parts.id || parts.catalogId || customLocationId(city, region, countryCode, label);

  return {
    id,
    catalogId: parts.catalogId ?? null,
    label,
    city: city || null,
    region: region || null,
    country,
    countryCode,
    search: [label, city, region, country, countryCode].filter(Boolean).join(' ').toLowerCase(),
  };
}

export function locationOptionFromStored(parts: LocationParts): LocationOption | null {
  const byId = parts.id
    ? locationCatalog.find((option) => option.id === parts.id || option.catalogId === parts.id)
    : null;

  if (byId) {
    return byId;
  }

  const label = cleanLocationValue(parts.label);
  const normalizedLabel = normalizeLocationText(label);

  if (normalizedLabel) {
    const byLabel = locationCatalog.find((option) => {
      const normalizedOption = normalizeLocationText(option.label);
      return normalizedOption === normalizedLabel || option.search.includes(normalizedLabel);
    });

    if (byLabel) {
      return byLabel;
    }
  }

  const countryCode = normalizeCountryCode(parts.country);
  const city = extractCityFromLabel(label, parts.region, parts.country);
  return locationOptionFromParts({
    ...parts,
    city: parts.city ?? city,
    countryCode,
    label,
  });
}

export function getLocationCatalogId(location: LocationOption | null | undefined) {
  return location?.catalogId ?? null;
}

export function getLocationCountryCode(location: LocationOption | null | undefined) {
  return normalizeCountryCode(location?.countryCode) || normalizeCountryCode(location?.country);
}

export function normalizeStoredCountry(value?: string | null) {
  return normalizeCountryCode(value) || cleanLocationValue(value);
}

export function formatOpportunityLocation({
  location,
  locationCountry,
  locationId,
  locationRegion,
  workplace,
}: {
  location: string;
  locationCountry?: string | null;
  locationId?: string | null;
  locationRegion?: string | null;
  workplace: string;
}) {
  const arranged = workplace === 'in_person' ? 'In person' : titleCase(workplace.replace(/_/g, ' '));
  const option = locationOptionFromStored({
    id: locationId,
    label: location,
    region: locationRegion,
    country: locationCountry,
  });

  if (workplace === 'remote') {
    return option?.label ? `Remote, ${option.label}` : 'Remote';
  }

  if (!option?.label) {
    return arranged;
  }

  return `${arranged} · ${option.label}`;
}

export function compactRegion(region?: string | null, countryCode?: string | null) {
  const value = cleanLocationValue(region);
  const code = normalizeCountryCode(countryCode);
  const normalized = value.toLowerCase();

  if (!value) {
    return '';
  }

  if (code === 'US') {
    return usStates.find(([stateCode, name]) => (
      stateCode.toLowerCase() === normalized || name.toLowerCase() === normalized
    ))?.[0] ?? value;
  }

  if (code === 'CA') {
    return canadaRegions[normalized] ?? value;
  }

  if (code === 'AU') {
    return australiaRegions[normalized] ?? value;
  }

  return value;
}

export function cleanLocationValue(value?: string | null) {
  return value?.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim().replace(/\s+/g, ' ') ?? '';
}

function extractCityFromLabel(label: string, region?: string | null, country?: string | null) {
  const clean = cleanLocationValue(label);

  if (!clean) {
    return '';
  }

  const countryCode = normalizeCountryCode(country);
  const countryName = countryNameForCode(countryCode);
  const withoutCountry = countryName
    ? clean.replace(new RegExp(`,?\\s*${escapeRegExp(countryName)}$`, 'i'), '')
    : clean;
  const withoutCountryCode = countryCode
    ? withoutCountry.replace(new RegExp(`,?\\s*${escapeRegExp(countryCode)}$`, 'i'), '')
    : withoutCountry;
  const regionLabel = cleanLocationValue(region);
  const withoutRegion = regionLabel
    ? withoutCountryCode.replace(new RegExp(`,?\\s*${escapeRegExp(regionLabel)}$`, 'i'), '')
    : withoutCountryCode;

  return withoutRegion.split(',')[0]?.trim() ?? '';
}

function customLocationId(city: string, region: string, countryCode: string, label: string) {
  const slug = [city, region, countryCode || label]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return `custom-${slug || 'location'}`;
}

function normalizeLocationText(value: string) {
  return cleanLocationValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
