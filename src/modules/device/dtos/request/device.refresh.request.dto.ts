import { z } from 'zod';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

/**
 * Validates the body for refreshing the current device details.
 * @public
 */
export const DeviceRefreshRequestSchema = DeviceRequestSchema.omit({
    fingerprint: true,
});

/**
 * Body for refreshing the current device details.
 * @public
 */
export type DeviceRefreshRequestDto = z.infer<
    typeof DeviceRefreshRequestSchema
>;
