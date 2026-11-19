import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticSessionAfterAdminOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticSessionAfterAdminListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([
                z.enum(EnumAnalyticSessionAfterAdminOrderBy),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticSessionAfterAdminOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticSessionAfterAdminOrderBy.latest}\`.`,
                example: EnumAnalyticSessionAfterAdminOrderBy.latest,
            }),
    });

/** @public */
export type AnalyticSessionAfterAdminListRequestDto = z.infer<
    typeof AnalyticSessionAfterAdminListRequestSchema
>;
