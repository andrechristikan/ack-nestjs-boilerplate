import type { IUserReauthenticationFailure } from '@modules/user/interfaces/user.interface';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

export const TestUnitUserConfigValues: Record<string, unknown> = {
    ...TestUnitKitConfigValues,
    'message.availableLanguages': ['en'],
    'frontend.baseUrl': 'https://example.com',
    'verification.reference.prefix': 'VRF',
    'verification.reference.length': 8,
    'verification.expiresInMinutes': 15,
    'verification.tokenLength': 32,
    'verification.resendInMinutes': 5,
    'verification.linkPattern': '{frontendBaseUrl}/verify?token={token}',
    'workspace.personalNamePattern': "{username}'s Workspace",
    'workspace.slugPrefix': 'w-',
    'workspace.slugMaxLength': 30,
    'workspace.slugMaxAttempts': 3,
    'auth.password.temporaryExpiresInMs': 3600000,
    'auth.password.periodInDays': 90,
    'auth.password.temporaryLength': 14,
    'auth.jwt.jtiLength': 16,
};

export const TestUnitReauthenticationPasswordFailure: IUserReauthenticationFailure =
    {
        password: {
            maxAttempts: 5,
            lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
        },
        mfa: null,
    };
