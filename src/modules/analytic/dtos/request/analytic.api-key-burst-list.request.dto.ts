import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { EnumAnalyticUserCountOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticApiKeyBurstListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: z
                .union([z.enum(EnumAnalyticUserCountOrderBy), z.literal('')])
                .optional()
                .meta({
                    description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticUserCountOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticUserCountOrderBy.mostCount}\`.`,
                    example: EnumAnalyticUserCountOrderBy.mostCount,
                }),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/** @public */
export type AnalyticApiKeyBurstListRequestDto = z.infer<
    typeof AnalyticApiKeyBurstListRequestSchema
>;
