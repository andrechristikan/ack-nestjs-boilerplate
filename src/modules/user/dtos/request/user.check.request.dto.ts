import { z } from 'zod';
import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

export const UserCheckUsernameRequestSchema = UserClaimUsernameRequestSchema;

export type UserCheckUsernameRequestDto = z.infer<
    typeof UserCheckUsernameRequestSchema
>;

export const UserCheckEmailRequestSchema = UserCreateRequestSchema.pick({
    email: true,
});

export type UserCheckEmailRequestDto = z.infer<
    typeof UserCheckEmailRequestSchema
>;
