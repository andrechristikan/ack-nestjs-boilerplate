import { TestUnitKitEncryptionSecret } from '@test/unit/helpers/test.unit.kit.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { MfaTotp } from '@generated/prisma-client/client';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaTotpSecretEncryptionPurpose } from '@modules/mfa/constants/mfa.constant';
import { MfaTotpRepository } from '@modules/mfa/repositories/mfa.totp.repository';
import {
    createMfaTotpService,
    createTotpCode,
    buildSealedMfaTotpSecret,
} from '@test/unit/helpers/test.unit.mfa.helper';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';

describe('MfaTotpService', () => {
    const mfaTotpRepository: MockProxy<MfaTotpRepository> =
        mock<MfaTotpRepository>();
    const helperEncryptionService = new HelperEncryptionService();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();

    let service: MfaTotpService;

    const tx = {} as IDatabaseTransactionClient;
    const base32Secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const stepInSeconds = 30;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const confirmedTotp: MfaTotp = {
        id: 'totp-quartz',
        userId: 'user-quartz',
        secret: buildSealedMfaTotpSecret(base32Secret, 'user-quartz'),
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
        pendingSecret: buildSealedMfaTotpSecret(base32Secret, 'user-quartz'),
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
    };

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
        service = await createMfaTotpService(
            mfaTotpRepository,
            sentryService,
            TestUnitKitEncryptionSecret
        );
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

    describe('getOneByUser', () => {
        it('answers the row the repository finds for the user', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(confirmedTotp);

            await expect(service.getOneByUser('user-quartz')).resolves.toBe(
                confirmedTotp
            );
            expect(mfaTotpRepository.findOneByUserId).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('answers null for a user without a row', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(null);

            await expect(
                service.getOneByUser('user-quartz')
            ).resolves.toBeNull();
        });
    });

    describe('assertConfirmed', () => {
        it('returns for a row with a confirmed secret, reading nothing', () => {
            expect(() => service.assertConfirmed(confirmedTotp)).not.toThrow();
            expect(mfaTotpRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaTotpRepository.existsConfirmed).not.toHaveBeenCalled();
        });

        it.each([
            ['no row', null],
            ['a pending row', pendingTotp],
        ])(
            'throws MfaTotpNotEnabledException for %s, reading nothing',
            (_label, totp) => {
                expect(() => service.assertConfirmed(totp)).toThrowError(
                    expect.objectContaining({
                        module: 'mfa',
                        statusCode: EnumMfaStatusCodeError.totpNotEnabled,
                    })
                );
                expect(
                    mfaTotpRepository.findOneByUserId
                ).not.toHaveBeenCalled();
                expect(
                    mfaTotpRepository.existsConfirmed
                ).not.toHaveBeenCalled();
            }
        );
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
            let stored = '';
            mfaTotpRepository.setupInTx.mockImplementation(
                async (_tx, _userId, encryptedSecret) => {
                    stored = encryptedSecret;
                }
            );

            const result = await service.setupInTx(
                tx,
                'user-quartz',
                'quartz@example.com'
            );

            expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
            expect(mfaTotpRepository.setupInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                stored
            );
            expect(
                helperEncryptionService.aes256Decrypt(
                    stored,
                    TestUnitKitEncryptionSecret,
                    MfaTotpSecretEncryptionPurpose,
                    'user-quartz'
                )
            ).toBe(result.secret);
        });

        it('carries the issuer once, the email, and the secret in the otpauth URL', async () => {
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

        it('reads no row', async () => {
            await service.setupInTx(tx, 'user-quartz', 'quartz@example.com');

            expect(mfaTotpRepository.setupInTx).toHaveBeenCalledTimes(1);
            expect(mfaTotpRepository.findOneByUserId).not.toHaveBeenCalled();
        });
    });

    describe('assertSetupAllowed', () => {
        it('takes the row from the state, reads nothing, and returns for none', () => {
            expect(() => service.assertSetupAllowed(null)).not.toThrow();

            expect(mfaTotpRepository.findOneByUserId).not.toHaveBeenCalled();
        });

        it('returns for an unconfirmed pending secret', () => {
            expect(() => service.assertSetupAllowed(pendingTotp)).not.toThrow();
        });

        it('throws MfaTotpAlreadyEnabledException with a confirmed TOTP', () => {
            expect(() => service.assertSetupAllowed(confirmedTotp)).toThrow(
                expect.objectContaining({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.totpAlreadyEnabled,
                })
            );

            expect(mfaTotpRepository.findOneByUserId).not.toHaveBeenCalled();
        });
    });

    describe('checkCode', () => {
        it('answers the step of a code generated for the current step, decrypting the stored secret for the user', async () => {
            const code = createTotpCode(
                base32Secret,
                nowInSeconds,
                stepInSeconds
            );

            expect(
                service.checkCode(confirmedTotp, 'user-quartz', ` ${code} `)
            ).toBe(nowStep);
            expect(mfaTotpRepository.findOneByUserId).not.toHaveBeenCalled();
        });

        it('answers the previous step for a code inside the configured window', async () => {
            const code = createTotpCode(
                base32Secret,
                nowInSeconds + -stepInSeconds,
                stepInSeconds
            );

            expect(service.checkCode(confirmedTotp, 'user-quartz', code)).toBe(
                nowStep - 1
            );
        });

        it('answers null for a code generated for a step outside the window', async () => {
            const code = createTotpCode(
                base32Secret,
                nowInSeconds + -5 * stepInSeconds,
                stepInSeconds
            );

            expect(
                service.checkCode(confirmedTotp, 'user-quartz', code)
            ).toBeNull();
        });

        it('answers null for a wrong code', async () => {
            expect(
                service.checkCode(confirmedTotp, 'user-quartz', '000000')
            ).toBeNull();
        });

        it('answers null for a blank code without decrypting', async () => {
            expect(
                service.checkCode(confirmedTotp, 'user-quartz', '  ')
            ).toBeNull();
            expect(
                service.checkCode(confirmedTotp, 'user-quartz', null)
            ).toBeNull();
        });

        it.each([
            ['no row', null],
            ['a pending secret only', pendingTotp],
        ])(
            'throws MfaMethodUnavailableException for %s, reading nothing',
            (_label, totp) => {
                expect(() =>
                    service.checkCode(totp, 'user-quartz', '123456')
                ).toThrowError(
                    expect.objectContaining({
                        module: 'mfa',
                        statusCode: EnumMfaStatusCodeError.methodUnavailable,
                    })
                );
                expect(
                    mfaTotpRepository.findOneByUserId
                ).not.toHaveBeenCalled();
            }
        );

        it('captures a secret that fails decryption to Sentry and throws MfaTotpSecretUnavailableException', async () => {
            expect(() =>
                service.checkCode(
                    { ...confirmedTotp, secret: 'not-a-cipher' },
                    'user-quartz',
                    '123456'
                )
            ).toThrowError(
                expect.objectContaining({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.totpSecretUnavailable,
                })
            );
            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    module: 'helper',
                    statusCode: EnumHelperStatusCodeError.decryptFailed,
                }),
                null
            );
        });

        it('wraps any other decrypt error in AppUnknownException', async () => {
            const invalidSecretService = await createMfaTotpService(
                mfaTotpRepository,
                sentryService,
                'short'
            );

            expect(() =>
                invalidSecretService.checkCode(
                    confirmedTotp,
                    'user-quartz',
                    '123456'
                )
            ).toThrowError(
                expect.objectContaining({
                    constructor: AppUnknownException,
                    rawError: expect.objectContaining({
                        module: 'helper',
                        statusCode:
                            EnumHelperStatusCodeError.encryptionSecretInvalid,
                    }),
                })
            );
            expect(sentryService.captureException).not.toHaveBeenCalled();
        });
    });

    describe('checkSetupCode', () => {
        it('answers the step and the stored encrypted pending secret of a correct code', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(pendingTotp);
            const code = createTotpCode(
                base32Secret,
                nowInSeconds,
                stepInSeconds
            );

            await expect(
                service.checkSetupCode('user-quartz', ` ${code} `)
            ).resolves.toEqual({
                totpStep: nowStep,
                pendingSecret: pendingTotp.pendingSecret,
            });
        });

        it('answers a null step with the stored pending secret for a wrong code', async () => {
            mfaTotpRepository.findOneByUserId.mockResolvedValue(pendingTotp);

            await expect(
                service.checkSetupCode('user-quartz', '000000')
            ).resolves.toEqual({
                totpStep: null,
                pendingSecret: pendingTotp.pendingSecret,
            });
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
        it('moves the given pending secret into the confirmed one with the step, reading no row', async () => {
            mfaTotpRepository.enableInTx.mockResolvedValue(true);

            await service.enableInTx(
                tx,
                'user-quartz',
                pendingTotp.pendingSecret!,
                7
            );

            expect(mfaTotpRepository.enableInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                pendingTotp.pendingSecret,
                7,
                now
            );
            expect(mfaTotpRepository.findOneByUserId).not.toHaveBeenCalled();
        });

        it('throws MfaTotpSetupRequiredException when the pending secret changed', async () => {
            mfaTotpRepository.enableInTx.mockResolvedValue(false);

            await expect(
                service.enableInTx(
                    tx,
                    'user-quartz',
                    pendingTotp.pendingSecret!,
                    7
                )
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
