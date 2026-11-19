import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticNearLockoutOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticNearLockoutListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumAnalyticNearLockoutOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticNearLockoutOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticNearLockoutOrderBy.latest}\`.`,
                example: EnumAnalyticNearLockoutOrderBy.latest,
            }),
    });

/** @public */
export type AnalyticNearLockoutListRequestDto = z.infer<
    typeof AnalyticNearLockoutListRequestSchema
>;
