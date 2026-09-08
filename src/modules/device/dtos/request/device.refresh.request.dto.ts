import { z } from 'zod';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

export const DeviceRefreshRequestSchema = DeviceRequestSchema.omit({
    fingerprint: true,
});

export type DeviceRefreshRequestDto = z.infer<
    typeof DeviceRefreshRequestSchema
>;
