import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Duration } from 'luxon';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { MfaChallenge } from '@generated/prisma-client/client';
import { MfaChallengeEncryptionPurpose } from '@modules/mfa/constants/mfa.constant';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { MfaChallengeRepository } from '@modules/mfa/repositories/mfa.challenge.repository';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';

describe('MfaChallengeService', () => {
    const mfaChallengeRepository: MockProxy<MfaChallengeRepository> =
        mock<MfaChallengeRepository>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: MfaChallengeService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiredAt = new Date('2026-03-01T00:05:00.000Z');
    const device = {
        fingerprint: 'fingerprint-quartz',
        name: 'Quartz Phone',
        platform: EnumDevicePlatform.ios,
        notificationToken: 'push-token',
    };
    const row: MfaChallenge = {
        id: 'challenge-quartz',
        userId: 'user-quartz',
        purpose: EnumMfaChallengePurpose.login,
        tokenHash: 'hash-token',
        webAuthnChallenge: null,
        device: {
            fingerprint: 'fingerprint-quartz',
            name: 'Quartz Phone',
            platform: EnumDevicePlatform.ios,
            encryptedNotificationToken: 'sealed-push-token',
        },
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        expiredAt,
        consumedAt: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        createdBy: 'user-quartz',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'mfa.challengeTtlInMs': 300000,
                'app.encryptionSecretKey': 'app-root-secret',
            };

            return values[key];
        });

        const module = await Test.createTestingModule({
            providers: [
                MfaChallengeService,
                {
                    provide: MfaChallengeRepository,
                    useValue: mfaChallengeRepository,
                },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(MfaChallengeService);
    });

    describe('createInTx', () => {
        it('stores the SHA-256 hash of the token and the encrypted push token and answers the raw token', async () => {
            helperStringService.random.mockReturnValue('raw-token');
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'sealed-push-token'
            );

            await expect(
                service.createInTx(tx, {
                    purpose: EnumMfaChallengePurpose.login,
                    userId: 'user-quartz',
                    device,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    webAuthnChallenge: null,
                })
            ).resolves.toEqual({
                challengeToken: 'raw-token',
                expiresInMs: 300000,
            });
            expect(helperStringService.random).toHaveBeenCalledWith(48);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'raw-token'
            );
            expect(helperEncryptionService.aes256Encrypt).toHaveBeenCalledWith(
                'push-token',
                'app-root-secret',
                MfaChallengeEncryptionPurpose,
                'user-quartz'
            );
            expect(mfaChallengeRepository.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-quartz',
                tokenHash: 'hash-token',
                webAuthnChallenge: null,
                device: {
                    fingerprint: 'fingerprint-quartz',
                    name: 'Quartz Phone',
                    platform: EnumDevicePlatform.ios,
                    encryptedNotificationToken: 'sealed-push-token',
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                expiredAt,
            });
        });

        it('stores a null push token as null', async () => {
            helperStringService.random.mockReturnValue('raw-token');
            helperHashService.sha256Hash.mockReturnValue('hash-token');

            await service.createInTx(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-quartz',
                device: { ...device, notificationToken: null },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: null,
            });

            expect(
                helperEncryptionService.aes256Encrypt
            ).not.toHaveBeenCalled();
            expect(mfaChallengeRepository.createInTx).toHaveBeenCalledWith(
                tx,
                expect.objectContaining({
                    device: expect.objectContaining({
                        encryptedNotificationToken: null,
                    }),
                })
            );
        });

        it('stores a null device as null', async () => {
            helperStringService.random.mockReturnValue('raw-token');
            helperHashService.sha256Hash.mockReturnValue('hash-token');

            await service.createInTx(tx, {
                purpose: EnumMfaChallengePurpose.passwordless,
                userId: null,
                device: null,
                loginFrom: null,
                loginWith: null,
                webAuthnChallenge: 'nonce',
            });

            expect(mfaChallengeRepository.createInTx).toHaveBeenCalledWith(
                tx,
                expect.objectContaining({
                    userId: null,
                    device: null,
                    webAuthnChallenge: 'nonce',
                })
            );
        });
    });

    describe('create', () => {
        it('stores the hashed token and the encrypted push token without a transaction and answers the raw token', async () => {
            helperStringService.random.mockReturnValue('raw-token');
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            helperEncryptionService.aes256Encrypt.mockReturnValue(
                'sealed-push-token'
            );

            await expect(
                service.create({
                    purpose: EnumMfaChallengePurpose.login,
                    userId: 'user-quartz',
                    device,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    webAuthnChallenge: null,
                })
            ).resolves.toEqual({
                challengeToken: 'raw-token',
                expiresInMs: 300000,
            });
            expect(mfaChallengeRepository.create).toHaveBeenCalledWith({
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-quartz',
                tokenHash: 'hash-token',
                webAuthnChallenge: null,
                device: {
                    fingerprint: 'fingerprint-quartz',
                    name: 'Quartz Phone',
                    platform: EnumDevicePlatform.ios,
                    encryptedNotificationToken: 'sealed-push-token',
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                expiredAt,
            });
            expect(mfaChallengeRepository.createInTx).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('answers the live challenge of the token and purpose with the push token opened', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(row);
            helperEncryptionService.aes256Decrypt.mockReturnValue('push-token');

            await expect(
                service.get('raw-token', EnumMfaChallengePurpose.login)
            ).resolves.toEqual({
                userId: 'user-quartz',
                purpose: EnumMfaChallengePurpose.login,
                webAuthnChallenge: null,
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(
                mfaChallengeRepository.findActiveByTokenHash
            ).toHaveBeenCalledWith(
                'hash-token',
                EnumMfaChallengePurpose.login,
                now
            );
            expect(helperEncryptionService.aes256Decrypt).toHaveBeenCalledWith(
                'sealed-push-token',
                'app-root-secret',
                MfaChallengeEncryptionPurpose,
                'user-quartz'
            );
        });

        it('answers a null device and a null push token as null', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValueOnce({
                ...row,
                device: null,
            });
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValueOnce({
                ...row,
                device: {
                    fingerprint: 'fingerprint-quartz',
                    name: null,
                    platform: EnumDevicePlatform.ios,
                    encryptedNotificationToken: null,
                },
            });

            await expect(
                service.get('raw-token', EnumMfaChallengePurpose.login)
            ).resolves.toMatchObject({ device: null });
            await expect(
                service.get('raw-token', EnumMfaChallengePurpose.login)
            ).resolves.toMatchObject({
                device: {
                    fingerprint: 'fingerprint-quartz',
                    name: null,
                    notificationToken: null,
                },
            });
        });

        it('throws MfaChallengeInvalidException when no live row of that purpose holds the token', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(
                null
            );

            await expect(
                service.get('raw-token', EnumMfaChallengePurpose.registration)
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
            expect(
                mfaChallengeRepository.findActiveByTokenHash
            ).toHaveBeenCalledWith(
                'hash-token',
                EnumMfaChallengePurpose.registration,
                now
            );
        });
    });

    describe('getLogin', () => {
        it('answers the login challenge with its device, origin, and method', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(row);
            helperEncryptionService.aes256Decrypt.mockReturnValue('push-token');

            await expect(service.getLogin('raw-token')).resolves.toEqual({
                userId: 'user-quartz',
                webAuthnChallenge: null,
                device,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(
                mfaChallengeRepository.findActiveByTokenHash
            ).toHaveBeenCalledWith(
                'hash-token',
                EnumMfaChallengePurpose.login,
                now
            );
        });

        it.each([
            ['userId', { userId: null }],
            ['device', { device: null }],
            ['loginFrom', { loginFrom: null }],
            ['loginWith', { loginWith: null }],
        ])(
            'throws MfaChallengeInvalidException for a login row whose %s is null',
            async (_field, patch) => {
                helperHashService.sha256Hash.mockReturnValue('hash-token');
                mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue({
                    ...row,
                    ...patch,
                });
                helperEncryptionService.aes256Decrypt.mockReturnValue(
                    'push-token'
                );

                await expect(
                    service.getLogin('raw-token')
                ).rejects.toMatchObject({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.challengeInvalid,
                });
            }
        );
    });

    describe('getWebAuthnChallengeForUser', () => {
        it('answers the WebAuthn challenge of a row held by the user', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue({
                ...row,
                purpose: EnumMfaChallengePurpose.registration,
                webAuthnChallenge: 'webauthn-challenge',
            });
            helperEncryptionService.aes256Decrypt.mockReturnValue('push-token');

            await expect(
                service.getWebAuthnChallengeForUser(
                    'raw-token',
                    EnumMfaChallengePurpose.registration,
                    'user-quartz'
                )
            ).resolves.toBe('webauthn-challenge');
            expect(
                mfaChallengeRepository.findActiveByTokenHash
            ).toHaveBeenCalledWith(
                'hash-token',
                EnumMfaChallengePurpose.registration,
                now
            );
        });

        it('throws MfaChallengeInvalidException when the row belongs to another user', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue({
                ...row,
                webAuthnChallenge: 'webauthn-challenge',
            });
            helperEncryptionService.aes256Decrypt.mockReturnValue('push-token');

            await expect(
                service.getWebAuthnChallengeForUser(
                    'raw-token',
                    EnumMfaChallengePurpose.reauthentication,
                    'user-other'
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });

        it('throws MfaChallengeInvalidException when the row holds no WebAuthn challenge', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(row);
            helperEncryptionService.aes256Decrypt.mockReturnValue('push-token');

            await expect(
                service.getWebAuthnChallengeForUser(
                    'raw-token',
                    EnumMfaChallengePurpose.resetPassword,
                    'user-quartz'
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });
    });

    describe('consumeInTx', () => {
        it('claims the live challenge of the purpose on the tx', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.consumeInTx.mockResolvedValue(true);

            await service.consumeInTx(
                tx,
                'raw-token',
                EnumMfaChallengePurpose.login,
                'user-quartz'
            );

            expect(mfaChallengeRepository.consumeInTx).toHaveBeenCalledWith(
                tx,
                'hash-token',
                EnumMfaChallengePurpose.login,
                now,
                'user-quartz'
            );
        });

        it('throws MfaChallengeInvalidException when the claim is lost', async () => {
            helperHashService.sha256Hash.mockReturnValue('hash-token');
            mfaChallengeRepository.consumeInTx.mockResolvedValue(false);

            await expect(
                service.consumeInTx(
                    tx,
                    'raw-token',
                    EnumMfaChallengePurpose.login,
                    'user-quartz'
                )
            ).rejects.toMatchObject({
                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });
    });
});
