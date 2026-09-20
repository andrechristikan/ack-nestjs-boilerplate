import { z } from 'zod';
import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';

/**
 * Validates the body for checking a username.
 * @public
 */
export const UserCheckUsernameRequestSchema = UserClaimUsernameRequestSchema;

/**
 * Body for checking a username.
 * @public
 */
export type UserCheckUsernameRequestDto = z.infer<
    typeof UserCheckUsernameRequestSchema
>;
