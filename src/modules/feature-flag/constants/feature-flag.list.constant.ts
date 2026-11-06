import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const FeatureFlagDefaultAvailableSearch = [
    Prisma.FeatureFlagScalarFieldEnum.key,
] as const satisfies ReadonlyArray<Prisma.FeatureFlagScalarFieldEnum>;

/** @public */
export const FeatureFlagDefaultAvailableOrderBy = [
    Prisma.FeatureFlagScalarFieldEnum.createdAt,
    Prisma.FeatureFlagScalarFieldEnum.key,
] as const satisfies ReadonlyArray<Prisma.FeatureFlagScalarFieldEnum>;

/** @public */
export const FeatureFlagSystemListCursorScope =
    'FeatureFlagSystemListCursorScope';
