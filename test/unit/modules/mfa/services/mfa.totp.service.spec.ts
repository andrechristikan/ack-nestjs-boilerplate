import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { MfaTotp } from '@generated/prisma-client/client';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaTotpSecretEncryptionPurpose } from '@modules/mfa/constants/mfa.constant';
import { MfaTotpRepository } from '@modules/mfa/repositories/mfa.totp.repository';
import { createTotpCode } from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';

describe('MfaTotpService', () => {
    const mfaTotpRepository: MockProxy<MfaTotpRepository> =
        mock<MfaTotpRepository>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: MfaTotpService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const confirmedTotp: MfaTotp = {
        id: 'totp-quartz',
        userId: 'user-quartz',
        secret: 'encrypted-secret',
        pendingSecret: null,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: new Date('2026-02-01T00:00:00.000Z'),
        lastUsedStep: 10,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const pendingTotp: MfaTotp = {
        ...confirmedTotp,
        secret: null,
        pendingSecret: 'encrypted-pending',
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
    };

    // cspell:disable-next-line
    const base32Secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const stepInSeconds = 30;
    const nowInSeconds = now.getTime() / 1000;
    const nowStep = nowInSeconds / stepInSeconds;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'mfa.totp.strategy': 'totp',
                'mfa.totp.algorithm': 'sha1',
                'mfa.totp.issuer': 'AckBoilerplate',
                'mfa.totp.digits': 6,
                'mfa.totp.periodInSeconds': stepInSeconds,
                'mfa.totp.window': 1,
                'mfa.totp.secretLength': 20,
                'mfa.totp.encryptionKey': 'encryption-key',
            };

            return values[key];
        });

        const module = await Test.createTestingModule({
            providers: [
                MfaTotpService,
                { provide: MfaTotpRepository, useValue: mfaTotpRepository },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: ConfigService, useValue: configService },
                { provide: SentryService, useValue: sentryService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(MfaTotpService);
    });

    describe('getStatus', () => {
        it('answers a confirmed authenticator', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(confirmedTotp);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: true,
                isPendingConfirmation: false,
                confirmedAt: confirmedTotp.confirmedAt,
                lastUsedAt: confirmedTotp.lastUsedAt,
            });
        });

        it('answers a pending authenticator', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(pendingTotp);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: false,
                isPendingConfirmation: true,
                confirmedAt: null,
                lastUsedAt: null,
            });
        });

        it('answers false and null without a row', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(null);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: false,
                isPendingConfirmation: false,
                confirmedAt: null,
                lastUsedAt: null,
            });
        });
    });

    describe('existsConfirmed', () => {
        it('answers the repository answer', async () => {
            mfaTotpRepository.existsConfirmed.mockResolvedValue(true);

            await expect(service.existsConfirmed('user-quartz')).resolves.toBe(
                true
            );
            expect(mfaTotpRepository.existsConfirmed).toHaveBeenCalledWith(
                'user-quartz'
            );
        });
    });

    describe('assertConfirmed', () => {
        it('resolves when the user has a confirmed TOTP', async () => {
            mfaTotpRepository.existsConfirmed.mockResolvedValue(true);

            await expect(
                service.assertConfirmed('user-quartz')
            ).resolves.toBeUndefined();
            expect(mfaTotpRepository.existsConfirmed).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('throws MfaTotpNotEnabledException when the user has none', async () => {
            mfaTotpRepository.existsConfirmed.mockResolvedValue(false);

            await expect(
                service.assertConfirmed('user-quartz')
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.totpNotEnabled,
                statusCodeKey: 'totpNotEnabled',
                messagePath: 'mfa.error.totpNotEnabled',
            });
        });
    });

    describe('existsConfirmedInTx', () => {
        it('reads on the tx', async () => {
            mfaTotpRepository.existsConfirmedInTx.mockResolvedValue(false);

            await expect(
                service.existsConfirmedInTx(tx, 'user-quartz')
            ).resolves.toBe(false);
            expect(mfaTotpRepository.existsConfirmedInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });
    });

    describe('removeInTx', () => {
        it('deletes the row on the tx', async () => {
            await service.removeInTx(tx, 'user-quartz');

            expect(mfaTotpRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });
    });

    describe('setupInTx', () => {
        it('stores the encrypted pending secret under the configured key and the user id, and answers the secret and the URL', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(null);
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'encrypted-secret'
            );

            const result = await service.setupInTx(
                tx,
                'user-quartz',
                'quartz@example.com'
            );

            expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                result.secret,
                'encryption-key',
                MfaTotpSecretEncryptionPurpose,
                'user-quartz'
            );
            expect(mfaTotpRepository.setupInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'encrypted-secret'
            );
        });

        it('carries the issuer once, the email, and the secret in the otpauth URL', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(null);
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'encrypted-secret'
            );

            const { secret, otpauthUrl } = await service.setupInTx(
                tx,
                'user-quartz',
                'quartz@example.com'
            );

            const url = new URL(otpauthUrl);
            expect(url.protocol).toBe('otpauth:');
            expect(url.pathname).toBe('/AckBoilerplate:quartz%40example.com');
            expect(url.searchParams.get('secret')).toBe(secret);
            expect(url.searchParams.get('issuer')).toBe('AckBoilerplate');
        });

        it('replaces an unconfirmed pending secret', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(
                pendingTotp
            );
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'encrypted-secret'
            );

            await service.setupInTx(tx, 'user-quartz', 'quartz@example.com');

            expect(mfaTotpRepository.setupInTx).toHaveBeenCalledTimes(1);
        });

        it('throws MfaTotpAlreadyEnabledException with a confirmed TOTP and writes nothing', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(
                confirmedTotp
            );

            await expect(
                service.setupInTx(tx, 'user-quartz', 'quartz@example.com')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpAlreadyEnabled,
            });
            expect(mfaTotpRepository.setupInTx).not.toHaveBeenCalled();
        });
    });

    describe('checkCode', () => {
        beforeEach(() => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(confirmedTotp);
            helperEncryptionService.aes256Decrypt.mockReturnValue(base32Secret);
        });

        it('answers the step of a code generated for the current step, decrypting the stored secret for the user', async () => {
            const code = createTotpCode(
                base32Secret,
                nowInSeconds,
                stepInSeconds
            );

            await expect(
                service.checkCode('user-quartz', ` ${code} `)
            ).resolves.toBe(nowStep);
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'encrypted-secret',
                'encryption-key',
                MfaTotpSecretEncryptionPurpose,
                'user-quartz'
            );
        });

        it('answers the previous step for a code inside the configured window', async () => {
            const code = createTotpCode(
                base32Secret,
                nowInSeconds + -stepInSeconds,
                stepInSeconds
            );

            await expect(service.checkCode('user-quartz', code)).resolves.toBe(
                nowStep - 1
            );
        });

        it('answers null for a code generated for a step outside the window', async () => {
            const code = createTotpCode(
                base32Secret,
                nowInSeconds + -5 * stepInSeconds,
                stepInSeconds
            );

            await expect(
                service.checkCode('user-quartz', code)
            ).resolves.toBeNull();
        });

        it('answers null for a wrong code', async () => {
            await expect(
                service.checkCode('user-quartz', '000000')
            ).resolves.toBeNull();
        });

        it('answers null for a blank code without decrypting', async () => {
            await expect(
                service.checkCode('user-quartz', '  ')
            ).resolves.toBeNull();
            await expect(
                service.checkCode('user-quartz', null)
            ).resolves.toBeNull();
            expect(
                helperEncryptionService.aes256Decrypt
            ).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException without a row or a confirmed secret', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValueOnce(null);
            mfaTotpRepository.findOneByUserId.mockResolvedValueOnce(
                pendingTotp
            );

            await expect(
                service.checkCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            await expect(
                service.checkCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
        });

        it('captures a secret that fails decryption to Sentry and throws MfaTotpSecretUnavailableException', async () => {
            const cause = new HelperDecryptFailedException();
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw cause;
            });

            await expect(
                service.checkCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpSecretUnavailable,
            });
            expect(sentryService.captureException).toHaveBeenCalledWith(cause);
        });

        it('wraps any other decrypt error in AppUnknownException', async () => {
            const cause = new Error('boom');
            helperEncryptionService.aes256Decrypt.mockImplementation(() => {
                throw cause;
            });

            await expect(
                service.checkCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('checkSetupCode', () => {
        it('answers the step of a correct code against the pending secret', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(pendingTotp);
            helperEncryptionService.aes256Decrypt.mockReturnValue(base32Secret);
            const code = createTotpCode(
                base32Secret,
                nowInSeconds,
                stepInSeconds
            );

            await expect(
                service.checkSetupCode('user-quartz', ` ${code} `)
            ).resolves.toBe(nowStep);
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'encrypted-pending',
                'encryption-key',
                MfaTotpSecretEncryptionPurpose,
                'user-quartz'
            );
        });

        it('answers null for a wrong code', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(pendingTotp);
            helperEncryptionService.aes256Decrypt.mockReturnValue(base32Secret);

            await expect(
                service.checkSetupCode('user-quartz', '000000')
            ).resolves.toBeNull();
        });

        it('throws MfaTotpAlreadyEnabledException when no secret is pending and one is confirmed', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(confirmedTotp);

            await expect(
                service.checkSetupCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpAlreadyEnabled,
            });
        });

        it('throws MfaTotpSetupRequiredException without a row', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(null);

            await expect(
                service.checkSetupCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpSetupRequired,
            });
        });
    });

    describe('markUsedInTx', () => {
        it('accepts the step on the tx', async () => {
            mfaTotpRepository.markUsedInTx.mockResolvedValue(true);

            await service.markUsedInTx(tx, 'user-quartz', 11);

            expect(mfaTotpRepository.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                11,
                now,
                'user-quartz'
            );
        });

        it('throws MfaInvalidException for a replayed step', async () => {
            mfaTotpRepository.markUsedInTx.mockResolvedValue(false);

            await expect(
                service.markUsedInTx(tx, 'user-quartz', 10)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.invalid,
            });
        });
    });

    describe('enableInTx', () => {
        it('moves the pending secret into the confirmed one with the step', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(
                pendingTotp
            );
            mfaTotpRepository.enableInTx.mockResolvedValue(true);

            await service.enableInTx(tx, 'user-quartz', 7);

            expect(mfaTotpRepository.enableInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'encrypted-pending',
                7,
                now
            );
        });

        it('throws MfaTotpSetupRequiredException without a pending secret', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(
                confirmedTotp
            );

            await expect(
                service.enableInTx(tx, 'user-quartz', 7)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpSetupRequired,
            });
            expect(mfaTotpRepository.enableInTx).not.toHaveBeenCalled();
        });

        it('throws MfaTotpSetupRequiredException when the pending secret changed', async () => {
            mfaTotpRepository.findOneByUserIdInTx.mockResolvedValue(
                pendingTotp
            );
            mfaTotpRepository.enableInTx.mockResolvedValue(false);

            await expect(
                service.enableInTx(tx, 'user-quartz', 7)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpSetupRequired,
            });
        });
    });

    describe('disableInTx', () => {
        it('deletes the confirmed row', async () => {
            mfaTotpRepository.disableInTx.mockResolvedValue(true);

            await service.disableInTx(tx, 'user-quartz');

            expect(mfaTotpRepository.disableInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });

        it('throws MfaTotpNotEnabledException for a user without one', async () => {
            mfaTotpRepository.disableInTx.mockResolvedValue(false);

            await expect(
                service.disableInTx(tx, 'user-quartz')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.totpNotEnabled,
            });
        });
    });
});
