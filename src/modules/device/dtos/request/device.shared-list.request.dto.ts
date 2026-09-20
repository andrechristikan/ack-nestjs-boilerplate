import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { DeviceCursorAvailableOrderBy } from '@modules/device/constants/device.list.constant';

/**
 * Device Shared List Request schema for paginated list query.
 * @public
 */
export const DeviceSharedListRequestSchema = PaginationCursorQuerySchema.extend(
    {
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${DeviceCursorAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${DeviceCursorAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
    }
);

/**
 * Inferred DTO for DeviceSharedListRequestSchema.
 * @public
 */
export type DeviceSharedListRequestDto = z.infer<
    typeof DeviceSharedListRequestSchema
>;
