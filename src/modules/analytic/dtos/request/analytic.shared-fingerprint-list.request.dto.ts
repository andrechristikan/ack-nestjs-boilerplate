import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticSharedFingerprintAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';

/**
 * Analytic Shared Fingerprint List Request schema for paginated list query.
 * @public
 */
export const AnalyticSharedFingerprintListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            AnalyticSharedFingerprintAvailableOrderBy
        ),
    });

/**
 * Inferred DTO for AnalyticSharedFingerprintListRequestSchema.
 * @public
 */
export type AnalyticSharedFingerprintListRequestDto = z.infer<
    typeof AnalyticSharedFingerprintListRequestSchema
>;
