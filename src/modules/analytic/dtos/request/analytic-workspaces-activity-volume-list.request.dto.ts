import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/**
 * Analytic Workspaces Activity Volume List Request schema for paginated list query.
 * @public
 */
export const AnalyticWorkspacesActivityVolumeListRequestSchema =
    PaginationOffsetQuerySchema.extend(AnalyticDateRangeRequestSchema.shape);

/**
 * Inferred DTO for AnalyticWorkspacesActivityVolumeListRequestSchema.
 * @public
 */
export type AnalyticWorkspacesActivityVolumeListRequestDto = z.infer<
    typeof AnalyticWorkspacesActivityVolumeListRequestSchema
>;
