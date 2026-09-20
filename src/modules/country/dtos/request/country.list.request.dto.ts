import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
} from '@modules/country/constants/country.list.constant';

/**
 * Country List Request schema for paginated list query.
 * @public
 */
export const CountryListRequestSchema = PaginationCursorQuerySchema.extend({
    search: z
        .string()
        .optional()
        .meta({
            description: `Search query, available fields: ${CountryDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
    orderBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${CountryDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${CountryDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
});

/**
 * Inferred DTO for CountryListRequestSchema.
 * @public
 */
export type CountryListRequestDto = z.infer<typeof CountryListRequestSchema>;
