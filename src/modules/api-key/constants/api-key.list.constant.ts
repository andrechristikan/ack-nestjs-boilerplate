import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';

/**
 * Fields the admin API key list searches.
 * @public
 */
export const ApiKeyDefaultAvailableSearch = [
    Prisma.ApiKeyScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ApiKeyScalarFieldEnum>;

/**
 * Sort fields the admin API key list accepts.
 * @public
 */
export const ApiKeyDefaultAvailableOrderBy = [
    Prisma.ApiKeyScalarFieldEnum.createdAt,
    Prisma.ApiKeyScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ApiKeyScalarFieldEnum>;

/**
 * API key types the admin API key list filter accepts.
 * @public
 */
export const ApiKeyDefaultType = Object.values(EnumApiKeyType);
