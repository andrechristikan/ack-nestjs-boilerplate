import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type {
    IMfaAttemptFailure,
    IMfaReauthenticationResult,
} from '@modules/mfa/interfaces/mfa.interface';
import type {
    IUserImport,
    IUserImportEncrypted,
    IUserPasswordAttemptLimit,
    IUserReauthenticationPasswordResult,
} from '@modules/user/interfaces/user.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { UserImportEncryptionPurpose } from '@modules/user/constants/user.constant';
import {
    TestUnitKitConfigValues,
    TestUnitKitEncryptionSecret,
} from '@test/unit/helpers/test.unit.kit.helper';

export const TestUnitUserConfigValues: Record<string, unknown> = {
    ...TestUnitKitConfigValues,
    'message.availableLanguages': ['en'],
    'frontend.baseUrl': 'https://example.com',
    'verification.reference.prefix': 'VRF',
    'verification.reference.length': 8,
    'verification.expiresInMinutes': 15,
    'verification.tokenLength': 32,
    'verification.resendInMinutes': 5,
    'verification.linkPattern': '{frontendBaseUrl}/verify-email?token={token}',
    'workspace.personalNamePattern': "{username}'s Workspace",
    'workspace.slugPrefix': 'w-',
    'workspace.slugMaxLength': 30,
    'workspace.slugMaxAttempts': 3,
    'auth.password.temporaryExpiresInMs': 3600000,
    'auth.password.periodInDays': 90,
    'auth.password.temporaryLength': 14,
    'auth.jwt.jtiLength': 16,
};

export const TestUnitReauthenticationPasswordLimit: IUserPasswordAttemptLimit =
    {
        maxAttempts: 5,
        lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
    };

export const TestUnitReauthenticationPasswordPassed: IUserReauthenticationPasswordResult =
    { isPasswordChecked: true, limit: null };

export const TestUnitReauthenticationMfaOff: IMfaReauthenticationResult = {
    isEnabled: false,
    check: null,
    failure: null,
    passkeyChallengeToken: null,
};

export const TestUnitReauthenticationMfaFailure: IMfaAttemptFailure = {
    method: EnumMfaMethod.totp,
    maxAttempts: 5,
    lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
};

export function buildSealedImportRows(
    rows: IUserImport[],
    actorUserId: string
): IUserImportEncrypted[] {
    const helperEncryptionService = new HelperEncryptionService();
    const sealed: IUserImportEncrypted[] = [];
    for (const { email, ...row } of rows) {
        sealed.push({
            ...row,
            encryptedEmail: helperEncryptionService.aes256Encrypt(
                email,
                TestUnitKitEncryptionSecret,
                UserImportEncryptionPurpose,
                actorUserId
            ),
        });
    }

    return sealed;
}
