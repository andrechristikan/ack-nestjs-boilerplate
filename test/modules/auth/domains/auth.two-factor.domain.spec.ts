import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSecret, verifySync } from 'otplib';

import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { AuthTwoFactorSecretEncryptionPurpose } from '@modules/auth/constants/auth.constant';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import type {
    IUser,
    IUserTwoFactor,
} from '@modules/user/interfaces/user.interface';

vi.mock('otplib', () => ({
    generateSecret: vi.fn(() => 'TOTPSECRET'),
    generateURI: vi.fn(() => 'otpauth://totp/ACK:user@example.com'),
    verifySync: vi.fn(() => ({ valid: true, delta: 0 })),
}));

describe('AuthTwoFactorDomain', () => {
    const aes256Decrypt = vi.fn<HelperEncryptionService['aes256Decrypt']>(
        () => 'plain-secret'
    );
    const helperEncryptionService = {
        aes256Encrypt: vi.fn<HelperEncryptionService['aes256Encrypt']>(),
        aes256Decrypt,
    } satisfies Pick<
        HelperEncryptionService,
        'aes256Encrypt' | 'aes256Decrypt'
    >;
    const helperStringService = {
        randomUppercase: vi.fn<HelperStringService['randomUppercase']>(),
    } satisfies Pick<HelperStringService, 'randomUppercase'>;
    const helperHashService = {
        sha256Hash: vi.fn<HelperHashService['sha256Hash']>(),
        sha256Compare: vi.fn<HelperHashService['sha256Compare']>(),
    } satisfies Pick<HelperHashService, 'sha256Hash' | 'sha256Compare'>;
    const authTwoFactorUtil = {
        createKeyUri: vi.fn<AuthTwoFactorUtil['createKeyUri']>(),
    } satisfies Pick<AuthTwoFactorUtil, 'createKeyUri'>;
    const sentryService = {
        captureException: vi.fn<SentryService['captureException']>(),
    } satisfies Pick<SentryService, 'captureException'>;
    const configService = new ConfigService({
        'auth.twoFactor.strategy': 'totp',
        'auth.twoFactor.algorithm': 'sha1',
        'auth.twoFactor.digits': 6,
        'auth.twoFactor.periodInSeconds': 30,
        'auth.twoFactor.window': 1,
        'auth.twoFactor.secretLength': 20,
        'auth.twoFactor.backupCodes.count': 2,
        'auth.twoFactor.backupCodes.length': 10,
        'auth.twoFactor.encryption.key': 'encryption-key',
        'auth.twoFactor.maxAttempt': 5,
    });
    const now = new Date('2026-01-01T00:00:00.000Z');
    const twoFactor = {
        id: 'two-factor-id',
        userId: 'user-id',
        secret: 'encrypted-secret',
        pendingSecret: null,
        enabled: true,
        requiredSetup: false,
        confirmedAt: now,
        lastUsedAt: null,
        attempt: 0,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        backupCodes: [
            {
                id: 'backup-id-1',
                twoFactorId: 'two-factor-id',
                codeHash: 'hash-one',
                usedAt: null,
                createdAt: now,
            },
            {
                id: 'backup-id-2',
                twoFactorId: 'two-factor-id',
                codeHash: 'hash-two',
                usedAt: null,
                createdAt: now,
            },
        ],
    } satisfies IUserTwoFactor;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor,
    } satisfies IUser;

    let service: AuthTwoFactorDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(generateSecret).mockReturnValue('TOTPSECRET');
        vi.mocked(verifySync).mockReturnValue({ valid: true, delta: 0 });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorDomain,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: AuthTwoFactorUtil, useValue: authTwoFactorUtil },
                { provide: SentryService, useValue: sentryService },
            ],
        }).compile();
        service = moduleRef.get(AuthTwoFactorDomain);
    });

    it('verifies a trimmed authenticator code with configured tolerance', async () => {
        await expect(
            service.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: ' 123456 ',
            })
        ).resolves.toEqual({
            isValid: true,
            method: EnumAuthTwoFactorMethod.code,
        });
        expect(verifySync).toHaveBeenCalledWith({
            token: '123456',
            secret: 'plain-secret',
            algorithm: 'sha1',
            strategy: 'totp',
            digits: 6,
            period: 30,
            epochTolerance: [30, 0],
        });
    });

    it('rejects an empty authenticator code before decrypting the secret', async () => {
        await expect(
            service.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: '   ',
            })
        ).resolves.toEqual({
            isValid: false,
            method: EnumAuthTwoFactorMethod.code,
        });
        expect(aes256Decrypt).not.toHaveBeenCalled();
    });

    it('rejects a nonempty authenticator code that does not verify', async () => {
        vi.mocked(verifySync).mockReturnValue({ valid: false });

        await expect(
            service.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            })
        ).resolves.toEqual({
            isValid: false,
            method: EnumAuthTwoFactorMethod.code,
        });
    });

    it('returns the consumed hash for a valid normalized backup code', async () => {
        helperHashService.sha256Hash.mockReturnValue('input-hash');
        helperHashService.sha256Compare.mockImplementation(
            hash => hash === 'hash-two'
        );

        await expect(
            service.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: ' BACKUP02 ',
            })
        ).resolves.toEqual({
            isValid: true,
            method: EnumAuthTwoFactorMethod.backupCodes,
            usedBackupCodeHash: 'hash-two',
        });
        expect(helperHashService.sha256Hash).toHaveBeenCalledWith('BACKUP02');
    });

    it('rejects backup verification when no active codes remain', async () => {
        await expect(
            service.verifyTwoFactor(
                { ...twoFactor, backupCodes: [] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: 'BACKUP02',
                }
            )
        ).resolves.toEqual({
            isValid: false,
            method: EnumAuthTwoFactorMethod.backupCodes,
        });
        expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
    });

    it('rejects a backup code that matches no active hash', async () => {
        helperHashService.sha256Hash.mockReturnValue('input-hash');
        helperHashService.sha256Compare.mockReturnValue(false);

        await expect(
            service.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'UNKNOWN01',
            })
        ).resolves.toEqual({
            isValid: false,
            method: EnumAuthTwoFactorMethod.backupCodes,
        });
    });

    it('generates uppercase backup codes and their hashes', () => {
        helperStringService.randomUppercase
            .mockReturnValueOnce('ABC123DEF4')
            .mockReturnValueOnce('GHI567JKL8');
        helperHashService.sha256Hash.mockImplementation(code => `hash:${code}`);

        expect(service.generateBackupCodes()).toEqual({
            codes: ['ABC123DEF4', 'GHI567JKL8'],
            hashes: ['hash:ABC123DEF4', 'hash:GHI567JKL8'],
        });
    });

    it('assembles an encrypted enrollment secret and authenticator URI', async () => {
        helperEncryptionService.aes256Encrypt.mockReturnValue(
            'encrypted-secret'
        );
        authTwoFactorUtil.createKeyUri.mockReturnValue('otpauth://totp/ACK');

        const result = await service.setupTwoFactor(
            'user-id',
            'user@example.com'
        );

        expect(result).toMatchObject({
            secret: 'TOTPSECRET',
            encryptedSecret: 'encrypted-secret',
            otpauthUrl: 'otpauth://totp/ACK',
        });
        expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
            'TOTPSECRET',
            'encryption-key',
            AuthTwoFactorSecretEncryptionPurpose,
            'user-id'
        );
    });

    it('reports an attempt lock at the configured inclusive boundary', () => {
        expect(
            service.checkAttempt({
                ...user,
                twoFactor: { ...twoFactor, attempt: 5 },
            })
        ).toBe(true);
        expect(
            service.checkAttempt({
                ...user,
                twoFactor: { ...twoFactor, attempt: 4 },
            })
        ).toBe(false);
    });
});
