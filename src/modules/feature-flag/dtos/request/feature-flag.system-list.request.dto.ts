import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';

/**
 * Feature Flag System List Request schema for paginated list query.
 * @public
 */
export const FeatureFlagSystemListRequestSchema =
    PaginationCursorQuerySchema.extend({
        search: PaginationCursorQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${FeatureFlagDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: PaginationOrderBySchema(FeatureFlagDefaultAvailableOrderBy),
    });

/**
 * Inferred DTO for FeatureFlagSystemListRequestSchema.
 * @public
 */
export type FeatureFlagSystemListRequestDto = z.infer<
    typeof FeatureFlagSystemListRequestSchema
>;
