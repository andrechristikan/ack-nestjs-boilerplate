import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticCredentialStuffingOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticCredentialStuffingListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([
                z.enum(EnumAnalyticCredentialStuffingOrderBy),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticCredentialStuffingOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticCredentialStuffingOrderBy.mostUsers}\`.`,
                example: EnumAnalyticCredentialStuffingOrderBy.mostUsers,
            }),
    });

/** @public */
export type AnalyticCredentialStuffingListRequestDto = z.infer<
    typeof AnalyticCredentialStuffingListRequestSchema
>;
