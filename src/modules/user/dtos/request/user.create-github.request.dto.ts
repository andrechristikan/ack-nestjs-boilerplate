import { z } from 'zod';
import { AuthSocialGithubRequestSchema } from '@modules/auth/dtos/request/auth.social-github.request.dto';
import { UserCreateSocialRequestSchema } from '@modules/user/dtos/request/user.create-social.request.dto';

/** @public */
export const UserCreateGithubRequestSchema =
    UserCreateSocialRequestSchema.extend(AuthSocialGithubRequestSchema.shape);

/** @public */
export type UserCreateGithubRequestDto = z.infer<
    typeof UserCreateGithubRequestSchema
>;
