import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumMfaChallengePurpose,
    EnumMfaPasskeyDeviceType,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import type { Mfa, MfaPasskey, MfaTotp } from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    stubBackupCodes,
    stubMfaMetadataNumbers,
} from '@test/unit/helpers/test.unit.mfa.helper';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type {
    IMfaAttemptFailure,
    IMfaCheck,
    IMfaFactorState,
    IMfaReauthenticationInput,
    IMfaReauthenticationResult,
} from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeInvalidException } from '@modules/mfa/exceptions/mfa.challenge-invalid.exception';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaRepository } from '@modules/mfa/repositories/mfa.repository';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('MfaService', () => {
    const mfaRepository: MockProxy<MfaRepository> = mock<MfaRepository>();
    const mfaTotpService: MockProxy<MfaTotpService> = mock<MfaTotpService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();

    let service: MfaService;
    let helperStringService: HelperStringService;
    let helperHashService: HelperHashService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const lockedUntil = new Date('2026-03-01T00:15:00.000Z');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.loginLocked,
            context: {
                userId: 'user-quartz',
                proceedBy: 'user-quartz',
                method: EnumNotificationLoginLockedMethod.mfa,
                methodLabel: 'Label',
                lockedUntil: '2026-03-01T00:15:00.000Z',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.high,
        idempotencyKey: null,
    };
    const baseMfa: Mfa = {
        id: 'mfa-quartz',
        userId: 'user-quartz',
        backupCodes: ['hash-one', 'hash-two'],
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseTotp: MfaTotp = {
        id: 'totp-quartz',
        userId: 'user-quartz',
        secret: 'encrypted-secret',
        pendingSecret: null,
        lastUsedStep: null,
        confirmedAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const basePasskey: MfaPasskey = {
        id: 'passkey-one',
        userId: 'user-quartz',
        credentialId: 'credential-one',
        publicKey: 'ZGVm-w',
        counter: 5,
        transports: ['internal'],
        deviceType: EnumMfaPasskeyDeviceType.multiDevice,
        backedUp: true,
        name: 'iPhone',
        lastUsedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-quartz',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const fullState: IMfaFactorState = {
        mfa: baseMfa,
        totp: baseTotp,
        passkeys: [basePasskey],
    };
    const emptyState: IMfaFactorState = {
        mfa: baseMfa,
        totp: null,
        passkeys: [],
    };
    const passkeyResponse: AuthenticationResponseJSON = {
        id: 'credential-one',
        rawId: 'credential-one',
        response: {
            clientDataJSON: 'client-data',
            authenticatorData: 'authenticator-data',
            signature: 'signature',
        },
        clientExtensionResults: {},
        type: 'public-key',
    };
    const totpInput = {
        method: EnumMfaMethod.totp,
        code: ' 123456 ',
        backupCode: null,
        passkeyResponse: null,
    };
    const backupInput = {
        method: EnumMfaMethod.backupCode,
        code: null,
        backupCode: ' backup-one ',
        passkeyResponse: null,
    };
    const totpFailure: IMfaAttemptFailure = {
        method: EnumMfaMethod.totp,
        maxAttempts: 5,
        lockedUntil,
    };
    const passkeyFailure: IMfaAttemptFailure = {
        method: EnumMfaMethod.passkey,
        maxAttempts: 5,
        lockedUntil,
    };
    const backupCodeFailure: IMfaAttemptFailure = {
        method: EnumMfaMethod.backupCode,
        maxAttempts: 5,
        lockedUntil,
    };
    const passkeyInput = {
        method: EnumMfaMethod.passkey,
        code: null,
        backupCode: null,
        passkeyResponse,
    };

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        stubMfaMetadataNumbers(featureFlagService, 5, 15);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module = await Test.createTestingModule({
            providers: [
                MfaService,
                { provide: MfaRepository, useValue: mfaRepository },
                { provide: MfaTotpService, useValue: mfaTotpService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: MessageService, useValue: messageService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'mfa.backupCodes.count': 3,
                        'mfa.backupCodes.length': 10,
                    }),
                },
                { provide: FeatureFlagService, useValue: featureFlagService },
            ],
        }).compile();
        service = module.get(MfaService);
        helperStringService = module.get(HelperStringService);
        helperHashService = module.get(HelperHashService);
    });

    describe('assertEnrollmentAllowed', () => {
        it('asserts the mfa flag with totpAllowed for totp', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockResolvedValue();

            await expect(
                service.assertEnrollmentAllowed(EnumMfaMethod.totp)
            ).resolves.toBeUndefined();
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.totpAllowed
            );
        });

        it('asserts the mfa flag with passkeyAllowed for passkey', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockResolvedValue();

            await service.assertEnrollmentAllowed(EnumMfaMethod.passkey);

            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.passkeyAllowed
            );
        });

        it('surfaces the exception the flag assert throws', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.assertEnrollmentAllowed(EnumMfaMethod.totp)
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
            });
        });
    });

    describe('getFactorState', () => {
        it('reads the Mfa row, the TOTP row, and the passkeys once each and answers them as the state', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaTotpService.getOneByUser.mockResolvedValue(baseTotp);
            mfaPasskeyService.getManyForCheckByUser.mockResolvedValue([
                basePasskey,
            ]);

            await expect(
                service.getFactorState('user-quartz')
            ).resolves.toEqual(fullState);
            expect(mfaRepository.findOneByUserId).toHaveBeenCalledTimes(1);
            expect(mfaRepository.findOneByUserId).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(mfaTotpService.getOneByUser).toHaveBeenCalledTimes(1);
            expect(mfaTotpService.getOneByUser).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).toHaveBeenCalledTimes(1);
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).toHaveBeenCalledWith('user-quartz');
        });

        it('starts the three reads together', async () => {
            const mfa = buildDeferred<Mfa | null>();
            mfaRepository.findOneByUserId.mockReturnValue(mfa.promise);
            mfaTotpService.getOneByUser.mockResolvedValue(null);
            mfaPasskeyService.getManyForCheckByUser.mockResolvedValue([]);

            const pending = service.getFactorState('user-quartz');

            expect(mfaTotpService.getOneByUser).toHaveBeenCalledTimes(1);
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).toHaveBeenCalledTimes(1);

            mfa.resolve(null);
            await expect(pending).resolves.toEqual({
                mfa: null,
                totp: null,
                passkeys: [],
            });
        });
    });

    describe('check', () => {
        beforeEach(() => {
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);
        });

        it.each([
            ['totp', totpInput, EnumFeatureFlagMetadataKey.totpAllowed],
            [
                'passkey',
                passkeyInput,
                EnumFeatureFlagMetadataKey.passkeyAllowed,
            ],
        ])(
            'throws MfaMethodUnavailableException uncounted for a %s the flag does not allow',
            async (_label, input, metadataKey) => {
                featureFlagService.isMetadataAllowed.mockImplementation(
                    async (_key, key) => key !== metadataKey
                );

                await expect(
                    service.check(
                        'user-quartz',
                        input,
                        'challenge-quartz',
                        fullState
                    )
                ).rejects.toMatchObject({
                    module: 'mfa',

                    statusCode: EnumMfaStatusCodeError.methodUnavailable,
                });
                expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
                expect(
                    mfaRepository.incrementAttemptInTx
                ).not.toHaveBeenCalled();
            }
        );

        it('throws MfaMethodUnavailableException uncounted for a backup code while no factor is effective', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(false);

            await expect(
                service.check('user-quartz', backupInput, null, fullState)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('answers the failure with the flag budget and writes nothing for a wrong totp code', async () => {
            mfaTotpService.checkCode.mockReturnValue(null);

            await expect(
                service.check('user-quartz', totpInput, null, fullState)
            ).resolves.toEqual({ check: null, failure: totpFailure });
            expect(mfaTotpService.checkCode).toHaveBeenCalledWith(
                baseTotp,
                'user-quartz',
                ' 123456 '
            );
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.mfaMaxAttempts
            );
            expect(featureFlagService.getMetadataNumber).toHaveBeenCalledWith(
                EnumFeatureFlagKey.mfa,
                EnumFeatureFlagMetadataKey.mfaLockDurationInMinutes
            );
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it.each([
            EnumFeatureFlagMetadataKey.mfaMaxAttempts,
            EnumFeatureFlagMetadataKey.mfaLockDurationInMinutes,
        ])(
            'propagates FeatureFlagNotConfiguredException from the %s read on a mismatch',
            async failing => {
                const failure = new FeatureFlagNotConfiguredException(
                    EnumFeatureFlagKey.mfa,
                    failing
                );
                mfaTotpService.checkCode.mockReturnValue(null);
                featureFlagService.getMetadataNumber.mockImplementation(
                    async (_key, metadataKey) => {
                        if (metadataKey === failing) {
                            throw failure;
                        }

                        return 5;
                    }
                );

                await expect(
                    service.check('user-quartz', totpInput, null, fullState)
                ).rejects.toBe(failure);
            }
        );

        it('answers the step of a correct totp code and counts nothing', async () => {
            mfaTotpService.checkCode.mockReturnValue(58123456);

            await expect(
                service.check('user-quartz', totpInput, null, fullState)
            ).resolves.toEqual({
                check: {
                    method: EnumMfaMethod.totp,
                    totpStep: 58123456,
                    backupCodeHash: null,
                    passkey: null,
                },
                failure: null,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('checks a backup code against the state alone, reading no factor row', async () => {
            vi.spyOn(helperHashService, 'argon2Compare').mockResolvedValue(
                false
            );

            await service.check('user-quartz', backupInput, null, fullState);

            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaTotpService.existsConfirmed).not.toHaveBeenCalled();
            expect(mfaPasskeyService.existsByUser).not.toHaveBeenCalled();
            expect(mfaTotpService.getOneByUser).not.toHaveBeenCalled();
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).not.toHaveBeenCalled();
        });

        it('throws MfaMethodRequiredException uncounted for a null method', async () => {
            await expect(
                service.check(
                    'user-quartz',
                    {
                        method: null,
                        code: null,
                        backupCode: null,
                        passkeyResponse: null,
                    },
                    null,
                    fullState
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodRequired,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException during a lock before any check', async () => {
            await expect(
                service.check('user-quartz', totpInput, null, {
                    ...fullState,
                    mfa: { ...baseMfa, lockedUntil },
                })
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaTotpService.checkCode).not.toHaveBeenCalled();
            expect(mfaPasskeyService.checkAssertion).not.toHaveBeenCalled();
        });

        it('verifies a backup code against the stored hashes and answers the matched hash', async () => {
            vi.spyOn(helperHashService, 'argon2Compare').mockImplementation(
                async (_value, hash) => hash === 'hash-two'
            );

            await expect(
                service.check('user-quartz', backupInput, null, fullState)
            ).resolves.toEqual({
                check: {
                    method: EnumMfaMethod.backupCode,
                    totpStep: null,
                    backupCodeHash: 'hash-two',
                    passkey: null,
                },
                failure: null,
            });
            expect(helperHashService.argon2Compare).toHaveBeenCalledWith(
                'backup-one',
                'hash-two'
            );
        });

        it('compares every stored hash and answers the first matching hash in stored order', async () => {
            vi.spyOn(helperHashService, 'argon2Compare').mockResolvedValue(
                true
            );

            await expect(
                service.check('user-quartz', backupInput, null, fullState)
            ).resolves.toMatchObject({
                check: { backupCodeHash: 'hash-one' },
            });
            expect(helperHashService.argon2Compare).toHaveBeenCalledTimes(2);
            expect(helperHashService.argon2Compare).toHaveBeenCalledWith(
                'backup-one',
                'hash-one'
            );
            expect(helperHashService.argon2Compare).toHaveBeenCalledWith(
                'backup-one',
                'hash-two'
            );
        });

        it('answers the failure for a wrong backup code and writes nothing', async () => {
            vi.spyOn(helperHashService, 'argon2Compare').mockResolvedValue(
                false
            );

            await expect(
                service.check('user-quartz', backupInput, null, fullState)
            ).resolves.toEqual({ check: null, failure: backupCodeFailure });
            expect(helperHashService.argon2Compare).toHaveBeenCalledTimes(2);
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('answers the failure for a blank backup code without comparing', async () => {
            const compare = vi.spyOn(helperHashService, 'argon2Compare');
            await expect(
                service.check(
                    'user-quartz',
                    {
                        ...backupInput,
                        backupCode: '  ',
                    },
                    null,
                    fullState
                )
            ).resolves.toEqual({ check: null, failure: backupCodeFailure });
            expect(compare).not.toHaveBeenCalled();
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException uncounted for a backup code with no codes left', async () => {
            await expect(
                service.check('user-quartz', backupInput, null, {
                    ...fullState,
                    mfa: { ...baseMfa, backupCodes: [] },
                })
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException for a backup code when the user has no Mfa row', async () => {
            await expect(
                service.check('user-quartz', backupInput, null, {
                    ...fullState,
                    mfa: null,
                })
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
        });
    });

    describe('check with a passkey', () => {
        beforeEach(() => {
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);
        });

        it('answers the passkey failure and writes nothing for a library verification failure', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.check(
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz',
                    fullState
                )
            ).resolves.toEqual({ check: null, failure: passkeyFailure });
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                [basePasskey],
                passkeyResponse,
                'challenge-quartz'
            );
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('answers the passkey id and counter of a valid assertion and counts nothing', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue({
                id: 'passkey-one',
                counter: 8,
            });

            await expect(
                service.check(
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz',
                    fullState
                )
            ).resolves.toEqual({
                check: {
                    method: EnumMfaMethod.passkey,
                    totpStep: null,
                    backupCodeHash: null,
                    passkey: { id: 'passkey-one', counter: 8 },
                },
                failure: null,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException uncounted for a user with no passkey', async () => {
            mfaPasskeyService.checkAssertion.mockRejectedValue(
                new MfaMethodUnavailableException()
            );

            await expect(
                service.check(
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz',
                    fullState
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('answers the failure for a null challenge', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.check('user-quartz', passkeyInput, null, fullState)
            ).resolves.toEqual({ check: null, failure: passkeyFailure });
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                [basePasskey],
                passkeyResponse,
                null
            );
        });
    });

    describe('checkPasskeyLogin', () => {
        beforeEach(() => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            featureFlagService.isMetadataAllowed.mockResolvedValue(false);
        });

        it('answers the passkey check of a matching assertion with both sub-keys off', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue({
                id: 'passkey-one',
                counter: 8,
            });

            await expect(
                service.checkPasskeyLogin(
                    'user-quartz',
                    basePasskey,
                    passkeyResponse,
                    'challenge-quartz'
                )
            ).resolves.toEqual({
                check: {
                    method: EnumMfaMethod.passkey,
                    totpStep: null,
                    backupCodeHash: null,
                    passkey: { id: 'passkey-one', counter: 8 },
                },
                failure: null,
            });
            expect(mfaRepository.findOneByUserId).toHaveBeenCalledTimes(1);
            expect(mfaRepository.findOneByUserId).toHaveBeenCalledWith(
                'user-quartz'
            );
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                [basePasskey],
                passkeyResponse,
                'challenge-quartz'
            );
            expect(mfaTotpService.checkCode).not.toHaveBeenCalled();
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException under a lock', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil: new Date('2026-03-01T00:10:00.000Z'),
            });

            await expect(
                service.checkPasskeyLogin(
                    'user-quartz',
                    basePasskey,
                    passkeyResponse,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaPasskeyService.checkAssertion).not.toHaveBeenCalled();
        });

        it('answers the passkey failure and writes nothing on a mismatch', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.checkPasskeyLogin(
                    'user-quartz',
                    basePasskey,
                    passkeyResponse,
                    'challenge-quartz'
                )
            ).resolves.toEqual({ check: null, failure: passkeyFailure });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });
    });

    describe('checkTotpSetupCode', () => {
        beforeEach(() => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
        });

        it('answers the step and the pending secret of a correct setup code', async () => {
            mfaTotpService.checkSetupCode.mockResolvedValue({
                totpStep: 7,
                pendingSecret: 'encrypted-pending',
            });

            await expect(
                service.checkTotpSetupCode('user-quartz', '123456')
            ).resolves.toEqual({
                totpStep: 7,
                pendingSecret: 'encrypted-pending',
                failure: null,
            });
            expect(mfaTotpService.checkSetupCode).toHaveBeenCalledWith(
                'user-quartz',
                '123456'
            );
        });

        it('answers the failure with no pending secret and writes nothing for a wrong setup code', async () => {
            mfaTotpService.checkSetupCode.mockResolvedValue({
                totpStep: null,
                pendingSecret: 'encrypted-pending',
            });

            await expect(
                service.checkTotpSetupCode('user-quartz', '000000')
            ).resolves.toEqual({
                totpStep: null,
                pendingSecret: null,
                failure: totpFailure,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException during a lock before reading the code', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil,
            });

            await expect(
                service.checkTotpSetupCode('user-quartz', '123456')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaTotpService.checkSetupCode).not.toHaveBeenCalled();
        });
    });

    describe('assertAttemptAvailable', () => {
        it('answers nothing with no lock', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);

            await expect(
                service.assertAttemptAvailable('user-quartz')
            ).resolves.toBeUndefined();
        });

        it('answers nothing for a lock that ended', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil: new Date('2026-02-28T23:59:59.000Z'),
            });

            await expect(
                service.assertAttemptAvailable('user-quartz')
            ).resolves.toBeUndefined();
        });

        it('answers nothing when the user has no Mfa row', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(null);

            await expect(
                service.assertAttemptAvailable('user-quartz')
            ).resolves.toBeUndefined();
        });

        it('throws MfaAttemptMaxException while the lock lasts', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil,
            });

            await expect(
                service.assertAttemptAvailable('user-quartz')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
        });
    });

    describe('countFailedAttemptInTx', () => {
        it('increments the counter on the given tx with the failure budget and lock end', async () => {
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);

            await service.countFailedAttemptInTx(
                tx,
                requestContext,
                apiKeyContext,
                'user-quartz',
                { ...totpFailure, maxAttempts: 8, lockedUntil: now }
            );

            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                8,
                now,
                'user-quartz'
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('adds the userMfaVerificationFailed entry on the given tx below the budget', async () => {
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);

            await expect(
                service.countFailedAttemptInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    totpFailure
                )
            ).resolves.toBe(false);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                {
                    action: EnumActivityLogAction.userMfaVerificationFailed,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(notificationQueue.notify).not.toHaveBeenCalled();
        });

        it('adds the failed entry, the reach-max entry and the mfa loginLocked effect on the given tx when the failure locked', async () => {
            const reachMaxEffect = { ...entryEffect, idempotencyKey: 'reach' };
            mfaRepository.incrementAttemptInTx.mockResolvedValue(true);
            activityLogQueue.recordEffect
                .mockReturnValueOnce(entryEffect)
                .mockReturnValueOnce(reachMaxEffect);
            notificationQueue.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');

            await expect(
                service.countFailedAttemptInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    totpFailure
                )
            ).resolves.toBe(true);
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                null,
                {
                    action: EnumActivityLogAction.userMfaVerificationFailed,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                null,
                {
                    action: EnumActivityLogAction.userMaxMfaAttemptReached,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.loginLockedMethod.mfa'
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.loginLocked,
                {
                    userId: 'user-quartz',
                    proceedBy: 'user-quartz',
                    method: EnumNotificationLoginLockedMethod.mfa,
                    methodLabel: 'Label',
                    lockedUntil: '2026-03-01T00:15:00.000Z',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
                reachMaxEffect,
                notifyEffect,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('throwFailedAttempt', () => {
        it('throws MfaAttemptMaxException when the failure locked', () => {
            expect(() =>
                service.throwFailedAttempt(passkeyFailure, true)
            ).toThrow(
                expect.objectContaining({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.attemptMax,
                })
            );
        });

        it('throws MfaPasskeyInvalidException for a passkey below the budget', () => {
            expect(() =>
                service.throwFailedAttempt(passkeyFailure, false)
            ).toThrow(
                expect.objectContaining({
                    module: 'mfa',
                    statusCode: EnumMfaStatusCodeError.passkeyInvalid,
                })
            );
        });

        it.each([totpFailure, backupCodeFailure])(
            'throws MfaInvalidException for a $method code below the budget',
            failure => {
                expect(() =>
                    service.throwFailedAttempt(failure, false)
                ).toThrow(
                    expect.objectContaining({
                        module: 'mfa',
                        statusCode: EnumMfaStatusCodeError.invalid,
                    })
                );
            }
        );
    });

    describe('checkReauthentication', () => {
        const baseInput: IMfaReauthenticationInput = {
            action: EnumUserReauthenticationAction.mfaTotpDisable,
            method: EnumMfaMethod.totp,
            code: ' 123456 ',
            backupCode: null,
            passkeyChallengeToken: null,
            passkeyResponse: null,
        };
        const totpCheck: IMfaCheck = {
            method: EnumMfaMethod.totp,
            totpStep: 7,
            backupCodeHash: null,
            passkey: null,
        };

        const totpState: IMfaFactorState = {
            mfa: baseMfa,
            totp: baseTotp,
            passkeys: [],
        };

        beforeEach(() => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);
        });

        afterEach(() => {
            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaTotpService.getOneByUser).not.toHaveBeenCalled();
            expect(mfaTotpService.existsConfirmed).not.toHaveBeenCalled();
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).not.toHaveBeenCalled();
            expect(mfaPasskeyService.existsByUser).not.toHaveBeenCalled();
        });

        it('answers enabled with nothing checked and calls no proof check for mfaTotpEnable after a password check', async () => {
            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    {
                        ...baseInput,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                    },
                    true,
                    totpState
                )
            ).resolves.toEqual({
                isEnabled: true,
                check: null,
                failure: null,
                passkeyChallengeToken: null,
            });
            expect(mfaTotpService.checkCode).not.toHaveBeenCalled();
            expect(mfaPasskeyService.checkAssertion).not.toHaveBeenCalled();
        });

        it('answers disabled with nothing checked and calls no proof check for a user with MFA off', async () => {
            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    baseInput,
                    true,
                    emptyState
                )
            ).resolves.toEqual({
                isEnabled: false,
                check: null,
                failure: null,
                passkeyChallengeToken: null,
            });
            expect(mfaTotpService.checkCode).not.toHaveBeenCalled();
        });

        it('checks the proof for mfaTotpEnable when no password was checked and answers the check', async () => {
            mfaTotpService.checkCode.mockReturnValue(7);

            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    {
                        ...baseInput,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                    },
                    false,
                    totpState
                )
            ).resolves.toEqual({
                isEnabled: true,
                check: totpCheck,
                failure: null,
                passkeyChallengeToken: null,
            });
            expect(mfaTotpService.checkCode).toHaveBeenCalledWith(
                baseTotp,
                'user-quartz',
                ' 123456 '
            );
        });

        it('checks the proof for another action after a password check and answers the check', async () => {
            mfaTotpService.checkCode.mockReturnValue(7);

            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    baseInput,
                    true,
                    totpState
                )
            ).resolves.toEqual({
                isEnabled: true,
                check: totpCheck,
                failure: null,
                passkeyChallengeToken: null,
            });
        });

        it('answers the failure and writes nothing for a mismatch', async () => {
            mfaTotpService.checkCode.mockReturnValue(null);

            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    baseInput,
                    false,
                    totpState
                )
            ).resolves.toEqual({
                isEnabled: true,
                check: null,
                failure: totpFailure,
                passkeyChallengeToken: null,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('treats the passkey as the whole proof, reads its reauthentication challenge, and answers the token with the check', async () => {
            mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
                'challenge-quartz'
            );
            mfaPasskeyService.checkAssertion.mockResolvedValue({
                id: 'passkey-one',
                counter: 8,
            });

            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    {
                        ...baseInput,
                        action: EnumUserReauthenticationAction.mfaTotpEnable,
                        passkeyChallengeToken: 'token-quartz',
                        passkeyResponse,
                    },
                    true,
                    fullState
                )
            ).resolves.toEqual({
                isEnabled: true,
                check: {
                    method: EnumMfaMethod.passkey,
                    totpStep: null,
                    backupCodeHash: null,
                    passkey: { id: 'passkey-one', counter: 8 },
                },
                failure: null,
                passkeyChallengeToken: 'token-quartz',
            });
            expect(
                mfaChallengeService.getWebAuthnChallengeForUser
            ).toHaveBeenCalledWith(
                'token-quartz',
                EnumMfaChallengePurpose.reauthentication,
                'user-quartz'
            );
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                [basePasskey],
                passkeyResponse,
                'challenge-quartz'
            );
            expect(mfaTotpService.checkCode).not.toHaveBeenCalled();
        });

        it('answers the passkey failure with no token for a passkey mismatch', async () => {
            mfaChallengeService.getWebAuthnChallengeForUser.mockResolvedValue(
                'challenge-quartz'
            );
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.checkReauthentication(
                    'user-quartz',
                    {
                        ...baseInput,
                        passkeyChallengeToken: 'token-quartz',
                        passkeyResponse,
                    },
                    false,
                    fullState
                )
            ).resolves.toEqual({
                isEnabled: true,
                check: null,
                failure: passkeyFailure,
                passkeyChallengeToken: null,
            });
        });
    });

    describe('completeReauthenticationInTx', () => {
        const check: IMfaCheck = {
            method: EnumMfaMethod.totp,
            totpStep: 9,
            backupCodeHash: null,
            passkey: null,
        };
        const authContext = buildAuthJwtAccessContext('user-quartz');
        const baseResult: IMfaReauthenticationResult = {
            isEnabled: true,
            check: null,
            failure: null,
            passkeyChallengeToken: null,
        };

        it('writes nothing for a result with no check and no token', async () => {
            await service.completeReauthenticationInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                baseResult
            );

            expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
            expect(mfaRepository.resetAttemptInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('completes the check on the tx and adds one userMfaVerified entry', async () => {
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);

            await service.completeReauthenticationInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { ...baseResult, check }
            );

            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'user-quartz'
            );
            expect(mfaTotpService.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                9
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.userMfaVerified,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(mfaChallengeService.consumeInTx).not.toHaveBeenCalled();
        });

        it('claims the reauthentication challenge first, then completes the check', async () => {
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);

            await service.completeReauthenticationInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { ...baseResult, check, passkeyChallengeToken: 'token-quartz' }
            );

            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                tx,
                'token-quartz',
                EnumMfaChallengePurpose.reauthentication,
                'user-quartz'
            );
            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledBefore(
                mfaRepository.resetAttemptInTx
            );
        });
    });

    describe('completeInTx', () => {
        it('resets the counter and accepts the totp step', async () => {
            await service.completeInTx(tx, 'user-quartz', {
                method: EnumMfaMethod.totp,
                totpStep: 9,
                backupCodeHash: null,
                passkey: null,
            });

            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'user-quartz'
            );
            expect(mfaTotpService.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                9
            );
            expect(mfaRepository.consumeBackupCodeInTx).not.toHaveBeenCalled();
        });

        it('resets the counter and stamps the counter and last use of the passkey', async () => {
            await service.completeInTx(tx, 'user-quartz', {
                method: EnumMfaMethod.passkey,
                totpStep: null,
                backupCodeHash: null,
                passkey: { id: 'passkey-one', counter: 8 },
            });

            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'user-quartz'
            );
            expect(mfaPasskeyService.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'passkey-one',
                8,
                'user-quartz'
            );
            expect(mfaTotpService.markUsedInTx).not.toHaveBeenCalled();
            expect(mfaRepository.consumeBackupCodeInTx).not.toHaveBeenCalled();
        });

        it('removes the used backup code by compare-and-set', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue(baseMfa);
            mfaRepository.consumeBackupCodeInTx.mockResolvedValue(true);

            await service.completeInTx(tx, 'user-quartz', {
                method: EnumMfaMethod.backupCode,
                totpStep: null,
                backupCodeHash: 'hash-one',
                passkey: null,
            });

            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'user-quartz'
            );
            expect(mfaRepository.consumeBackupCodeInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                ['hash-one', 'hash-two'],
                ['hash-two'],
                'user-quartz'
            );
            expect(mfaTotpService.markUsedInTx).not.toHaveBeenCalled();
        });

        it('resets the counter and consumes nothing when the check carries no passkey, totp step, or backup code', async () => {
            await service.completeInTx(tx, 'user-quartz', {
                method: EnumMfaMethod.backupCode,
                totpStep: null,
                backupCodeHash: null,
                passkey: null,
            });

            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'user-quartz'
            );
            expect(mfaPasskeyService.markUsedInTx).not.toHaveBeenCalled();
            expect(mfaTotpService.markUsedInTx).not.toHaveBeenCalled();
            expect(mfaRepository.findOneByUserIdInTx).not.toHaveBeenCalled();
            expect(mfaRepository.consumeBackupCodeInTx).not.toHaveBeenCalled();
        });

        it('removes the matched hash from the row read in the transaction whatever its position', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue({
                ...baseMfa,
                backupCodes: ['hash-one', 'hash-two'],
            });
            mfaRepository.consumeBackupCodeInTx.mockResolvedValue(true);

            await service.completeInTx(tx, 'user-quartz', {
                method: EnumMfaMethod.backupCode,
                totpStep: null,
                backupCodeHash: 'hash-two',
                passkey: null,
            });

            expect(mfaRepository.consumeBackupCodeInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                ['hash-one', 'hash-two'],
                ['hash-one'],
                'user-quartz'
            );
        });

        it('throws MfaInvalidException and consumes nothing when the hash is absent from the row read in the transaction', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue({
                ...baseMfa,
                backupCodes: ['hash-one'],
            });

            await expect(
                service.completeInTx(tx, 'user-quartz', {
                    method: EnumMfaMethod.backupCode,
                    totpStep: null,
                    backupCodeHash: 'hash-two',
                    passkey: null,
                })
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.invalid,
            });
            expect(mfaRepository.consumeBackupCodeInTx).not.toHaveBeenCalled();
        });

        it('throws MfaInvalidException when the backup codes changed since the check', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue(baseMfa);
            mfaRepository.consumeBackupCodeInTx.mockResolvedValue(false);

            await expect(
                service.completeInTx(tx, 'user-quartz', {
                    method: EnumMfaMethod.backupCode,
                    totpStep: null,
                    backupCodeHash: 'hash-one',
                    passkey: null,
                })
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.invalid,
            });
        });

        it('throws MfaInvalidException when the Mfa row is gone', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue(null);

            await expect(
                service.completeInTx(tx, 'user-quartz', {
                    method: EnumMfaMethod.backupCode,
                    totpStep: null,
                    backupCodeHash: 'hash-one',
                    passkey: null,
                })
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.invalid,
            });
        });
    });

    describe('completeChallengeInTx', () => {
        const check: IMfaCheck = {
            method: EnumMfaMethod.totp,
            totpStep: 9,
            backupCodeHash: null,
            passkey: null,
        };

        it('claims the challenge on the given tx, then completes the check on it', async () => {
            await service.completeChallengeInTx(
                tx,
                'user-quartz',
                'token-quartz',
                EnumMfaChallengePurpose.login,
                check
            );

            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledWith(
                tx,
                'token-quartz',
                EnumMfaChallengePurpose.login,
                'user-quartz'
            );
            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'user-quartz'
            );
            expect(mfaTotpService.markUsedInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                9
            );
            expect(mfaChallengeService.consumeInTx).toHaveBeenCalledBefore(
                mfaRepository.resetAttemptInTx
            );
        });

        it('completes nothing when the challenge claim is lost', async () => {
            const failure = new MfaChallengeInvalidException();
            mfaChallengeService.consumeInTx.mockRejectedValue(failure);

            await expect(
                service.completeChallengeInTx(
                    tx,
                    'user-quartz',
                    'token-quartz',
                    EnumMfaChallengePurpose.login,
                    check
                )
            ).rejects.toBe(failure);

            expect(mfaRepository.resetAttemptInTx).not.toHaveBeenCalled();
        });
    });

    describe('getLoginMethods', () => {
        afterEach(() => {
            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaTotpService.getOneByUser).not.toHaveBeenCalled();
            expect(mfaTotpService.existsConfirmed).not.toHaveBeenCalled();
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).not.toHaveBeenCalled();
            expect(mfaPasskeyService.existsByUser).not.toHaveBeenCalled();
        });

        it.each([
            [
                'a TOTP only',
                true,
                false,
                [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
            ],
            [
                'a passkey only',
                false,
                true,
                [EnumMfaMethod.passkey, EnumMfaMethod.backupCode],
            ],
            [
                'a TOTP and a passkey',
                true,
                true,
                [
                    EnumMfaMethod.totp,
                    EnumMfaMethod.passkey,
                    EnumMfaMethod.backupCode,
                ],
            ],
            ['no factor', false, false, []],
        ])(
            'answers the methods of a user with %s and backup codes left',
            async (_label, hasTotp, hasPasskey, expected) => {
                featureFlagService.isMetadataAllowed.mockResolvedValue(true);

                await expect(
                    service.getLoginMethods({
                        ...fullState,
                        totp: hasTotp ? baseTotp : null,
                        passkeys: hasPasskey ? [basePasskey] : [],
                    })
                ).resolves.toEqual(expected);
            }
        );

        it('leaves out backupCode when no codes remain', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.getLoginMethods({
                    ...fullState,
                    mfa: { ...baseMfa, backupCodes: [] },
                })
            ).resolves.toEqual([EnumMfaMethod.totp, EnumMfaMethod.passkey]);
        });

        it('treats a TOTP row with no confirmed secret as no TOTP', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.getLoginMethods({
                    mfa: baseMfa,
                    totp: { ...baseTotp, secret: null },
                    passkeys: [],
                })
            ).resolves.toEqual([]);
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });

        it('reads no flag for a user with no stored factor', async () => {
            await expect(service.getLoginMethods(emptyState)).resolves.toEqual(
                []
            );
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });

        it.each([
            [
                true,
                true,
                false,
                true,
                [EnumMfaMethod.passkey, EnumMfaMethod.backupCode],
            ],
            [
                true,
                true,
                true,
                false,
                [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
            ],
            [true, true, false, false, []],
            [true, false, false, true, []],
            [false, true, true, false, []],
        ])(
            'with a TOTP %s, a passkey %s, totpAllowed %s, and passkeyAllowed %s answers only the effective methods',
            async (
                hasTotp,
                hasPasskey,
                totpAllowed,
                passkeyAllowed,
                expected
            ) => {
                featureFlagService.isMetadataAllowed.mockImplementation(
                    async (_key, metadataKey) =>
                        metadataKey === EnumFeatureFlagMetadataKey.totpAllowed
                            ? totpAllowed
                            : passkeyAllowed
                );

                await expect(
                    service.getLoginMethods({
                        ...fullState,
                        totp: hasTotp ? baseTotp : null,
                        passkeys: hasPasskey ? [basePasskey] : [],
                    })
                ).resolves.toEqual(expected);
            }
        );

        it('leaves out backupCode when the state holds no Mfa row', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.getLoginMethods({
                    mfa: null,
                    totp: baseTotp,
                    passkeys: [],
                })
            ).resolves.toEqual([EnumMfaMethod.totp]);
        });
    });

    describe('isEnabled', () => {
        afterEach(() => {
            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaTotpService.getOneByUser).not.toHaveBeenCalled();
            expect(mfaTotpService.existsConfirmed).not.toHaveBeenCalled();
            expect(
                mfaPasskeyService.getManyForCheckByUser
            ).not.toHaveBeenCalled();
            expect(mfaPasskeyService.existsByUser).not.toHaveBeenCalled();
        });

        it('answers false and reads no flag for a state with no stored factor', async () => {
            await expect(service.isEnabled(emptyState)).resolves.toBe(false);
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });

        it('answers false for a TOTP row with no confirmed secret', async () => {
            await expect(
                service.isEnabled({
                    mfa: baseMfa,
                    totp: { ...baseTotp, secret: null },
                    passkeys: [],
                })
            ).resolves.toBe(false);
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });

        it.each([
            [true, false, true, true, true],
            [true, false, false, true, false],
            [true, false, true, false, true],
            [true, false, false, false, false],
            [false, true, true, true, true],
            [false, true, false, true, true],
            [false, true, true, false, false],
            [false, true, false, false, false],
            [true, true, true, true, true],
            [true, true, false, true, true],
            [true, true, true, false, true],
            [true, true, false, false, false],
        ])(
            'with a confirmed TOTP %s, a passkey %s, totpAllowed %s, and passkeyAllowed %s answers %s',
            async (
                hasTotp,
                hasPasskey,
                totpAllowed,
                passkeyAllowed,
                expected
            ) => {
                featureFlagService.isMetadataAllowed.mockImplementation(
                    async (_key, metadataKey) =>
                        metadataKey === EnumFeatureFlagMetadataKey.totpAllowed
                            ? totpAllowed
                            : passkeyAllowed
                );

                await expect(
                    service.isEnabled({
                        mfa: baseMfa,
                        totp: hasTotp ? baseTotp : null,
                        passkeys: hasPasskey ? [basePasskey] : [],
                    })
                ).resolves.toBe(expected);
            }
        );
    });

    describe('assertHasFactor', () => {
        it.each([
            [true, false],
            [false, true],
        ])(
            'resolves with a confirmed TOTP %s and a passkey %s without reading the flag',
            async (hasTotp, hasPasskey) => {
                mfaTotpService.existsConfirmed.mockResolvedValue(hasTotp);
                mfaPasskeyService.existsByUser.mockResolvedValue(hasPasskey);

                await expect(
                    service.assertHasFactor('user-quartz')
                ).resolves.toBeUndefined();
                expect(
                    featureFlagService.isMetadataAllowed
                ).not.toHaveBeenCalled();
            }
        );

        it('throws MfaNotEnabledException with neither factor stored', async () => {
            mfaTotpService.existsConfirmed.mockResolvedValue(false);
            mfaPasskeyService.existsByUser.mockResolvedValue(false);

            await expect(
                service.assertHasFactor('user-quartz')
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.notEnabled,
            });
        });
    });

    describe('assertEnabled', () => {
        it('answers nothing with MFA on, reading no factor row', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.assertEnabled({
                    ...emptyState,
                    passkeys: [basePasskey],
                })
            ).resolves.toBeUndefined();
            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaPasskeyService.existsByUser).not.toHaveBeenCalled();
        });

        it('throws MfaNotEnabledException with MFA off', async () => {
            await expect(
                service.assertEnabled(emptyState)
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.notEnabled,
            });
        });
    });

    describe('getStatus', () => {
        const confirmedTotp = {
            isEnabled: true,
            isPendingConfirmation: false,
            confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
            lastUsedAt: null,
        };
        const noTotp = {
            isEnabled: false,
            isPendingConfirmation: false,
            confirmedAt: null,
            lastUsedAt: null,
        };
        const passkeys = [
            {
                id: 'passkey-one',
                name: 'iPhone',
                deviceType: EnumMfaPasskeyDeviceType.multiDevice,
                backedUp: true,
                createdAt: new Date('2026-02-01T00:00:00.000Z'),
                lastUsedAt: null,
            },
        ];

        it('answers the totp state, the passkeys, and the remaining backup codes', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaTotpService.getStatus.mockResolvedValue(confirmedTotp);
            mfaPasskeyService.getList.mockResolvedValue(passkeys);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: true,
                backupCodesRemaining: 2,
                totp: confirmedTotp,
                passkeys,
            });
            expect(mfaPasskeyService.getList).toHaveBeenCalledWith(
                'user-quartz'
            );
        });

        it('is enabled through a passkey alone', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaTotpService.getStatus.mockResolvedValue(noTotp);
            mfaPasskeyService.getList.mockResolvedValue(passkeys);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: true,
                backupCodesRemaining: 2,
                totp: noTotp,
                passkeys,
            });
        });

        it('is not enabled while the only stored factor is switched off, and reports the stored state', async () => {
            featureFlagService.isMetadataAllowed.mockResolvedValue(false);
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaTotpService.getStatus.mockResolvedValue(confirmedTotp);
            mfaPasskeyService.getList.mockResolvedValue([]);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: false,
                backupCodesRemaining: 2,
                totp: confirmedTotp,
                passkeys: [],
            });
        });

        it('answers zero codes and no passkeys without an Mfa row', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(null);
            mfaTotpService.getStatus.mockResolvedValue(noTotp);
            mfaPasskeyService.getList.mockResolvedValue([]);

            await expect(service.getStatus('user-quartz')).resolves.toEqual({
                isEnabled: false,
                backupCodesRemaining: 0,
                totp: noTotp,
                passkeys: [],
            });
        });
    });

    describe('createManyInTx', () => {
        it('forwards every entry to the repository in one call', async () => {
            const entries = [
                { userId: 'user-quartz', createdBy: 'user-quartz' },
                { userId: 'user-agate', createdBy: 'admin-quartz' },
            ];

            await service.createManyInTx(tx, entries);

            expect(mfaRepository.createManyInTx).toHaveBeenCalledTimes(1);
            expect(mfaRepository.createManyInTx).toHaveBeenCalledWith(
                tx,
                entries
            );
        });
    });

    describe('resetAttemptInTx', () => {
        it('clears the counter and the lock on the tx and leaves the audit stamp to the request actor', async () => {
            await service.resetAttemptInTx(tx, 'user-quartz');

            expect(mfaRepository.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                null
            );
        });
    });

    describe('createBackupCodesInTx', () => {
        it('answers fresh codes when the row holds none, after a counted failure too', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue({
                ...baseMfa,
                backupCodes: [],
                attempt: 3,
            });
            stubBackupCodes(helperStringService, helperHashService, [
                'A',
                'B',
                'C',
            ]);
            mfaRepository.createBackupCodesInTx.mockResolvedValue(true);

            await expect(
                service.createBackupCodesInTx(tx, 'user-quartz')
            ).resolves.toEqual(['A', 'B', 'C']);
            expect(helperStringService.randomUppercase).toHaveBeenCalledTimes(
                3
            );
            expect(helperStringService.randomUppercase).toHaveBeenCalledWith(
                10
            );
            expect(mfaRepository.createBackupCodesInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                ['$argon2id$hash-A', '$argon2id$hash-B', '$argon2id$hash-C']
            );
        });

        it('starts every code hash together', async () => {
            let running = 0;
            let peak = 0;
            vi.spyOn(helperStringService, 'randomUppercase').mockReturnValue(
                'CODE'
            );
            vi.spyOn(helperHashService, 'argon2Hash').mockImplementation(
                async () => {
                    running += 1;
                    peak = Math.max(peak, running);
                    await Promise.resolve();
                    running -= 1;

                    return '$argon2id$hash';
                }
            );
            mfaRepository.findOneByUserIdInTx.mockResolvedValue({
                ...baseMfa,
                backupCodes: [],
            });
            mfaRepository.createBackupCodesInTx.mockResolvedValue(true);

            await service.createBackupCodesInTx(tx, 'user-quartz');

            expect(peak).toBe(3);
        });

        it('answers null when the row holds codes', async () => {
            const hash = vi.spyOn(helperHashService, 'argon2Hash');
            mfaRepository.findOneByUserIdInTx.mockResolvedValue(baseMfa);

            await expect(
                service.createBackupCodesInTx(tx, 'user-quartz')
            ).resolves.toBeNull();
            expect(hash).not.toHaveBeenCalled();
        });

        it('answers null when the guarded write finds codes written first', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue({
                ...baseMfa,
                backupCodes: [],
            });
            stubBackupCodes(helperStringService, helperHashService, [
                'A',
                'B',
                'C',
            ]);
            mfaRepository.createBackupCodesInTx.mockResolvedValue(false);

            await expect(
                service.createBackupCodesInTx(tx, 'user-quartz')
            ).resolves.toBeNull();
        });
    });

    describe('regenerateBackupCodesInTx', () => {
        it('replaces the codes and answers the plain ones', async () => {
            stubBackupCodes(helperStringService, helperHashService, [
                'A',
                'B',
                'C',
            ]);
            mfaRepository.regenerateBackupCodesInTx.mockResolvedValue(true);

            await expect(
                service.regenerateBackupCodesInTx(tx, 'user-quartz')
            ).resolves.toEqual(['A', 'B', 'C']);
            expect(
                mfaRepository.regenerateBackupCodesInTx
            ).toHaveBeenCalledWith(tx, 'user-quartz', [
                '$argon2id$hash-A',
                '$argon2id$hash-B',
                '$argon2id$hash-C',
            ]);
        });

        it('throws MfaNotEnabledException when the guarded write misses', async () => {
            stubBackupCodes(helperStringService, helperHashService, [
                'A',
                'B',
                'C',
            ]);
            mfaRepository.regenerateBackupCodesInTx.mockResolvedValue(false);

            await expect(
                service.regenerateBackupCodesInTx(tx, 'user-quartz')
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.notEnabled,
            });
        });
    });

    describe('clearBackupCodesIfNoFactorInTx', () => {
        it('empties the codes when no factor is left', async () => {
            mfaTotpService.existsConfirmedInTx.mockResolvedValue(false);
            mfaPasskeyService.existsByUserInTx.mockResolvedValue(false);

            await service.clearBackupCodesIfNoFactorInTx(tx, 'user-quartz');

            expect(mfaPasskeyService.existsByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaRepository.clearBackupCodesInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });

        it('keeps the codes while a TOTP is left', async () => {
            mfaTotpService.existsConfirmedInTx.mockResolvedValue(true);
            mfaPasskeyService.existsByUserInTx.mockResolvedValue(false);

            await service.clearBackupCodesIfNoFactorInTx(tx, 'user-quartz');

            expect(mfaRepository.clearBackupCodesInTx).not.toHaveBeenCalled();
        });

        it('keeps the codes while a passkey is left', async () => {
            mfaTotpService.existsConfirmedInTx.mockResolvedValue(false);
            mfaPasskeyService.existsByUserInTx.mockResolvedValue(true);

            await service.clearBackupCodesIfNoFactorInTx(tx, 'user-quartz');

            expect(mfaRepository.clearBackupCodesInTx).not.toHaveBeenCalled();
        });

        it('reads the passkeys while the TOTP read is pending', async () => {
            const totp = buildDeferred<boolean>();
            mfaTotpService.existsConfirmedInTx.mockReturnValue(totp.promise);
            mfaPasskeyService.existsByUserInTx.mockResolvedValue(true);

            const cleared = service.clearBackupCodesIfNoFactorInTx(
                tx,
                'user-quartz'
            );

            expect(mfaPasskeyService.existsByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            totp.resolve(false);
            await cleared;
        });
    });

    describe('resetByAdminInTx', () => {
        it('deletes the TOTP and every passkey and clears codes, counter, and lock', async () => {
            await service.resetByAdminInTx(tx, 'user-quartz');

            expect(mfaTotpService.removeInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaPasskeyService.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaRepository.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });

        it('issues the passkey and Mfa row writes while the TOTP delete is pending', async () => {
            const totp = buildDeferred<void>();
            mfaTotpService.removeInTx.mockReturnValue(totp.promise);

            const reset = service.resetByAdminInTx(tx, 'user-quartz');

            expect(mfaPasskeyService.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaRepository.resetByAdminInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            totp.resolve();
            await reset;
        });
    });

    describe('deleteByUserInTx', () => {
        it('deletes the TOTP, every passkey, and the Mfa row', async () => {
            await service.deleteByUserInTx(tx, 'user-quartz');

            expect(mfaTotpService.removeInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaPasskeyService.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaRepository.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
        });

        it('issues the passkey and Mfa row deletes while the TOTP delete is pending', async () => {
            const totp = buildDeferred<void>();
            mfaTotpService.removeInTx.mockReturnValue(totp.promise);

            const deleted = service.deleteByUserInTx(tx, 'user-quartz');

            expect(mfaPasskeyService.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            expect(mfaRepository.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz'
            );
            totp.resolve();
            await deleted;
        });
    });

    describe('getMetadataKey', () => {
        it.each([
            [EnumMfaMethod.totp, EnumFeatureFlagMetadataKey.totpAllowed],
            [EnumMfaMethod.passkey, EnumFeatureFlagMetadataKey.passkeyAllowed],
        ] as const)('answers the sub-key of %s', (method, metadataKey) => {
            expect(service['getMetadataKey'](method)).toBe(metadataKey);
        });
    });
});
