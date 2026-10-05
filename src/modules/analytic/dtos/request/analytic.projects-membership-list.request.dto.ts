import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

/**
 * Analytic Projects Membership List Request schema for paginated list query.
 * @public
 */
export const AnalyticProjectsMembershipListRequestSchema =
    PaginationOffsetQuerySchema;

/**
 * Inferred DTO for AnalyticProjectsMembershipListRequestSchema.
 * @public
 */
export type AnalyticProjectsMembershipListRequestDto = z.infer<
    typeof AnalyticProjectsMembershipListRequestSchema
>;
