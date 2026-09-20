import { Prisma } from '@generated/prisma-client/client';

/**
 * Cursor-route allow-list. `country` is seeded reference data reached through a single read-only
 * public controller, so no runtime path rewrites `name` or `alpha2Code` and neither key moves mid-scroll.
 * @public
 */
export const CountryDefaultAvailableOrderBy = [
    Prisma.CountryScalarFieldEnum.name,
    Prisma.CountryScalarFieldEnum.alpha2Code,
] as const satisfies ReadonlyArray<Prisma.CountryScalarFieldEnum>;

/**
 * Fields the public country list searches.
 * @public
 */
export const CountryDefaultAvailableSearch = [
    Prisma.CountryScalarFieldEnum.name,
    Prisma.CountryScalarFieldEnum.alpha2Code,
    Prisma.CountryScalarFieldEnum.alpha3Code,
    Prisma.CountryScalarFieldEnum.continent,
] as const satisfies ReadonlyArray<Prisma.CountryScalarFieldEnum>;
