import { EnumRoleType } from '@generated/prisma-client/client';
import { UserLoginResponseSchema } from '@modules/user/dtos/response/user.login.response.dto';

describe('UserLoginResponseSchema', () => {
    const lastWorkspaceChangedAt = new Date('2026-01-01T00:00:00.000Z');

    const tokens = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
    };

    const twoFactor = {
        isRequiredSetup: false,
        challengeToken: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
        challengeExpiresInMs: 300000,
        backupCodesRemaining: 8,
    };

    const row = {
        isTwoFactorEnable: false,
        lastWorkspaceId: 'workspace-1',
        lastWorkspaceChangedAt,
        tokens,
        twoFactor,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserLoginResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a row with no tokens and no twoFactor', () => {
        const { tokens: _tokens, twoFactor: _twoFactor, ...rest } = row;

        const result = UserLoginResponseSchema.parse(rest);

        expect(result).toEqual(rest);
    });

    it('parses a null lastWorkspaceId and lastWorkspaceChangedAt', () => {
        const nullRow = {
            ...row,
            lastWorkspaceId: null,
            lastWorkspaceChangedAt: null,
        };

        const result = UserLoginResponseSchema.parse(nullRow);

        expect(result).toEqual(nullRow);
    });

    it('strips an undeclared key', () => {
        const result = UserLoginResponseSchema.parse({
            ...row,
            email: 'john.doe@example.com',
        });

        expect(result).toEqual(row);
    });
});
