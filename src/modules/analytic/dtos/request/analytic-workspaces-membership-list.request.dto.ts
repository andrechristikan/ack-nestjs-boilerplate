import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';

/**
 * Analytic Workspaces Membership List Request schema for paginated list query.
 * @public
 */
export const AnalyticWorkspacesMembershipListRequestSchema =
    PaginationOffsetQuerySchema;

/**
 * Inferred DTO for AnalyticWorkspacesMembershipListRequestSchema.
 * @public
 */
export type AnalyticWorkspacesMembershipListRequestDto = z.infer<
    typeof AnalyticWorkspacesMembershipListRequestSchema
>;
