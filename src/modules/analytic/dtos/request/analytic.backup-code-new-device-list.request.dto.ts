import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { EnumAnalyticBackupCodeNewDeviceOrderBy } from '@modules/analytic/enums/analytic.enum';

/** @public */
export const AnalyticBackupCodeNewDeviceListRequestSchema =
    PaginationOffsetQuerySchema.omit({ search: true }).extend({
        orderBy: z
            .union([
                z.enum(EnumAnalyticBackupCodeNewDeviceOrderBy),
                z.literal(''),
            ])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumAnalyticBackupCodeNewDeviceOrderBy).join(', ')}. An empty or absent value uses \`${EnumAnalyticBackupCodeNewDeviceOrderBy.latest}\`.`,
                example: EnumAnalyticBackupCodeNewDeviceOrderBy.latest,
            }),
    });

/** @public */
export type AnalyticBackupCodeNewDeviceListRequestDto = z.infer<
    typeof AnalyticBackupCodeNewDeviceListRequestSchema
>;
