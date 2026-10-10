import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { UserLoginResponseSchema } from '@modules/user/dtos/response/user.login.response.dto';

describe('UserLoginResponseSchema', () => {
    const workspace = {
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
    };

    it('selects a token login result and preserves nullable workspace fields', () => {
        const result = UserLoginResponseSchema.parse({
            isTwoFactorEnable: false,
            ...workspace,
            tokens: {
                tokenType: 'Bearer',
                roleKey: EnumRolePlatformKey.user,
                roleScope: EnumRoleScope.platform,
                expiresIn: 3600,
                accessToken: 'access',
                refreshToken: 'refresh',
                secret: 'hidden',
            },
            password: 'hidden',
        });

        expect(result.lastWorkspaceId).toBeNull();
        expect(result.lastWorkspaceChangedAt).toBeNull();
        expect(result.tokens).not.toHaveProperty('secret');
        expect(result).not.toHaveProperty('password');
    });

    it('selects a two-factor challenge result', () => {
        const result = UserLoginResponseSchema.parse({
            isTwoFactorEnable: true,
            lastWorkspaceId: 'workspace-id',
            lastWorkspaceChangedAt: new Date(),
            twoFactor: {
                isRequiredSetup: false,
                challengeToken: 'challenge',
                challengeExpiresInMs: 300_000,
                backupCodesRemaining: 8,
            },
        });

        expect(result.twoFactor?.challengeToken).toBe('challenge');
        expect(result.tokens).toBeUndefined();
    });
});
