import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { AnalyticBackupCodeNewDeviceAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticWindowRequestSchema } from '@modules/analytic/dtos/request/analytic.window.request.dto';

/**
 * Analytic Backup Code New Device List Request schema for paginated list query.
 * @public
 */
export const AnalyticBackupCodeNewDeviceListRequestSchema =
    PaginationOffsetQuerySchema.extend({
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${AnalyticBackupCodeNewDeviceAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${AnalyticBackupCodeNewDeviceAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }).extend(AnalyticWindowRequestSchema.shape);

/**
 * Inferred DTO for AnalyticBackupCodeNewDeviceListRequestSchema.
 * @public
 */
export type AnalyticBackupCodeNewDeviceListRequestDto = z.infer<
    typeof AnalyticBackupCodeNewDeviceListRequestSchema
>;
