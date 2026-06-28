import type { OpportunityDraft } from '@/types/opportunity';

export function buildMagicOpportunityDraft(
  prompt: string,
  current: OpportunityDraft,
): Partial<OpportunityDraft> {
  const text = prompt.trim().replace(/\s+/g, ' ');
  const lower = text.toLowerCase();
  const skills = inferSkills(lower);
  const title = inferOpportunityTitle(text, lower);
  const remote = /\b(remote|online|anywhere)\b/.test(lower);
  const local = /\b(local|in person|in-person|on site|onsite)\b/.test(lower);
  const paidPerClip = /\b(per clip|per video|per short|per edit)\b/.test(lower);
  const hourly = /\b(hourly|per hour)\b/.test(lower);
  const equity = /\b(equity|cofounder|co-founder)\b/.test(lower);
  const unpaid = /\b(unpaid|volunteer)\b/.test(lower);
  const ongoing = /\b(ongoing|long term|long-term|weekly|monthly|retainer)\b/.test(lower);
  const partTime = /\b(part time|part-time|few hours|10-20|5-10)\b/.test(lower);

  return {
    title,
    shortSummary: inferShortSummary(title, text),
    fullDescription:
      `Help with ${text}. The work should be clear, polished, and easy to review. ` +
      'Share examples of relevant work, communicate what you need, and keep the creator updated as you go.',
    category: inferCategory(lower),
    workType: equity
      ? 'cofounder'
      : ongoing
        ? 'ongoing_freelance'
        : partTime
          ? 'part_time'
          : /\bcollab|collaboration|project\b/.test(lower)
            ? 'project_collaboration'
            : 'one_time_project',
    compensationType: unpaid
      ? 'unpaid'
      : equity
        ? 'equity'
        : hourly
          ? 'hourly'
          : paidPerClip
            ? 'fixed_project'
            : /\bpaid|budget|pay|rate|compensat/.test(lower)
              ? 'fixed_project'
              : current.compensationType,
    ratePeriod: hourly
      ? 'per_hour'
      : paidPerClip
        ? 'per_project'
        : current.ratePeriod || 'per_project',
    workplace: remote ? 'remote' : local ? 'in_person' : current.workplace,
    timeCommitment: partTime
      ? 'hours_10_20'
      : ongoing
        ? 'hours_5_10'
        : current.timeCommitment || 'one_time_deliverable',
    experienceLevel: /\bexpert|senior|pro|experienced\b/.test(lower)
      ? 'experienced'
      : /\bbeginner|junior|student\b/.test(lower)
        ? 'beginner'
        : current.experienceLevel,
    industry: inferIndustry(lower, current.industry),
    skills: uniqueStrings([...(current.skills ?? []), ...skills]).slice(0, 8),
    additionalRequirements: inferIdealCandidate(skills),
    portfolioRequired: skills.some((skill) =>
      /editing|design|content|video|thumbnail|motion|copy/i.test(skill),
    ),
  };
}

export function applyMagicOpportunityDraft(
  prompt: string,
  current: OpportunityDraft,
): OpportunityDraft {
  return {
    ...current,
    ...buildMagicOpportunityDraft(prompt, current),
  };
}

function inferOpportunityTitle(text: string, lower: string) {
  const context = inferCreatorContext(text);
  if (/\b(short[- ]?form|tiktok|shorts|clips?|capcut)\b/.test(lower)) {
    return context ? `Short-form editor for ${context}` : 'Short-form editor';
  }
  if (/\bthumbnail\b/.test(lower)) {
    return context ? `Thumbnail designer for ${context}` : 'Thumbnail designer';
  }
  if (/\bdesigner|ui|figma|brand\b/.test(lower)) {
    return context ? `Designer for ${context}` : 'Designer';
  }
  if (/\bdeveloper|react|app|website|landing page|builder|coding\b/.test(lower)) {
    return context ? `Builder for ${context}` : 'Builder for a creator project';
  }
  if (/\bsocial|growth|tiktok|instagram|twitter|x\b/.test(lower)) {
    return context ? `Growth help for ${context}` : 'Social growth help';
  }
  if (/\bassistant|ops|operations\b/.test(lower)) return 'Creator operations assistant';
  const words = text.split(/\s+/).slice(0, 8).join(' ');
  return words.length > 0 ? sentenceCase(words) : 'Creator opportunity';
}

function inferCreatorContext(text: string) {
  const match = text.match(/\b(?:for|on|with)\s+(?:my\s+)?(.+?)(?:,|\.|;|$)/i);
  return match?.[1]?.trim().replace(/\s+/g, ' ').slice(0, 52);
}

function inferShortSummary(title: string, prompt: string) {
  return `${title}. ${prompt.length > 110 ? prompt.slice(0, 107).trim() + '...' : prompt}`;
}

function inferCategory(lower: string): OpportunityDraft['category'] {
  if (/\bvideo|edit|clip|shorts|capcut|youtube|tiktok|podcast\b/.test(lower)) {
    return 'video_editing';
  }
  if (/\bphoto|camera|videography\b/.test(lower)) return 'photography';
  if (/\bdesign|thumbnail|figma|ui|brand\b/.test(lower)) return 'graphic_design';
  if (/\bcode|developer|react|native|app|website|webflow|framer|shopify|supabase\b/.test(lower)) {
    return 'web_development';
  }
  if (/\bsocial|growth|instagram|twitter|x|community\b/.test(lower)) return 'social_media';
  if (/\bcopy|script|newsletter|email\b/.test(lower)) return 'copywriting';
  if (/\bsales|lead|outreach\b/.test(lower)) return 'sales';
  if (/\bassistant|ops|operations\b/.test(lower)) return 'operations';
  return 'content_creation';
}

function inferIndustry(lower: string, fallback: string) {
  if (/\bcrypto|defi|web3|token|wallet|trading\b/.test(lower)) return 'Blockchain / Crypto';
  if (/\byoutube|tiktok|creator|stream|podcast|content\b/.test(lower)) return 'Creator Economy';
  if (/\bshopify|ecom|e-commerce|commerce\b/.test(lower)) return 'E-commerce';
  if (/\bsaas|software|app|startup\b/.test(lower)) return 'SaaS';
  return fallback || 'Creator Economy';
}

function inferIdealCandidate(skills: string[]) {
  const skillText =
    skills.length > 0 ? ` with ${skills.slice(0, 4).join(', ')}` : '';
  return `Strong fit if you can show relevant work${skillText}, communicate clearly, and move quickly without needing heavy direction.`;
}

function inferSkills(lower: string) {
  const matches: string[] = [];
  const add = (pattern: RegExp, skill: string) => {
    if (pattern.test(lower)) matches.push(skill);
  };

  add(/\bshort[- ]?form|shorts|clips?\b/, 'Short-form editing');
  add(/\bcapcut\b/, 'CapCut');
  add(/\btiktok\b/, 'TikTok growth');
  add(/\byoutube|shorts\b/, 'YouTube Shorts');
  add(/\bthumbnail\b/, 'Thumbnail design');
  add(/\bstream|clipping\b/, 'Stream clipping');
  add(/\bpodcast\b/, 'Podcast editing');
  add(/\bugc\b/, 'UGC content');
  add(/\bscript\b/, 'Scriptwriting');
  add(/\bcontent strategy|content plan\b/, 'Content strategy');
  add(/\bvideo|videography|camera\b/, 'Videography');
  add(/\bmotion\b/, 'Motion graphics');
  add(/\bmeme\b/, 'Meme marketing');
  add(/\blanding page|landing\b/, 'Landing pages');
  add(/\bfunnel\b/, 'Funnel building');
  add(/\baffiliate\b/, 'Affiliate marketing');
  add(/\bpaid ads?|ads?\b/, 'Paid ads');
  add(/\bemail|newsletter\b/, 'Email marketing');
  add(/\bcommunity\b/, 'Community management');
  add(/\bdiscord\b/, 'Discord management');
  add(/\bsocial\b/, 'Social media management');
  add(/\btwitter|x growth\b/, 'X/Twitter growth');
  add(/\binstagram\b/, 'Instagram growth');
  add(/\bsales|outreach\b/, 'Sales outreach');
  add(/\blead gen|lead generation\b/, 'Lead generation');
  add(/\bvibe cod|mvp|prototype\b/, 'MVP building');
  add(/\bautomation|zapier|make\.com\b/, 'AI automations');
  add(/\bno[- ]?code\b/, 'No-code');
  add(/\bframer\b/, 'Framer');
  add(/\bwebflow\b/, 'Webflow');
  add(/\bshopify\b/, 'Shopify');
  add(/\bbubble\b/, 'Bubble');
  add(/\bsupabase\b/, 'Supabase');
  add(/\breact native\b/, 'React Native');
  add(/\bui\b/, 'UI design');
  add(/\bproduct design\b/, 'Product design');
  add(/\bcrypto\b/, 'Crypto research');
  add(/\btrading\b/, 'Trading content');
  add(/\bdefi\b/, 'DeFi');
  add(/\bwallet\b/, 'Wallet tracking');
  add(/\bmeme coin\b/, 'Meme coin research');
  add(/\btoken\b/, 'Token research');
  add(/\bon[- ]?chain\b/, 'On-chain analysis');

  return uniqueStrings(matches.length > 0 ? matches : ['Communication', 'Creator operations']);
}

function uniqueStrings(values: string[]) {
  return [...new Map(values.map((value) => [value.toLowerCase(), value])).values()];
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
