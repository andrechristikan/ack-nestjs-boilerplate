import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserLoginMfaResponseSchema } from '@modules/user/dtos/response/user.login-mfa.response.dto';

/** @public */
export const UserLoginResponseSchema = z.object({
    isMfaRequired: z.boolean().meta({
        description:
            'Indicates whether an additional MFA verification step is required',
        example: false,
    }),
    lastWorkspaceId: z.string().nullable().meta({
        description:
            'Id of the workspace the user last switched to; null when never set',
        example: faker.database.mongodbObjectId(),
    }),
    lastWorkspaceChangedAt: z.date().nullable().meta({
        description: 'When lastWorkspaceId last changed; null when never set',
        example: faker.date.recent(),
    }),
    tokens: AuthTokenResponseSchema.optional().meta({
        description: 'Provides access and refresh tokens upon successful login',
    }),
    mfa: UserLoginMfaResponseSchema.optional().meta({
        description:
            'Provides details for completing the MFA verification step',
    }),
});

/** @public */
export type UserLoginResponseDto = z.infer<typeof UserLoginResponseSchema>;
