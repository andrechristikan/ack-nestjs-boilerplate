import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { TwoFactor } from '@generated/prisma-client/client';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import type { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import type { SentryService } from '@common/sentry/services/sentry.service';
import { AuthTwoFactorSecretEncryptionPurpose } from '@modules/auth/constants/auth.constant';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import type { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import type { IUser } from '@modules/user/interfaces/user.interface';

vi.mock('otplib', () => ({
    generateSecret: vi.fn(),
    verifySync: vi.fn(),
}));

describe('AuthTwoFactorDomain', () => {
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const authTwoFactorUtil: MockProxy<AuthTwoFactorUtil> =
        mock<AuthTwoFactorUtil>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let generateSecret: typeof import('otplib').generateSecret;
    let verifySync: typeof import('otplib').verifySync;
    let AuthTwoFactorDomain: typeof import('@modules/auth/domains/auth.two-factor.domain').AuthTwoFactorDomain;
    let HelperDecryptFailedException: typeof import('@common/helper/exceptions/helper.decrypt-failed.exception').HelperDecryptFailedException;
    let HelperEncryptionServiceClass: typeof import('@common/helper/services/helper.encryption.service').HelperEncryptionService;
    let HelperHashServiceClass: typeof import('@common/helper/services/helper.hash.service').HelperHashService;
    let HelperStringServiceClass: typeof import('@common/helper/services/helper.string.service').HelperStringService;
    let SentryServiceClass: typeof import('@common/sentry/services/sentry.service').SentryService;
    let AuthTwoFactorUtilClass: typeof import('@modules/auth/utils/auth.two-factor.util').AuthTwoFactorUtil;

    let domain: InstanceType<typeof AuthTwoFactorDomain>;

    const twoFactor: TwoFactor = {
        id: 'two-factor-1',
        userId: 'user-1',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: [],
        enabled: true,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseUser: IUser = {
        id: 'user-1',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'jane@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ generateSecret, verifySync } = await import('otplib'));
        ({ AuthTwoFactorDomain } =
            await import('@modules/auth/domains/auth.two-factor.domain'));
        ({ HelperDecryptFailedException } =
            await import('@common/helper/exceptions/helper.decrypt-failed.exception'));
        ({ HelperEncryptionService: HelperEncryptionServiceClass } =
            await import('@common/helper/services/helper.encryption.service'));
        ({ HelperHashService: HelperHashServiceClass } =
            await import('@common/helper/services/helper.hash.service'));
        ({ HelperStringService: HelperStringServiceClass } =
            await import('@common/helper/services/helper.string.service'));
        ({ SentryService: SentryServiceClass } =
            await import('@common/sentry/services/sentry.service'));
        ({ AuthTwoFactorUtil: AuthTwoFactorUtilClass } =
            await import('@modules/auth/utils/auth.two-factor.util'));

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.strategy': 'totp',
                'auth.twoFactor.algorithm': 'sha1',
                'auth.twoFactor.digits': 6,
                'auth.twoFactor.periodInSeconds': 30,
                'auth.twoFactor.window': 1,
                'auth.twoFactor.secretLength': 20,
                'auth.twoFactor.backupCodes.count': 5,
                'auth.twoFactor.backupCodes.length': 10,
                'auth.twoFactor.encryption.key': 'encryption-key',
                'auth.twoFactor.maxAttempt': 5,
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorDomain,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperEncryptionServiceClass,
                    useValue: helperEncryptionService,
                },
                {
                    provide: HelperStringServiceClass,
                    useValue: helperStringService,
                },
                {
                    provide: HelperHashServiceClass,
                    useValue: helperHashService,
                },
                {
                    provide: AuthTwoFactorUtilClass,
                    useValue: authTwoFactorUtil,
                },
                { provide: SentryServiceClass, useValue: sentryService },
            ],
        }).compile();

        domain = module.get(AuthTwoFactorDomain);
    });

    describe('generateSecret', () => {
        it('generates a secret of the configured length', () => {
            vi.mocked(generateSecret).mockReturnValue('generated-secret');

            const result = domain.generateSecret();

            expect(result).toBe('generated-secret');
            expect(generateSecret).toHaveBeenCalledWith({ length: 20 });
        });
    });

    describe('verifyCode', () => {
        it('returns true when the code verifies within the configured window', () => {
            vi.mocked(verifySync).mockReturnValue({
                valid: true,
                delta: 0,
                epoch: 0,
                timeStep: 0,
            });

            const result = domain.verifyCode('secret', '123456');

            expect(result).toBe(true);
            expect(verifySync).toHaveBeenCalledWith({
                token: '123456',
                secret: 'secret',
                algorithm: 'sha1',
                strategy: 'totp',
                digits: 6,
                period: 30,
                epochTolerance: [30, 0],
            });
        });

        it('returns false when the code does not verify', () => {
            vi.mocked(verifySync).mockReturnValue({ valid: false });

            const result = domain.verifyCode('secret', 'wrong-code');

            expect(result).toBe(false);
        });
    });

    describe('generateBackupCodes', () => {
        it('generates the configured number of codes with their SHA-256 hashes', () => {
            helperStringService.randomUppercase
                .mockReturnValueOnce('CODE1')
                .mockReturnValueOnce('CODE2')
                .mockReturnValueOnce('CODE3')
                .mockReturnValueOnce('CODE4')
                .mockReturnValueOnce('CODE5');
            helperHashService.sha256Hash.mockImplementation(
                code => `hash-${code}`
            );

            const result = domain.generateBackupCodes();

            expect(result).toEqual({
                codes: ['CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5'],
                hashes: [
                    'hash-CODE1',
                    'hash-CODE2',
                    'hash-CODE3',
                    'hash-CODE4',
                    'hash-CODE5',
                ],
            });
            expect(helperStringService.randomUppercase).toHaveBeenCalledTimes(
                5
            );
            expect(helperStringService.randomUppercase).toHaveBeenCalledWith(
                10
            );
        });
    });

    describe('verifyBackupCode', () => {
        it('returns the matched index when a stored hash matches', () => {
            helperHashService.sha256Hash.mockReturnValue('hash-of-input');
            helperHashService.sha256Compare.mockImplementation(
                hash => hash === 'hash-2'
            );

            const result = domain.verifyBackupCode(
                ['hash-1', 'hash-2', 'hash-3'],
                'input-code'
            );

            expect(result).toEqual({ isValid: true, index: 1 });
        });

        it('returns isValid false and index -1 when no hash matches', () => {
            helperHashService.sha256Hash.mockReturnValue('hash-of-input');
            helperHashService.sha256Compare.mockReturnValue(false);

            const result = domain.verifyBackupCode(
                ['hash-1', 'hash-2'],
                'input-code'
            );

            expect(result).toEqual({ isValid: false, index: -1 });
        });
    });

    describe('verifyTwoFactor', () => {
        it('answers invalid when the code method carries a blank code', async () => {
            const result = await domain.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: '   ',
            });

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.code,
            });
        });

        it('answers invalid when the backup-code method carries a blank code', async () => {
            const result = await domain.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: undefined,
            });

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.backupCodes,
            });
        });

        it('verifies a totp code against the decrypted secret', async () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'decrypted-secret'
            );
            vi.mocked(verifySync).mockReturnValue({
                valid: true,
                delta: 0,
                epoch: 0,
                timeStep: 0,
            });

            const result = await domain.verifyTwoFactor(twoFactor, {
                method: EnumAuthTwoFactorMethod.code,
                code: ' 123456 ',
            });

            expect(result).toEqual({
                isValid: true,
                method: EnumAuthTwoFactorMethod.code,
            });
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'encrypted-secret',
                'encryption-key',
                AuthTwoFactorSecretEncryptionPurpose,
                'user-1'
            );
        });

        it('answers invalid when no backup codes are stored', async () => {
            const result = await domain.verifyTwoFactor(
                { ...twoFactor, backupCodes: [] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: 'BACKUP1',
                }
            );

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.backupCodes,
            });
        });

        it('answers invalid when the backup code does not match any stored hash', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-of-input');
            helperHashService.sha256Compare.mockReturnValue(false);

            const result = await domain.verifyTwoFactor(
                { ...twoFactor, backupCodes: ['hash-1', 'hash-2'] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: 'BACKUP1',
                }
            );

            expect(result).toEqual({
                isValid: false,
                method: EnumAuthTwoFactorMethod.backupCodes,
            });
        });

        it('consumes the matched backup code and returns the remaining codes', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-of-input');
            helperHashService.sha256Compare.mockImplementation(
                hash => hash === 'hash-2'
            );

            const result = await domain.verifyTwoFactor(
                { ...twoFactor, backupCodes: ['hash-1', 'hash-2', 'hash-3'] },
                {
                    method: EnumAuthTwoFactorMethod.backupCodes,
                    backupCode: ' BACKUP1 ',
                }
            );

            expect(result).toEqual({
                isValid: true,
                method: EnumAuthTwoFactorMethod.backupCodes,
                newBackupCodes: ['hash-1', 'hash-3'],
            });
        });
    });

    describe('verifySetupCode', () => {
        it('verifies a code against the decrypted pending secret', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'decrypted-pending-secret'
            );
            vi.mocked(verifySync).mockReturnValue({
                valid: true,
                delta: 0,
                epoch: 0,
                timeStep: 0,
            });

            const result = domain.verifySetupCode(
                'encrypted-pending-secret',
                'user-1',
                ' 123456 '
            );

            expect(result).toBe(true);
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'encrypted-pending-secret',
                'encryption-key',
                AuthTwoFactorSecretEncryptionPurpose,
                'user-1'
            );
        });
    });

    describe('setupTwoFactor', () => {
        it('generates a secret, encrypts it and builds the otpauth url', async () => {
            vi.mocked(generateSecret).mockReturnValue('generated-secret');
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'encrypted-secret'
            );
            authTwoFactorUtil.createKeyUri.mockReturnValue(
                'otpauth://totp/uri'
            );

            const result = await domain.setupTwoFactor(
                'user-1',
                'jane@example.com'
            );

            expect(result).toEqual({
                otpauthUrl: 'otpauth://totp/uri',
                secret: 'generated-secret',
                encryptedSecret: 'encrypted-secret',
            });
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'generated-secret',
                'encryption-key',
                AuthTwoFactorSecretEncryptionPurpose,
                'user-1'
            );
            expect(authTwoFactorUtil.createKeyUri).toHaveBeenCalledWith(
                'jane@example.com',
                'generated-secret'
            );
        });
    });

    describe('checkAttempt', () => {
        it('returns true when the attempt count reached the maximum', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...twoFactor, attempt: 5 },
            };

            expect(domain.checkAttempt(user)).toBe(true);
        });

        it('returns false when the attempt count is below the maximum', () => {
            const user = {
                ...baseUser,
                twoFactor: { ...twoFactor, attempt: 1 },
            };

            expect(domain.checkAttempt(user)).toBe(false);
        });

        it('treats a missing two-factor record as zero attempts', () => {
            const user = { ...baseUser, twoFactor: null };

            expect(domain.checkAttempt(user)).toBe(false);
        });
    });

    describe('readSecret', () => {
        it('throws AuthTwoFactorSecretUnavailableException when no secret is stored', () => {
            let thrown: unknown;
            try {
                domain['readSecret'](null, 'user-1');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable
                    ],
                messagePath: 'auth.error.twoFactorSecretUnavailable',
            });
        });

        it('returns the decrypted secret when decryption succeeds', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'decrypted-secret'
            );

            const result = domain['readSecret']('encrypted-secret', 'user-1');

            expect(result).toBe('decrypted-secret');
        });

        it('reports and translates a decrypt failure into AuthTwoFactorSecretUnavailableException', () => {
            const decryptError = new HelperDecryptFailedException(
                new Error('tampered payload')
            );
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw decryptError;
            });

            let thrown: unknown;
            try {
                domain['readSecret']('encrypted-secret', 'user-1');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorSecretUnavailable,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorSecretUnavailable
                    ],
                messagePath: 'auth.error.twoFactorSecretUnavailable',
            });
            expect(sentryService.captureException).toHaveBeenCalledWith(
                decryptError
            );
        });

        it('rethrows an error that is not a decrypt failure', () => {
            const otherError = new Error('unexpected');
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw otherError;
            });

            let thrown: unknown;
            try {
                domain['readSecret']('encrypted-secret', 'user-1');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBe(otherError);
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('encryptSecret', () => {
        it('encrypts the secret with the configured key and the user id as context', () => {
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'encrypted-secret'
            );

            const result = domain['encryptSecret']('plain-secret', 'user-1');

            expect(result).toBe('encrypted-secret');
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'plain-secret',
                'encryption-key',
                AuthTwoFactorSecretEncryptionPurpose,
                'user-1'
            );
        });
    });

    describe('decryptSecret', () => {
        it('decrypts the secret with the configured key and the user id as context', () => {
            helperEncryptionService.aes256Decrypt.mockReturnValue(
                'plain-secret'
            );

            const result = domain['decryptSecret'](
                'encrypted-secret',
                'user-1'
            );

            expect(result).toBe('plain-secret');
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'encrypted-secret',
                'encryption-key',
                AuthTwoFactorSecretEncryptionPurpose,
                'user-1'
            );
        });
    });
});
