import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import { EnumCountryOrderBy } from '@modules/country/enums/country.enum';

/** @public */
export const CountryOrderBy = {
    [EnumCountryOrderBy.latest]: [
        {
            [Prisma.CountryScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumCountryOrderBy.name]: [
        {
            [Prisma.CountryScalarFieldEnum.name]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
    [EnumCountryOrderBy.alpha2Code]: [
        {
            [Prisma.CountryScalarFieldEnum.alpha2Code]:
                EnumPaginationOrderDirectionType.asc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.CountryScalarFieldEnum,
    EnumCountryOrderBy
>;

/** @public */
export const CountryDefaultAvailableSearch = [
    Prisma.CountryScalarFieldEnum.name,
    Prisma.CountryScalarFieldEnum.alpha2Code,
    Prisma.CountryScalarFieldEnum.alpha3Code,
    Prisma.CountryScalarFieldEnum.continent,
] as const satisfies ReadonlyArray<Prisma.CountryScalarFieldEnum>;

/** @public */
export const CountryPublicListCursorScope = 'CountryPublicListCursorScope';
