-- Include environment in unique constraints so SANDPIT and PRODUCTION
-- can each have their own OrgMember / SpeciesGroup / CoordinatorSpeciesAssignment rows.

-- org_members: (userId, orgId) → (userId, orgId, environment)
ALTER TABLE "org_members" DROP CONSTRAINT "org_members_userId_orgId_key";
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_userId_orgId_environment_key" UNIQUE ("userId", "orgId", "environment");

-- species_groups: (slug, orgId) → (slug, orgId, environment)
ALTER TABLE "species_groups" DROP CONSTRAINT "species_groups_slug_orgId_key";
ALTER TABLE "species_groups" ADD CONSTRAINT "species_groups_slug_orgId_environment_key" UNIQUE ("slug", "orgId", "environment");

-- coordinator_species_assignments: (orgMemberId, speciesGroupId) → (orgMemberId, speciesGroupId, environment)
ALTER TABLE "coordinator_species_assignments" DROP CONSTRAINT "coordinator_species_assignments_orgMemberId_speciesGroupId_key";
ALTER TABLE "coordinator_species_assignments" ADD CONSTRAINT "coordinator_species_assignments_orgMemberId_speciesGroupId_en_key" UNIQUE ("orgMemberId", "speciesGroupId", "environment");
