import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const DeviceRemoveRequestSchema = UserReauthenticationRequestSchema;

/** @public */
export type DeviceRemoveRequestDto = z.infer<typeof DeviceRemoveRequestSchema>;
