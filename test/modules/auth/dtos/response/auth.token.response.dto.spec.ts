import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';

describe('AuthTokenResponseSchema', () => {
    it('serializes the token contract and strips undeclared secrets', () => {
        expect(
            AuthTokenResponseSchema.parse({
                tokenType: 'Bearer',
                roleKey: EnumRolePlatformKey.user,
                roleScope: EnumRoleScope.platform,
                expiresIn: 3600,
                accessToken: 'access-token',
                refreshToken: 'refreshInTx-token',
                password: 'password-hash',
                twoFactorSecret: 'totp-secret',
                jti: 'server-session-jti',
            })
        ).toEqual({
            tokenType: 'Bearer',
            roleKey: EnumRolePlatformKey.user,
            roleScope: EnumRoleScope.platform,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refreshInTx-token',
        });
    });
});
