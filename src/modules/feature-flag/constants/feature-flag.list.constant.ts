import { Prisma } from '@generated/prisma-client/client';

/**
 * Fields the feature-flag lists search.
 * @public
 */
export const FeatureFlagDefaultAvailableSearch = [
    Prisma.FeatureFlagScalarFieldEnum.key,
] as const satisfies ReadonlyArray<Prisma.FeatureFlagScalarFieldEnum>;

/**
 * Sort fields the admin offset and system cursor feature-flag lists accept. `createdAt` and `key`
 * are written when the row is seeded and no update path touches either, so neither key moves a
 * row mid-scroll.
 * @public
 */
export const FeatureFlagDefaultAvailableOrderBy = [
    Prisma.FeatureFlagScalarFieldEnum.createdAt,
    Prisma.FeatureFlagScalarFieldEnum.key,
] as const satisfies ReadonlyArray<Prisma.FeatureFlagScalarFieldEnum>;
