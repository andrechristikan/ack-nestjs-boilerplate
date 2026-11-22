import { z } from 'zod';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOffsetReturn } from '@common/pagination/interfaces/pagination.interface';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticWorkspaceCountCacheSchema } from '@modules/analytic/dtos/analytic.workspace-count-cache.dto';

/** @public */
export const AnalyticWorkspaceCountPageCacheSchema = z.object({
    type: z.literal(EnumPaginationType.offset),
    count: z.number(),
    perPage: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
    page: z.number(),
    nextPage: z.number().exactOptional(),
    previousPage: z.number().exactOptional(),
    totalPage: z.number(),
    data: z.array(AnalyticWorkspaceCountCacheSchema),
}) satisfies z.ZodType<IPaginationOffsetReturn<IAnalyticWorkspaceCount>>;

/** @public */
export type AnalyticWorkspaceCountPageCacheDto = z.infer<
    typeof AnalyticWorkspaceCountPageCacheSchema
>;
