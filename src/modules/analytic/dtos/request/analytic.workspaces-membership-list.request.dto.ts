import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticWorkspacesMembershipListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumAnalyticCountOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticCountOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticCountOrderBy.mostCount}\`.`,
                example: EnumAnalyticCountOrderBy.mostCount,
            }),
    });

/** @public */
export type AnalyticWorkspacesMembershipListRequestDto = z.infer<
    typeof AnalyticWorkspacesMembershipListRequestSchema
>;
