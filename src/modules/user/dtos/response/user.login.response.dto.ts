import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserTwoFactorResponseSchema } from '@modules/user/dtos/response/user.two-factor.response.dto';

/**
 * Login outcome: either the issued token pair, or the two-factor challenge that gates it.
 */
export const UserLoginResponseSchema = z.object({
    isTwoFactorEnable: z.boolean().meta({
        description:
            'Indicates whether an additional 2FA verification step is enable',
        example: false,
    }),
    lastWorkspaceId: z.string().nullable().meta({
        description:
            'Id of the workspace the user last switched to; null when never set',
        example: faker.string.uuid(),
    }),
    lastWorkspaceChangedAt: z.date().nullable().meta({
        description: 'When lastWorkspaceId last changed; null when never set',
        example: faker.date.recent(),
    }),
    tokens: AuthTokenResponseSchema.optional().meta({
        description: 'Provides access and refresh tokens upon successful login',
    }),
    twoFactor: UserTwoFactorResponseSchema.optional().meta({
        description:
            'Provides details for completing the 2FA verification step',
    }),
});

export type UserLoginResponseDto = z.infer<typeof UserLoginResponseSchema>;
