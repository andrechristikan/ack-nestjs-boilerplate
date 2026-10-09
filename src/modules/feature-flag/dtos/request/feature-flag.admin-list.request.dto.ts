import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

/**
 * Feature Flag Admin List Request schema for paginated list query.
 * @public
 */
export const FeatureFlagAdminListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${FeatureFlagDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: PaginationOrderBySchema(FeatureFlagDefaultAvailableOrderBy),
    });

/**
 * Inferred DTO for FeatureFlagAdminListRequestSchema.
 * @public
 */
export type FeatureFlagAdminListRequestDto = z.infer<
    typeof FeatureFlagAdminListRequestSchema
>;
