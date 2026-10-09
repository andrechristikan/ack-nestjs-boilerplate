import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticLoginSpikeIpAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Login Spike Ip List Request schema for paginated list query.
 * @public
 */
export const AnalyticLoginSpikeIpListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOffsetQuerySchema.shape.orderBy.meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticLoginSpikeIpAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticLoginSpikeIpAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticLoginSpikeIpListRequestSchema.
 * @public
 */
export type AnalyticLoginSpikeIpListRequestDto = z.infer<
    typeof AnalyticLoginSpikeIpListRequestSchema
>;
