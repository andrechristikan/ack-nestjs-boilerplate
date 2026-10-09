import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { DeviceCursorAvailableOrderBy } from '@modules/device/constants/device.list.constant';

/**
 * Device Shared List Request schema for paginated list query.
 * @public
 */
export const DeviceSharedListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationOrderBySchema(DeviceCursorAvailableOrderBy),
});

/**
 * Inferred DTO for DeviceSharedListRequestSchema.
 * @public
 */
export type DeviceSharedListRequestDto = z.infer<
    typeof DeviceSharedListRequestSchema
>;
