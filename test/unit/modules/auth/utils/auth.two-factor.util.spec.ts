import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import type { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthTwoFactorSecretEncryptionPurpose } from '@modules/auth/constants/auth.constant';

vi.mock('otplib', () => ({
    generateURI: vi.fn(),
    generateSecret: vi.fn(),
    verifySync: vi.fn(),
}));

describe('AuthTwoFactorUtil', () => {
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let generateURI: typeof import('otplib').generateURI;
    let generateSecret: typeof import('otplib').generateSecret;
    let verifySync: typeof import('otplib').verifySync;
    let AuthTwoFactorUtil: typeof import('@modules/auth/utils/auth.two-factor.util').AuthTwoFactorUtil;
    let HelperEncryptionServiceClass: typeof import('@common/helper/services/helper.encryption.service').HelperEncryptionService;
    let HelperHashServiceClass: typeof import('@common/helper/services/helper.hash.service').HelperHashService;
    let HelperStringServiceClass: typeof import('@common/helper/services/helper.string.service').HelperStringService;
    let util: InstanceType<typeof AuthTwoFactorUtil>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ generateURI, generateSecret, verifySync } = await import('otplib'));
        ({ AuthTwoFactorUtil } =
            await import('@modules/auth/utils/auth.two-factor.util'));
        ({ HelperEncryptionService: HelperEncryptionServiceClass } =
            await import('@common/helper/services/helper.encryption.service'));
        ({ HelperHashService: HelperHashServiceClass } =
            await import('@common/helper/services/helper.hash.service'));
        ({ HelperStringService: HelperStringServiceClass } =
            await import('@common/helper/services/helper.string.service'));

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'auth.twoFactor.strategy': 'totp',
                'auth.twoFactor.algorithm': 'sha1',
                'auth.twoFactor.issuer': 'AckBoilerplate',
                'auth.twoFactor.digits': 6,
                'auth.twoFactor.periodInSeconds': 30,
                'auth.twoFactor.window': 1,
                'auth.twoFactor.secretLength': 20,
                'auth.twoFactor.backupCodes.count': 5,
                'auth.twoFactor.backupCodes.length': 10,
                'auth.twoFactor.encryption.key': 'encryption-key',
            };
            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthTwoFactorUtil,
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
            ],
        }).compile();

        util = module.get(AuthTwoFactorUtil);
    });

    describe('createKeyUri', () => {
        it('builds the otpauth key URI from the issuer, email and secret', () => {
            vi.mocked(generateURI).mockReturnValue('otpauth://totp/uri');

            const result = util.createKeyUri('jane@example.com', 'secret');

            expect(result).toBe('otpauth://totp/uri');
            expect(generateURI).toHaveBeenCalledWith({
                issuer: 'AckBoilerplate',
                label: 'AckBoilerplate:jane@example.com',
                secret: 'secret',
                digits: 6,
                period: 30,
                strategy: 'totp',
                algorithm: 'sha1',
            });
        });
    });

    describe('generateSecret', () => {
        it('generates a secret of the configured length', () => {
            vi.mocked(generateSecret).mockReturnValue('generated-secret');

            const result = util.generateSecret();

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

            const result = util.verifyCode('secret', '123456');

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

            const result = util.verifyCode('secret', 'wrong-code');

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

            const result = util.generateBackupCodes();

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

            const result = util.verifyBackupCode(
                ['hash-1', 'hash-2', 'hash-3'],
                'input-code'
            );

            expect(result).toEqual({ isValid: true, index: 1 });
        });

        it('returns isValid false and index -1 when no hash matches', () => {
            helperHashService.sha256Hash.mockReturnValue('hash-of-input');
            helperHashService.sha256Compare.mockReturnValue(false);

            const result = util.verifyBackupCode(
                ['hash-1', 'hash-2'],
                'input-code'
            );

            expect(result).toEqual({ isValid: false, index: -1 });
        });
    });

    describe('encryptSecret', () => {
        it('encrypts the secret with the configured key and the user id as context', () => {
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'encrypted-secret'
            );

            const result = util.encryptSecret('plain-secret', 'user-1');

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

            const result = util.decryptSecret('encrypted-secret', 'user-1');

            expect(result).toBe('plain-secret');
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'encrypted-secret',
                'encryption-key',
                AuthTwoFactorSecretEncryptionPurpose,
                'user-1'
            );
        });
    });

    describe('toDecryptException', () => {
        it('maps a failed decryption to AuthTwoFactorSecretUnavailableException', async () => {
            const { HelperDecryptFailedException } =
                await import('@common/helper/exceptions/helper.decrypt-failed.exception');
            const { AuthTwoFactorSecretUnavailableException } =
                await import('@modules/auth/exceptions/auth.two-factor-secret-unavailable.exception');

            const result = util.toDecryptException(
                new HelperDecryptFailedException()
            );

            expect(result).toBeInstanceOf(
                AuthTwoFactorSecretUnavailableException
            );
        });

        it('returns null for any other error', () => {
            expect(util.toDecryptException(new Error('boom'))).toBeNull();
        });
    });
});
