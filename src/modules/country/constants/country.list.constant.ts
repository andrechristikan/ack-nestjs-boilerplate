import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const CountryDefaultAvailableOrderBy = [
    Prisma.CountryScalarFieldEnum.name,
    Prisma.CountryScalarFieldEnum.alpha2Code,
] as const satisfies ReadonlyArray<Prisma.CountryScalarFieldEnum>;

/** @public */
export const CountryDefaultAvailableSearch = [
    Prisma.CountryScalarFieldEnum.name,
    Prisma.CountryScalarFieldEnum.alpha2Code,
    Prisma.CountryScalarFieldEnum.alpha3Code,
    Prisma.CountryScalarFieldEnum.continent,
] as const satisfies ReadonlyArray<Prisma.CountryScalarFieldEnum>;

/** @public */
export const CountryPublicListCursorScope = 'CountryPublicListCursorScope';
