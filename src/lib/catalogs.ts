import { industryCatalog, normalizeCatalogValue } from '@/constants/catalogs';
import { supabase } from '@/lib/supabase';

export async function registerCustomIndustries(values: string[]) {
  const custom = values
    .map((name) => ({ name: name.trim().replace(/\s+/g, ' '), normalized: normalizeCatalogValue(name) }))
    .filter(
      (item, index, all) =>
        item.normalized &&
        all.findIndex((candidate) => candidate.normalized === item.normalized) === index &&
        !industryCatalog.some(
          (curated) => normalizeCatalogValue(curated) === item.normalized,
        ),
    );
  if (custom.length === 0) return;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Sign in again to save.');

  const { data: existing, error: existingError } = await supabase
    .from('industry_catalog')
    .select('normalized_name')
    .in('normalized_name', custom.map((item) => item.normalized));
  if (existingError) throw existingError;
  const known = new Set((existing ?? []).map((item) => item.normalized_name));
  const additions = custom.filter((item) => !known.has(item.normalized));
  if (additions.length === 0) return;

  const { error } = await supabase.from('industry_catalog').insert(
    additions.map((item) => ({
      name: item.name,
      normalized_name: item.normalized,
      category: 'Custom',
      is_curated: false,
      is_default_suggestion: false,
      created_by_profile_id: userData.user.id,
    })),
  );
  if (error && error.code !== '23505') throw error;
}

export async function searchCatalogValues(
  type: 'skills' | 'industries',
  query: string,
) {
  const term = query.trim();
  if (term.length < 2) return [];
  if (type === 'skills') {
    const { data, error } = await supabase
      .from('skills')
      .select('name, category')
      .ilike('name', `%${term}%`)
      .order('is_curated', { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data ?? []).map((item) => ({
      label: item.name,
      category: item.category ?? 'Custom',
    }));
  }
  const { data, error } = await supabase
    .from('industry_catalog')
    .select('name, category')
    .ilike('name', `%${term}%`)
    .order('is_curated', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((item) => ({
    label: item.name,
    category: item.category ?? 'Custom',
  }));
}
