import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticAccountTakeoverOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticAccountTakeoverListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumAnalyticAccountTakeoverOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticAccountTakeoverOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticAccountTakeoverOrderBy.latest}\`.`,
                example: EnumAnalyticAccountTakeoverOrderBy.latest,
            }),
    });

/** @public */
export type AnalyticAccountTakeoverListRequestDto = z.infer<
    typeof AnalyticAccountTakeoverListRequestSchema
>;
