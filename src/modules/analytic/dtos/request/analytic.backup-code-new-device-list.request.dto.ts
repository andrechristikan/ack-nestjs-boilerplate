import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticBackupCodeNewDeviceAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Backup Code New Device List Request schema for paginated list query.
 * @public
 */
export const AnalyticBackupCodeNewDeviceListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true })
        .extend({
            orderBy: PaginationOrderBySchema(
                AnalyticBackupCodeNewDeviceAvailableOrderBy
            ),
        })
        .extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticBackupCodeNewDeviceListRequestSchema.
 * @public
 */
export type AnalyticBackupCodeNewDeviceListRequestDto = z.infer<
    typeof AnalyticBackupCodeNewDeviceListRequestSchema
>;
