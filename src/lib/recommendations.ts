import type { OpportunityRecord } from '@/types/opportunity';
import type { PersonalProfile, PublicProfile } from '@/types/profile';
import type { ProfilePolish } from '@/types/profilePolish';

export function getPersonRecommendationReasons(
  viewer: PersonalProfile | null,
  viewerPolish: ProfilePolish | null,
  candidate: PublicProfile,
) {
  if (!viewer) return [];
  const reasons: string[] = [];
  const sharedSkills = overlap(viewer.skills, candidate.skills);
  if (sharedSkills.length > 0) {
    reasons.push(
      sharedSkills.length === 1
        ? `Shares your ${sharedSkills[0]} skill`
        : `Matches ${sharedSkills.length} of your skills`,
    );
  }
  const sharedIndustries = overlap(
    viewer.industryExperience,
    candidate.industryExperience,
  );
  if (sharedIndustries.length > 0) {
    reasons.push(`Both have experience in ${sharedIndustries[0]}`);
  }
  if (
    viewerPolish?.location?.region &&
    candidate.polish.location?.region === viewerPolish.location.region
  ) {
    reasons.push(`Also in ${viewerPolish.location.region}`);
  }
  const sharedIntents = viewerPolish
    ? viewerPolish.currentIntents.filter((intent) =>
        candidate.polish.currentIntents.includes(intent),
      )
    : [];
  if (sharedIntents.length > 0) {
    reasons.push('Looking for a similar kind of collaboration');
  }
  return reasons.slice(0, 2);
}

export function getOpportunityRecommendationReasons(
  viewer: PersonalProfile | null,
  viewerPolish: ProfilePolish | null,
  opportunity: OpportunityRecord,
) {
  if (!viewer) return [];
  const reasons: string[] = [];
  const sharedSkills = overlap(viewer.skills, opportunity.skills);
  if (sharedSkills.length > 0) {
    reasons.push(
      sharedSkills.length === 1
        ? `Matches your ${sharedSkills[0]} skill`
        : `Matches ${sharedSkills.length} of your skills`,
    );
  }
  if (
    opportunity.industry &&
    viewer.industryExperience.some(
      (industry) => normalize(industry) === normalize(opportunity.industry),
    )
  ) {
    reasons.push(`Matches your ${opportunity.industry} experience`);
  }
  if (
    viewer.remotePreference === 'remote' &&
    opportunity.workplace === 'remote'
  ) {
    reasons.push('Matches your preference for remote work');
  }
  if (
    viewerPolish?.location?.region &&
    normalize(opportunity.location).includes(
      normalize(viewerPolish.location.region),
    )
  ) {
    reasons.push(`Near ${viewerPolish.location.region}`);
  }
  return reasons.slice(0, 2);
}

function overlap(first: string[], second: string[]) {
  const secondValues = new Map(second.map((value) => [normalize(value), value]));
  return first
    .map((value) => secondValues.get(normalize(value)))
    .filter((value): value is string => Boolean(value));
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}
