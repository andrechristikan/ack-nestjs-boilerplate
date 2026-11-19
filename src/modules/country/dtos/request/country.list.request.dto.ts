import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { CountryDefaultAvailableSearch } from '@modules/country/constants/country.list.constant';
import { EnumCountryOrderBy } from '@modules/country/enums/country.enum';

/** @public */
export const CountryListRequestSchema = PaginationCursorQuerySchema.extend({
    search: PaginationCursorQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${CountryDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([z.enum(EnumCountryOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumCountryOrderBy).join(', ')}. An empty or absent value uses \`${EnumCountryOrderBy.latest}\`.`,
            example: EnumCountryOrderBy.latest,
        }),
});

/** @public */
export type CountryListRequestDto = z.infer<typeof CountryListRequestSchema>;
