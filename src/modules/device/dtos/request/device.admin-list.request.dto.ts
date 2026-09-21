import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';

/**
 * Offset list query for admin device listing.
 * @public
 */
export const DeviceAdminListRequestSchema = PaginationOffsetQuerySchema.extend({
    orderBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${DeviceDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${DeviceDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
        }),
    isRevoked: RequestBooleanStringSchema.optional().meta({
        description: "Filter by revoked ownership: 'true' or 'false'",
        example: 'true',
    }),
});

/**
 * Inferred DTO for DeviceAdminListRequestSchema.
 * @public
 */
export type DeviceAdminListRequestDto = z.infer<
    typeof DeviceAdminListRequestSchema
>;
