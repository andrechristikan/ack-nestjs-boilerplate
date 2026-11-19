import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticImpossibleTravelOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticImpossibleTravelListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([z.enum(EnumAnalyticImpossibleTravelOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticImpossibleTravelOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticImpossibleTravelOrderBy.highestValue}\`.`,
                example: EnumAnalyticImpossibleTravelOrderBy.highestValue,
            }),
    });

/** @public */
export type AnalyticImpossibleTravelListRequestDto = z.infer<
    typeof AnalyticImpossibleTravelListRequestSchema
>;
