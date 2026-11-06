import { z } from 'zod';
import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';

/** @public */
export const UserCheckUsernameRequestSchema = UserClaimUsernameRequestSchema;

/** @public */
export type UserCheckUsernameRequestDto = z.infer<
    typeof UserCheckUsernameRequestSchema
>;
