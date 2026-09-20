import { describe, expect, it } from 'vitest';

import { EnumRoleType } from '@generated/prisma-client';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';

describe('AuthTokenResponseSchema', () => {
    it('serializes the token contract and strips undeclared secrets', () => {
        expect(
            AuthTokenResponseSchema.parse({
                tokenType: 'Bearer',
                roleType: EnumRoleType.user,
                expiresIn: 3600,
                accessToken: 'access-token',
                refreshToken: 'refreshInTx-token',
                password: 'password-hash',
                twoFactorSecret: 'totp-secret',
                jti: 'server-session-jti',
            })
        ).toEqual({
            tokenType: 'Bearer',
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refreshInTx-token',
        });
    });
});
