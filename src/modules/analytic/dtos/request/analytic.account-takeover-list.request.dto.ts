import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticAccountTakeoverAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';

/** @public */
export const AnalyticAccountTakeoverListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: z
                .union([
                    z.templateLiteral([
                        z.enum(AnalyticAccountTakeoverAvailableOrderBy),
                        ':',
                        z.enum(EnumPaginationOrderDirectionType),
                    ]),
                    z.literal(''),
                ])
                .optional()
                .meta({
                    description: `Order by field in \`field:direction\` format (e.g. \`${AnalyticAccountTakeoverAvailableOrderBy[0]}:desc\`). Available fields: ${AnalyticAccountTakeoverAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}.`,
                    example: `${AnalyticAccountTakeoverAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
                }),
        })
        .extend(AnalyticDateRangeRequestSchema.shape);

/** @public */
export type AnalyticAccountTakeoverListRequestDto = z.infer<
    typeof AnalyticAccountTakeoverListRequestSchema
>;
