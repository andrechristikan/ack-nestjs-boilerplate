import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/** @public */
export const AnalyticWorkspacesActivityVolumeListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend(
        AnalyticDateRangeRequestSchema.shape
    );

/** @public */
export type AnalyticWorkspacesActivityVolumeListRequestDto = z.infer<
    typeof AnalyticWorkspacesActivityVolumeListRequestSchema
>;
