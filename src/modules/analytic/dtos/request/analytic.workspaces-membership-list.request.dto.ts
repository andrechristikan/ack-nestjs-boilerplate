import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

/** @public */
export const AnalyticWorkspacesMembershipListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true });

/** @public */
export type AnalyticWorkspacesMembershipListRequestDto = z.infer<
    typeof AnalyticWorkspacesMembershipListRequestSchema
>;
