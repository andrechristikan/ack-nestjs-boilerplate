import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
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
    search: PaginationCursorQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${CountryDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: PaginationOrderBySchema(CountryDefaultAvailableOrderBy),
});

/**
 * Inferred DTO for CountryListRequestSchema.
 * @public
 */
export type CountryListRequestDto = z.infer<typeof CountryListRequestSchema>;
