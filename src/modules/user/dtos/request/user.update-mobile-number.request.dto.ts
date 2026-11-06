import { z } from 'zod';
import { UserAddMobileNumberRequestSchema } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';

/** @alias */
export const UserUpdateMobileNumberRequestSchema =
    UserAddMobileNumberRequestSchema;

/** @public */
export type UserUpdateMobileNumberRequestDto = z.infer<
    typeof UserUpdateMobileNumberRequestSchema
>;
