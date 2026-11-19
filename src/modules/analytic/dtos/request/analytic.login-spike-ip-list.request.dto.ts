import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticLoginSpikeIpOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticLoginSpikeIpListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumAnalyticLoginSpikeIpOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticLoginSpikeIpOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticLoginSpikeIpOrderBy.mostUsers}\`.`,
                example: EnumAnalyticLoginSpikeIpOrderBy.mostUsers,
            }),
    });

/** @public */
export type AnalyticLoginSpikeIpListRequestDto = z.infer<
    typeof AnalyticLoginSpikeIpListRequestSchema
>;
