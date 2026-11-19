import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticSnapshotListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumAnalyticSnapshotOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticSnapshotOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticSnapshotOrderBy.highestValue}\`.`,
                example: EnumAnalyticSnapshotOrderBy.highestValue,
            }),
    });

/** @public */
export type AnalyticSnapshotListRequestDto = z.infer<
    typeof AnalyticSnapshotListRequestSchema
>;
