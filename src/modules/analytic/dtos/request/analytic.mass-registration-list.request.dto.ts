import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';
import { EnumAnalyticKeyCountOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticMassRegistrationListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: z
                .union([z.enum(EnumAnalyticKeyCountOrderBy), z.literal('')])
                .optional()
                .meta({
                    description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticKeyCountOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticKeyCountOrderBy.mostCount}\`.`,
                    example: EnumAnalyticKeyCountOrderBy.mostCount,
                }),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/** @public */
export type AnalyticMassRegistrationListRequestDto = z.infer<
    typeof AnalyticMassRegistrationListRequestSchema
>;
