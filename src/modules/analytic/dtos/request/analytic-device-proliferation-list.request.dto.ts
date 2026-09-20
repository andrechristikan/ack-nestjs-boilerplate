import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticDeviceProliferationAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';

/**
 * Analytic Device Proliferation List Request schema for paginated list query.
 * @public
 */
export const AnalyticDeviceProliferationListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticDeviceProliferationAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticDeviceProliferationAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    });

/**
 * Inferred DTO for AnalyticDeviceProliferationListRequestSchema.
 * @public
 */
export type AnalyticDeviceProliferationListRequestDto = z.infer<
    typeof AnalyticDeviceProliferationListRequestSchema
>;
