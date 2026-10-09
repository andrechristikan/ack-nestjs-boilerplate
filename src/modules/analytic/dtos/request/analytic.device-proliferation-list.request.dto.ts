import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticDeviceProliferationAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';

/**
 * Analytic Device Proliferation List Request schema for paginated list query.
 * @public
 */
export const AnalyticDeviceProliferationListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: PaginationOrderBySchema(
            AnalyticDeviceProliferationAvailableOrderBy
        ),
    });

/**
 * Inferred DTO for AnalyticDeviceProliferationListRequestSchema.
 * @public
 */
export type AnalyticDeviceProliferationListRequestDto = z.infer<
    typeof AnalyticDeviceProliferationListRequestSchema
>;
