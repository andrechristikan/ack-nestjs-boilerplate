import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildOpenedMfaChallengePushToken,
    buildSealedMfaChallengePushToken,
} from '@test/unit/helpers/test.unit.mfa.helper';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { MfaChallenge } from '@generated/prisma-client/client';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import type { IMfaChallengeCreateData } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeRepository } from '@modules/mfa/repositories/mfa.challenge.repository';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';

describe('MfaChallengeService', () => {
    const mfaChallengeRepository: MockProxy<MfaChallengeRepository> =
        mock<MfaChallengeRepository>();
    const tokenHash =
        '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943';

    let service: MfaChallengeService;
    let helperStringService: HelperStringService;

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
        tokenHash,
        webAuthnChallenge: null,
        device: {
            fingerprint: 'fingerprint-quartz',
            name: 'Quartz Phone',
            platform: EnumDevicePlatform.ios,
            encryptedNotificationToken: buildSealedMfaChallengePushToken(
                'push-token',
                'user-quartz'
            ),
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

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                MfaChallengeService,
                {
                    provide: MfaChallengeRepository,
                    useValue: mfaChallengeRepository,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'mfa.challengeExpiresInMs': 300000,
                        'mfa.challengeRetentionInMs': 604800000,
                    }),
                },
            ],
        }).compile();
        service = module.get(MfaChallengeService);
        helperStringService = module.get(HelperStringService);
    });

    describe('createInTx', () => {
        it('stores the SHA-256 hash of the token and the encrypted push token and answers the raw token', async () => {
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('raw-token');
            const stored: IMfaChallengeCreateData[] = [];
            mfaChallengeRepository.createInTx.mockImplementation(
                async (_tx, data) => {
                    stored.push(data);
                }
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
            expect(random).toHaveBeenCalledWith(48);
            expect(mfaChallengeRepository.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-quartz',
                tokenHash,
                webAuthnChallenge: null,
                device: {
                    fingerprint: 'fingerprint-quartz',
                    name: 'Quartz Phone',
                    platform: EnumDevicePlatform.ios,
                    encryptedNotificationToken: expect.any(String),
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                expiredAt,
            });
            expect(
                buildOpenedMfaChallengePushToken(
                    stored[0]?.device?.encryptedNotificationToken ?? '',
                    'user-quartz'
                )
            ).toBe('push-token');
        });

        it('stores a null push token as null', async () => {
            vi.spyOn(helperStringService, 'random').mockReturnValue(
                'raw-token'
            );

            await service.createInTx(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-quartz',
                device: { ...device, notificationToken: null },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: null,
            });

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
            vi.spyOn(helperStringService, 'random').mockReturnValue(
                'raw-token'
            );

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
            vi.spyOn(helperStringService, 'random').mockReturnValue(
                'raw-token'
            );
            const stored: IMfaChallengeCreateData[] = [];
            mfaChallengeRepository.create.mockImplementation(async data => {
                stored.push(data);
            });

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
                tokenHash,
                webAuthnChallenge: null,
                device: {
                    fingerprint: 'fingerprint-quartz',
                    name: 'Quartz Phone',
                    platform: EnumDevicePlatform.ios,
                    encryptedNotificationToken: expect.any(String),
                },
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                expiredAt,
            });
            expect(
                buildOpenedMfaChallengePushToken(
                    stored[0]?.device?.encryptedNotificationToken ?? '',
                    'user-quartz'
                )
            ).toBe('push-token');
            expect(mfaChallengeRepository.createInTx).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('answers the live challenge of the token and purpose with the push token opened', async () => {
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(row);

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
                tokenHash,
                EnumMfaChallengePurpose.login,
                now
            );
        });

        it('answers a null device and a null push token as null', async () => {
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
                tokenHash,
                EnumMfaChallengePurpose.registration,
                now
            );
        });
    });

    describe('getLogin', () => {
        it('answers the login challenge with its device, origin, and method', async () => {
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(row);

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
                tokenHash,
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
                mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue({
                    ...row,
                    ...patch,
                });

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
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue({
                ...row,
                purpose: EnumMfaChallengePurpose.registration,
                webAuthnChallenge: 'webauthn-challenge',
            });

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
                tokenHash,
                EnumMfaChallengePurpose.registration,
                now
            );
        });

        it('throws MfaChallengeInvalidException when the row belongs to another user', async () => {
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue({
                ...row,
                webAuthnChallenge: 'webauthn-challenge',
            });

            await expect(
                service.getWebAuthnChallengeForUser(
                    'raw-token',
                    EnumMfaChallengePurpose.reauthentication,
                    'user-other'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });

        it('throws MfaChallengeInvalidException when the row holds no WebAuthn challenge', async () => {
            mfaChallengeRepository.findActiveByTokenHash.mockResolvedValue(row);

            await expect(
                service.getWebAuthnChallengeForUser(
                    'raw-token',
                    EnumMfaChallengePurpose.resetPassword,
                    'user-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });
    });

    describe('purgeExpired', () => {
        it('deletes the challenges expired before now minus the retention and returns the count', async () => {
            const threshold = new Date('2026-02-22T00:00:00.000Z');
            mfaChallengeRepository.deleteExpiredBefore.mockResolvedValue(6);

            await expect(service.purgeExpired()).resolves.toBe(6);

            expect(
                mfaChallengeRepository.deleteExpiredBefore
            ).toHaveBeenCalledWith(threshold);
        });
    });

    describe('consumeInTx', () => {
        it('claims the live challenge of the purpose on the tx', async () => {
            mfaChallengeRepository.consumeInTx.mockResolvedValue(true);

            await service.consumeInTx(
                tx,
                'raw-token',
                EnumMfaChallengePurpose.login,
                'user-quartz'
            );

            expect(mfaChallengeRepository.consumeInTx).toHaveBeenCalledWith(
                tx,
                tokenHash,
                EnumMfaChallengePurpose.login,
                now,
                'user-quartz'
            );
        });

        it('throws MfaChallengeInvalidException when the claim is lost', async () => {
            mfaChallengeRepository.consumeInTx.mockResolvedValue(false);

            await expect(
                service.consumeInTx(
                    tx,
                    'raw-token',
                    EnumMfaChallengePurpose.login,
                    'user-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.challengeInvalid,
            });
        });
    });
});
