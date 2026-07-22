// Community author DTO. Discloses ONLY explicit Community fields — never email,
// phone, Clerk IDs, role grants, exact location or workspace activity. The
// organisation name is denormalised onto the profile (homeOrganisationName) so
// this never joins to operational organisation records, and is shown only when
// the author opted into the organisation badge.
export function communityAuthorDto(author: {
  id: string;
  displayName: string;
  region: string | null;
  showOrganisationBadge: boolean;
  isModerator: boolean;
  homeOrganisationName: string | null;
}) {
  return {
    id: author.id,
    displayName: author.displayName,
    region: author.region,
    organisationName: author.showOrganisationBadge ? author.homeOrganisationName : null,
    isModerator: author.isModerator,
  };
}

export type CommunityAuthorDto = ReturnType<typeof communityAuthorDto>;

export const communityAuthorSelect = {
  id: true,
  displayName: true,
  region: true,
  showOrganisationBadge: true,
  isModerator: true,
  homeOrganisationName: true,
} as const;
