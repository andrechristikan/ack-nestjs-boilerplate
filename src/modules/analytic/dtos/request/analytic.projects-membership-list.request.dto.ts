import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

/** @public */
export const AnalyticProjectsMembershipListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true });

/** @public */
export type AnalyticProjectsMembershipListRequestDto = z.infer<
    typeof AnalyticProjectsMembershipListRequestSchema
>;
