import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { Duration } from 'luxon';
import { Test } from '@nestjs/testing';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumMfaPasskeyDeviceType,
} from '@generated/prisma-client/client';
import type { IMfa } from '@modules/mfa/interfaces/mfa.interface';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    buildMfaBackupCodes,
    stubBackupCodes,
    stubMfaMetadataNumbers,
} from '@test/unit/helpers/test.unit.mfa.helper';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { EnumMfaStatusCodeError } from '@modules/mfa/enums/mfa.status-code.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { MfaMethodUnavailableException } from '@modules/mfa/exceptions/mfa.method-unavailable.exception';
import { MfaRepository } from '@modules/mfa/repositories/mfa.repository';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaTotpService } from '@modules/mfa/services/mfa.totp.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import {
    buildApiKeyContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('MfaService', () => {
    const mfaRepository: MockProxy<MfaRepository> = mock<MfaRepository>();
    const mfaTotpService: MockProxy<MfaTotpService> = mock<MfaTotpService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: MfaService;

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
    const baseMfa: IMfa = {
        id: 'mfa-quartz',
        userId: 'user-quartz',
        backupCodes: buildMfaBackupCodes('hash-one', 'hash-two'),
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
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
    const passkeyInput = {
        method: EnumMfaMethod.passkey,
        code: null,
        backupCode: null,
        passkeyResponse,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );
        configGet.mockImplementation((key: string) => {
            const values: Record<string, number> = {
                'mfa.backupCodes.count': 3,
                'mfa.backupCodes.length': 10,
            };

            return values[key];
        });
        stubMfaMetadataNumbers(featureFlagService, 5, 15);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module = await Test.createTestingModule({
            providers: [
                MfaService,
                { provide: MfaRepository, useValue: mfaRepository },
                { provide: MfaTotpService, useValue: mfaTotpService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: ActivityLogService, useValue: activityLogService },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: MessageService, useValue: messageService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: FeatureFlagService, useValue: featureFlagService },
            ],
        }).compile();
        service = module.get(MfaService);
    });

    describe('assertEnrolmentAllowed', () => {
        it('asserts the mfa flag with totpAllowed for totp', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockResolvedValue();

            await expect(
                service.assertEnrolmentAllowed(EnumMfaMethod.totp)
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

            await service.assertEnrolmentAllowed(EnumMfaMethod.passkey);

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
                service.assertEnrolmentAllowed(EnumMfaMethod.totp)
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
        });
    });

    describe('check', () => {
        beforeEach(() => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            mfaTotpService.existsConfirmed.mockResolvedValue(true);
            mfaPasskeyService.existsByUser.mockResolvedValue(true);
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
                        requestContext,
                        apiKeyContext,
                        'user-quartz',
                        input,
                        'challenge-quartz'
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
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    backupInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(mfaRepository.findOneByUserId).not.toHaveBeenCalled();
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('counts one failure on the Mfa row and throws MfaInvalidException for a wrong totp code', async () => {
            mfaTotpService.checkCode.mockResolvedValue(null);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    totpInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.invalid,
                statusCodeKey: 'invalid',
                messagePath: 'mfa.error.invalid',
            });
            expect(mfaTotpService.checkCode).toHaveBeenCalledWith(
                'user-quartz',
                ' 123456 '
            );
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(1);
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                5,
                lockedUntil,
                'user-quartz'
            );
        });

        it('answers the step of a correct totp code and counts nothing', async () => {
            mfaTotpService.checkCode.mockResolvedValue(58123456);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    totpInput,
                    null
                )
            ).resolves.toEqual({
                method: EnumMfaMethod.totp,
                totpStep: 58123456,
                backupCodeHash: null,
                passkey: null,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaMethodRequiredException uncounted for a null method', async () => {
            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    {
                        method: null,
                        code: null,
                        backupCode: null,
                        passkeyResponse: null,
                    },
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodRequired,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException during a lock before any check', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil,
            });

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    totpInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaTotpService.checkCode).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException when the failure reached the budget', async () => {
            mfaTotpService.checkCode.mockResolvedValue(null);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(true);
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            notificationService.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:15:00.000Z'
            );

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    totpInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
        });

        it('verifies a backup code against the stored hashes and answers the matched hash', async () => {
            helperHashService.argon2Compare.mockImplementation(
                async (_value, hash) => hash === 'hash-two'
            );

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    backupInput,
                    null
                )
            ).resolves.toEqual({
                method: EnumMfaMethod.backupCode,
                totpStep: null,
                backupCodeHash: 'hash-two',
                passkey: null,
            });
            expect(helperHashService.argon2Compare).toHaveBeenCalledWith(
                'backup-one',
                'hash-two'
            );
        });

        it('compares the stored hashes one at a time and stops at the first match', async () => {
            helperHashService.argon2Compare.mockResolvedValue(true);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    backupInput,
                    null
                )
            ).resolves.toMatchObject({ backupCodeHash: 'hash-one' });
            expect(helperHashService.argon2Compare).toHaveBeenCalledTimes(1);
            expect(helperHashService.argon2Compare).toHaveBeenCalledWith(
                'backup-one',
                'hash-one'
            );
        });

        it('counts a wrong backup code and throws MfaInvalidException', async () => {
            helperHashService.argon2Compare.mockResolvedValue(false);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    backupInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.invalid,
            });
            expect(helperHashService.argon2Compare).toHaveBeenCalledTimes(2);
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(1);
        });

        it('counts a blank backup code without comparing', async () => {
            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    {
                        ...backupInput,
                        backupCode: '  ',
                    },
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.invalid,
            });
            expect(helperHashService.argon2Compare).not.toHaveBeenCalled();
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(1);
        });

        it('throws MfaMethodUnavailableException uncounted for a backup code with no codes left', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                backupCodes: [],
            });

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    backupInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaMethodUnavailableException for a backup code when the user has no Mfa row', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(null);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    backupInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
        });
    });

    describe('check with a passkey', () => {
        beforeEach(() => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);
        });

        it('counts one failure on the Mfa row and throws MfaPasskeyInvalidException for a library verification failure', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',
                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
                statusCodeKey: 'passkeyInvalid',
                messagePath: 'mfa.error.passkeyInvalid',
            });
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                'user-quartz',
                passkeyResponse,
                'challenge-quartz'
            );
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(1);
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                5,
                lockedUntil,
                'user-quartz'
            );
        });

        it('answers the passkey id and counter of a valid assertion and counts nothing', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue({
                id: 'passkey-one',
                counter: 8,
            });

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz'
                )
            ).resolves.toEqual({
                method: EnumMfaMethod.passkey,
                totpStep: null,
                backupCodeHash: null,
                passkey: { id: 'passkey-one', counter: 8 },
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException when the passkey failure reached the budget', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(true);
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            notificationService.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:15:00.000Z'
            );

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
        });

        it('throws MfaMethodUnavailableException uncounted for a user with no passkey', async () => {
            mfaPasskeyService.checkAssertion.mockRejectedValue(
                new MfaMethodUnavailableException()
            );

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.methodUnavailable,
            });
            expect(mfaRepository.incrementAttemptInTx).not.toHaveBeenCalled();
        });

        it('counts a null challenge as a mismatch', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyInput,
                    null
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                'user-quartz',
                passkeyResponse,
                null
            );
        });

        it('locks at the fifth failure across four wrong totp codes and one wrong passkey', async () => {
            let attempt = 0;
            mfaRepository.incrementAttemptInTx.mockImplementation(
                async (_tx, _userId, maxAttempt) => {
                    attempt += 1;

                    return attempt >= maxAttempt;
                }
            );
            mfaTotpService.checkCode.mockResolvedValue(null);
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            notificationService.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:15:00.000Z'
            );

            for (let i = 0; i < 4; i += 1) {
                await expect(
                    service.check(
                        requestContext,
                        apiKeyContext,
                        'user-quartz',
                        totpInput,
                        null
                    )
                ).rejects.toMatchObject({
                    module: 'mfa',

                    statusCode: EnumMfaStatusCodeError.invalid,
                });
            }

            await expect(
                service.check(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyInput,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(5);
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
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyResponse,
                    'challenge-quartz'
                )
            ).resolves.toEqual({
                method: EnumMfaMethod.passkey,
                totpStep: null,
                backupCodeHash: null,
                passkey: { id: 'passkey-one', counter: 8 },
            });
            expect(mfaPasskeyService.checkAssertion).toHaveBeenCalledWith(
                'user-quartz',
                passkeyResponse,
                'challenge-quartz'
            );
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });

        it('throws MfaAttemptMaxException under a lock', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil: new Date('2026-03-01T00:10:00.000Z'),
            });

            await expect(
                service.checkPasskeyLogin(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyResponse,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
            expect(mfaPasskeyService.checkAssertion).not.toHaveBeenCalled();
        });

        it('counts one failure and throws MfaPasskeyInvalidException on a mismatch', async () => {
            mfaPasskeyService.checkAssertion.mockResolvedValue(null);

            await expect(
                service.checkPasskeyLogin(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    passkeyResponse,
                    'challenge-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.passkeyInvalid,
            });
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(1);
            expect(featureFlagService.isMetadataAllowed).not.toHaveBeenCalled();
        });
    });

    describe('checkTotpSetupCode', () => {
        beforeEach(() => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
        });

        it('answers the step of a correct setup code', async () => {
            mfaTotpService.checkSetupCode.mockResolvedValue(7);

            await expect(
                service.checkTotpSetupCode(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    '123456'
                )
            ).resolves.toBe(7);
            expect(mfaTotpService.checkSetupCode).toHaveBeenCalledWith(
                'user-quartz',
                '123456'
            );
        });

        it('counts a wrong setup code and throws MfaInvalidException', async () => {
            mfaTotpService.checkSetupCode.mockResolvedValue(null);

            await expect(
                service.checkTotpSetupCode(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    '000000'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.invalid,
            });
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledTimes(1);
        });

        it('throws MfaAttemptMaxException when the failure locked', async () => {
            mfaTotpService.checkSetupCode.mockResolvedValue(null);
            mfaRepository.incrementAttemptInTx.mockResolvedValue(true);
            activityLogService.recordEffect.mockReturnValue(entryEffect);
            notificationService.notify.mockReturnValue(notifyEffect);

            await expect(
                service.checkTotpSetupCode(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    '000000'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
        });

        it('throws MfaAttemptMaxException during a lock before reading the code', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                lockedUntil,
            });

            await expect(
                service.checkTotpSetupCode(
                    requestContext,
                    apiKeyContext,
                    'user-quartz',
                    '123456'
                )
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

    describe('countFailedAttempt', () => {
        it.each([
            { maxAttempts: 3, minutes: 5, end: '2026-03-01T00:05:00.000Z' },
            { maxAttempts: 8, minutes: 30, end: '2026-03-01T00:30:00.000Z' },
        ])(
            'passes $maxAttempts attempts and a $minutes minute lock from the mfa flag to the counter',
            async ({ maxAttempts, minutes, end }) => {
                stubMfaMetadataNumbers(
                    featureFlagService,
                    maxAttempts,
                    minutes
                );
                mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
                activityLogService.recordEffect.mockReturnValue(entryEffect);

                await service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    'user-quartz'
                );

                expect(
                    featureFlagService.getMetadataNumber
                ).toHaveBeenCalledWith(
                    EnumFeatureFlagKey.mfa,
                    EnumFeatureFlagMetadataKey.mfaMaxAttempts
                );
                expect(
                    featureFlagService.getMetadataNumber
                ).toHaveBeenCalledWith(
                    EnumFeatureFlagKey.mfa,
                    EnumFeatureFlagMetadataKey.mfaLockDurationInMinutes
                );
                expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledWith(
                    tx,
                    'user-quartz',
                    maxAttempts,
                    new Date(end),
                    'user-quartz'
                );
            }
        );

        it.each([
            EnumFeatureFlagMetadataKey.mfaMaxAttempts,
            EnumFeatureFlagMetadataKey.mfaLockDurationInMinutes,
        ])(
            'propagates FeatureFlagNotConfiguredException from the %s read and writes nothing',
            async failing => {
                const failure = new FeatureFlagNotConfiguredException(
                    EnumFeatureFlagKey.mfa,
                    failing
                );
                featureFlagService.getMetadataNumber.mockImplementation(
                    async (_key, metadataKey) => {
                        if (metadataKey === failing) {
                            throw failure;
                        }

                        return 5;
                    }
                );

                await expect(
                    service.countFailedAttempt(
                        requestContext,
                        apiKeyContext,
                        'user-quartz'
                    )
                ).rejects.toBe(failure);
                expect(outboxService.withTransaction).not.toHaveBeenCalled();
                expect(
                    mfaRepository.incrementAttemptInTx
                ).not.toHaveBeenCalled();
            }
        );

        it('adds the userVerifyMfaFailed entry on its transaction below the budget', async () => {
            mfaRepository.incrementAttemptInTx.mockResolvedValue(false);
            activityLogService.recordEffect.mockReturnValue(entryEffect);

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    'user-quartz'
                )
            ).resolves.toBe(false);
            expect(mfaRepository.incrementAttemptInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                5,
                lockedUntil,
                'user-quartz'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledTimes(1);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfaFailed,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(notificationService.notify).not.toHaveBeenCalled();
        });

        it('adds the failed entry, the reach-max entry and the mfa loginLocked effect when the failure locked', async () => {
            const reachMaxEffect = { ...entryEffect, idempotencyKey: 'reach' };
            mfaRepository.incrementAttemptInTx.mockResolvedValue(true);
            helperDateService.formatToIso.mockReturnValue(
                '2026-03-01T00:15:00.000Z'
            );
            activityLogService.recordEffect
                .mockReturnValueOnce(entryEffect)
                .mockReturnValueOnce(reachMaxEffect);
            notificationService.notify.mockReturnValue(notifyEffect);
            messageService.setMessage.mockReturnValue('Label');

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    'user-quartz'
                )
            ).resolves.toBe(true);
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifyMfaFailed,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userReachMaxMfaAttempt,
                    userId: 'user-quartz',
                    createdBy: 'user-quartz',
                }
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.loginLockedMethod.mfa'
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
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

        it('throws MfaAttemptMaxException on a write conflict', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    'user-quartz'
                )
            ).rejects.toMatchObject({
                module: 'mfa',

                statusCode: EnumMfaStatusCodeError.attemptMax,
            });
        });

        it('rethrows an AppBaseException unchanged', async () => {
            const failure = new DatabaseUnavailableException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    'user-quartz'
                )
            ).rejects.toBe(failure);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.countFailedAttempt(
                    requestContext,
                    apiKeyContext,
                    'user-quartz'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
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
                'hash-one',
                now
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

        it('throws MfaInvalidException when the backup code was consumed since the check', async () => {
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
    });

    describe('getLoginMethods', () => {
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
                mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
                mfaTotpService.existsConfirmed.mockResolvedValue(hasTotp);
                mfaPasskeyService.existsByUser.mockResolvedValue(hasPasskey);
                featureFlagService.isMetadataAllowed.mockResolvedValue(true);

                await expect(
                    service.getLoginMethods('user-quartz')
                ).resolves.toEqual(expected);
            }
        );

        it('leaves out backupCode when no codes remain', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue({
                ...baseMfa,
                backupCodes: [],
            });
            mfaTotpService.existsConfirmed.mockResolvedValue(true);
            mfaPasskeyService.existsByUser.mockResolvedValue(true);
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.getLoginMethods('user-quartz')
            ).resolves.toEqual([EnumMfaMethod.totp, EnumMfaMethod.passkey]);
        });

        it('reads no flag for a user with no stored factor', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
            mfaTotpService.existsConfirmed.mockResolvedValue(false);
            mfaPasskeyService.existsByUser.mockResolvedValue(false);

            await expect(
                service.getLoginMethods('user-quartz')
            ).resolves.toEqual([]);
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
                mfaRepository.findOneByUserId.mockResolvedValue(baseMfa);
                mfaTotpService.existsConfirmed.mockResolvedValue(hasTotp);
                mfaPasskeyService.existsByUser.mockResolvedValue(hasPasskey);
                featureFlagService.isMetadataAllowed.mockImplementation(
                    async (_key, metadataKey) =>
                        metadataKey === EnumFeatureFlagMetadataKey.totpAllowed
                            ? totpAllowed
                            : passkeyAllowed
                );

                await expect(
                    service.getLoginMethods('user-quartz')
                ).resolves.toEqual(expected);
            }
        );

        it('leaves out backupCode when the user has no Mfa row', async () => {
            mfaRepository.findOneByUserId.mockResolvedValue(null);
            mfaTotpService.existsConfirmed.mockResolvedValue(true);
            mfaPasskeyService.existsByUser.mockResolvedValue(false);
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.getLoginMethods('user-quartz')
            ).resolves.toEqual([EnumMfaMethod.totp]);
        });
    });

    describe('isEnabled', () => {
        it('answers false and reads no flag for a user with no stored factor', async () => {
            mfaTotpService.existsConfirmed.mockResolvedValue(false);
            mfaPasskeyService.existsByUser.mockResolvedValue(false);

            await expect(service.isEnabled('user-quartz')).resolves.toBe(false);
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
                mfaTotpService.existsConfirmed.mockResolvedValue(hasTotp);
                mfaPasskeyService.existsByUser.mockResolvedValue(hasPasskey);
                featureFlagService.isMetadataAllowed.mockImplementation(
                    async (_key, metadataKey) =>
                        metadataKey === EnumFeatureFlagMetadataKey.totpAllowed
                            ? totpAllowed
                            : passkeyAllowed
                );

                await expect(service.isEnabled('user-quartz')).resolves.toBe(
                    expected
                );
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
                statusCodeKey: 'notEnabled',
                messagePath: 'mfa.error.notEnabled',
            });
        });
    });

    describe('assertEnabled', () => {
        it('answers nothing with MFA on', async () => {
            mfaTotpService.existsConfirmed.mockResolvedValue(false);
            mfaPasskeyService.existsByUser.mockResolvedValue(true);
            featureFlagService.isMetadataAllowed.mockResolvedValue(true);

            await expect(
                service.assertEnabled('user-quartz')
            ).resolves.toBeUndefined();
        });

        it('throws MfaNotEnabledException with MFA off', async () => {
            mfaTotpService.existsConfirmed.mockResolvedValue(false);
            mfaPasskeyService.existsByUser.mockResolvedValue(false);

            await expect(
                service.assertEnabled('user-quartz')
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

    describe('createInTx', () => {
        it('creates the Mfa row on the tx', async () => {
            mfaRepository.createInTx.mockResolvedValue(baseMfa);

            await service.createInTx(tx, 'user-quartz', 'admin-quartz');

            expect(mfaRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-quartz',
                'admin-quartz'
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
            expect(helperHashService.sha256Hash).not.toHaveBeenCalled();
        });

        it('starts every code hash together', async () => {
            let running = 0;
            let peak = 0;
            helperStringService.randomUppercase.mockReturnValue('CODE');
            helperHashService.argon2Hash.mockImplementation(async () => {
                running += 1;
                peak = Math.max(peak, running);
                await Promise.resolve();
                running -= 1;

                return '$argon2id$hash';
            });
            mfaRepository.findOneByUserIdInTx.mockResolvedValue({
                ...baseMfa,
                backupCodes: [],
            });
            mfaRepository.createBackupCodesInTx.mockResolvedValue(true);

            await service.createBackupCodesInTx(tx, 'user-quartz');

            expect(peak).toBe(3);
        });

        it('answers null when the row holds codes', async () => {
            mfaRepository.findOneByUserIdInTx.mockResolvedValue(baseMfa);

            await expect(
                service.createBackupCodesInTx(tx, 'user-quartz')
            ).resolves.toBeNull();
            expect(helperHashService.argon2Hash).not.toHaveBeenCalled();
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
