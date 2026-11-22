import { EnumApiKeyType, Prisma } from '@generated/prisma-client/client';

/** @public */
export const ApiKeyDefaultAvailableSearch = [
    Prisma.ApiKeyScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ApiKeyScalarFieldEnum>;

/** @public */
export const ApiKeyDefaultAvailableOrderBy = [
    Prisma.ApiKeyScalarFieldEnum.createdAt,
    Prisma.ApiKeyScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ApiKeyScalarFieldEnum>;

/** @public */
export const ApiKeyDefaultType = Object.values(EnumApiKeyType);
