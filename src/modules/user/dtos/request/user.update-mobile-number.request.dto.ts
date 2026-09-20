import { z } from 'zod';
import { UserAddMobileNumberRequestSchema } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';

/**
 * Validates the body that updates a user's mobile number; the same shape as adding one.
 * @alias
 * @public
 */
export const UserUpdateMobileNumberRequestSchema =
    UserAddMobileNumberRequestSchema;

/**
 * Body for updating a mobile number.
 * @public
 */
export type UserUpdateMobileNumberRequestDto = z.infer<
    typeof UserUpdateMobileNumberRequestSchema
>;
