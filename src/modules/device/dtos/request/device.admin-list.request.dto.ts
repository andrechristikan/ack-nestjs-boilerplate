import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';

/**
 * Offset list query for admin device listing.
 * @public
 */
export const DeviceAdminListRequestSchema = PaginationOffsetQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationOrderBySchema(DeviceDefaultAvailableOrderBy),
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
