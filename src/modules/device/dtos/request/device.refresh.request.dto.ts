import { z } from 'zod';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

/** @public */
export const DeviceRefreshRequestSchema = DeviceRequestSchema.omit({
    fingerprint: true,
});

/** @public */
export type DeviceRefreshRequestDto = z.infer<
    typeof DeviceRefreshRequestSchema
>;
