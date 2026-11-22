import { setImmediate } from 'node:timers/promises';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import {
    EnumNotificationKind,
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { INotificationPushSendPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationPushDeliveryService } from '@modules/notification/services/notification.push.delivery.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationPushProcessSendUseCase } from '@modules/notification/use-cases/notification.push.process-send.use-case';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildSealedNotificationPayload } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('NotificationPushProcessSendUseCase', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const notificationPushDeliveryService: MockProxy<NotificationPushDeliveryService> =
        mock<NotificationPushDeliveryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    let useCase: NotificationPushProcessSendUseCase;
    let updatedPatches: object[];

    const data: INotificationPushSendPayload = {
        kind: EnumNotificationKind.workspaceInvite,
        notificationId: 'notification-id',
        userId: 'user-id',
        username: 'invitee',
        encryptedTokens: ['cipher(token-1)', 'cipher(token-2)'],
        context: {
            userId: 'user-id',
            proceedBy: 'actor-id',
            workspaceId: 'workspace-id',
            workspaceName: 'Acme',
            inviterName: 'Alice',
            reference: 'WI-ref',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            expiredAt: '2024-01-08T00:00:00.000Z',
            encryptedLink: 'cipher(https://app.test/invite/token)',
            snapshot: null,
            verificationId: null,
        },
        completedSteps: [],
        encryptedPendingTokens: null,
        encryptedFailureTokens: null,
    };

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        updatedPatches = [];
        outboxService.updateData.mockImplementation(async (_id, patch) => {
            updatedPatches.push(structuredClone(patch));
        });
        firebaseService.isInitialized.mockReturnValue(true);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushProcessSendUseCase,
                NotificationUtil,
                { provide: FirebaseService, useValue: firebaseService },
                {
                    provide: NotificationPushDeliveryService,
                    useValue: notificationPushDeliveryService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: DeviceService, useValue: deviceService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: MessageService, useValue: messageService },
            ],
        }).compile();
        useCase = module.get(NotificationPushProcessSendUseCase);
    });

    describe('execute', () => {
        it('sends the body with each date field formatted to RFC 2822', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                kind: EnumNotificationKind.temporaryPasswordByAdmin,
                context: {
                    userId: 'user-id',
                    proceedBy: 'actor-id',
                    passwordExpiredAt: '2026-06-01T00:00:00.000Z',
                    snapshot: null,
                    verificationId: null,
                },
            });

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.temporaryPasswordByAdmin.body',
                {
                    properties: {
                        username: 'invitee',
                        passwordExpiredAt: 'Mon, 01 Jun 2026 00:00:00 +0000',
                    },
                }
            );
        });

        it('sends the body with each sealed secret field opened to its plain property and no sealed key', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                kind: EnumNotificationKind.verifiedMobileNumber,
                context: {
                    userId: 'user-id',
                    proceedBy: 'actor-id',
                    reference: 'VRF-abc',
                    encryptedMobileNumber: buildSealedNotificationPayload(
                        '+6281234567890',
                        'user-id'
                    ),
                    snapshot: null,
                    verificationId: null,
                },
            });

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.verifiedMobileNumber.body',
                {
                    properties: {
                        username: 'invitee',
                        mobileNumber: '+6281234567890',
                    },
                }
            );
        });

        it('sends the contract title and body with the metadata, then stamps sent and clears the dead tokens on one tx', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: ['cipher(token-2)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([
                'token-2',
            ]);
            const txCalls: string[] = [];
            notificationPushDeliveryService.stampSentInTx.mockImplementation(
                async () => {
                    txCalls.push('stampSent');
                }
            );
            deviceService.cleanupNotificationTokensInTx.mockImplementation(
                async () => {
                    txCalls.push('cleanup');
                }
            );
            outboxService.updateDataInTx.mockImplementation(async () => {
                txCalls.push('updateData');
            });

            const result = await useCase.execute('outbox-id', data);

            expect(
                notificationPushDeliveryService.stampProcessed
            ).toHaveBeenCalledWith(
                'notification-id',
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'notification.notify.workspaceInvite.body',
                {
                    properties: {
                        username: 'invitee',
                        workspaceId: 'workspace-id',
                        workspaceName: 'Acme',
                        inviterName: 'Alice',
                    },
                }
            );
            expect(
                notificationPushDeliveryService.sendMulticast
            ).toHaveBeenCalledWith(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                {
                    title: 'notification.notify.workspaceInvite.title',
                    body: 'notification.notify.workspaceInvite.body',
                },
                null,
                null
            );
            expect(
                notificationPushDeliveryService.stampSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                ['token-2'],
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(
                deviceService.cleanupNotificationTokensInTx
            ).toHaveBeenCalledWith(tx, 'user-id', ['token-2']);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.updateDataInTx).toHaveBeenCalledWith(
                tx,
                'outbox-id',
                {
                    completedSteps: [
                        EnumNotificationStep.updateProcessAt,
                        EnumNotificationStep.sendMulticast,
                        EnumNotificationStep.updateSentAt,
                    ],
                    encryptedPendingTokens: [],
                    encryptedFailureTokens: ['cipher(token-2)'],
                }
            );
            expect(txCalls).toEqual(['stampSent', 'updateData', 'cleanup']);
            expect(updatedPatches).toEqual([
                {
                    completedSteps: [
                        EnumNotificationStep.updateProcessAt,
                        EnumNotificationStep.sendMulticast,
                    ],
                    encryptedPendingTokens: [],
                    encryptedFailureTokens: ['cipher(token-2)'],
                },
            ]);
            expect(result).toEqual({ message: 'notification.queue.push.send' });
        });

        it('stamps sent alone, then patches the step state and clears the dead tokens together', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: ['cipher(token-2)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([
                'token-2',
            ]);
            const started: string[] = [];
            const stamp = buildDeferred<void>();
            const patch = buildDeferred<void>();
            const cleanup = buildDeferred<void>();
            notificationPushDeliveryService.stampSentInTx.mockImplementation(
                () => {
                    started.push('stampSent');

                    return stamp.promise;
                }
            );
            outboxService.updateDataInTx.mockImplementation(() => {
                started.push('updateData');

                return patch.promise;
            });
            deviceService.cleanupNotificationTokensInTx.mockImplementation(
                () => {
                    started.push('cleanup');

                    return cleanup.promise;
                }
            );

            const running = useCase.execute('outbox-id', data);
            await setImmediate();

            expect(started).toEqual(['stampSent']);

            stamp.resolve();
            await setImmediate();

            expect(started).toEqual(['stampSent', 'updateData', 'cleanup']);

            patch.resolve();
            cleanup.resolve();
            await running;
        });

        it('records the send step before the sent stamp, so a failed stamp does not re-send', async () => {
            const rawError = new Error('transaction failed');
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: ['cipher(token-2)'],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([
                'token-2',
            ]);
            databaseService.withTransaction.mockRejectedValue(rawError);

            await expect(useCase.execute('outbox-id', data)).rejects.toBe(
                rawError
            );

            expect(updatedPatches).toEqual([
                {
                    completedSteps: [
                        EnumNotificationStep.updateProcessAt,
                        EnumNotificationStep.sendMulticast,
                    ],
                    encryptedPendingTokens: [],
                    encryptedFailureTokens: ['cipher(token-2)'],
                },
            ]);
        });

        it('clears no token when none failed', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', data);

            expect(
                notificationPushDeliveryService.stampSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                [],
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(
                deviceService.cleanupNotificationTokensInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('records the pending tokens and throws, stamping no sent, while a token is pending', async () => {
            const rawError = new Error('pending');
            const failure = {
                step: EnumNotificationStep.sendMulticast,
                rawError,
            };
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: ['cipher(token-1)'],
                failure,
            });
            notificationPushDeliveryService.toStepSummary.mockReturnValue(
                'steps failed'
            );

            await expect(
                useCase.execute('outbox-id', data)
            ).rejects.toMatchObject({
                constructor: QueueException,
                message: 'steps failed',
                rawError,
            });

            expect(
                notificationPushDeliveryService.toStepSummary
            ).toHaveBeenCalledWith([failure]);

            expect(outboxService.updateData).toHaveBeenCalledWith('outbox-id', {
                completedSteps: [EnumNotificationStep.updateProcessAt],
                encryptedPendingTokens: ['cipher(token-1)'],
                encryptedFailureTokens: [],
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('retries only the pending tokens and skips a completed step', async () => {
            notificationPushDeliveryService.sendMulticast.mockResolvedValue({
                encryptedFailureTokens: [],
                encryptedPendingTokens: [],
                failure: null,
            });
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [EnumNotificationStep.updateProcessAt],
                encryptedPendingTokens: ['cipher(token-1)'],
                encryptedFailureTokens: [],
            });

            expect(
                notificationPushDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(
                notificationPushDeliveryService.sendMulticast
            ).toHaveBeenCalledWith(
                'user-id',
                ['cipher(token-1)', 'cipher(token-2)'],
                expect.anything(),
                [],
                ['cipher(token-1)']
            );
        });

        it('opens no transaction and writes nothing to the outbox row when every step is already recorded', async () => {
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                    EnumNotificationStep.updateSentAt,
                ],
            });

            expect(
                notificationPushDeliveryService.sendMulticast
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(outboxService.updateDataInTx).not.toHaveBeenCalled();
        });

        it('stamps the sent time with no failed tokens when the send is recorded and none were kept', async () => {
            notificationService.decryptFailureTokens.mockReturnValue([]);

            await useCase.execute('outbox-id', {
                ...data,
                completedSteps: [
                    EnumNotificationStep.updateProcessAt,
                    EnumNotificationStep.sendMulticast,
                ],
            });

            expect(
                notificationPushDeliveryService.sendMulticast
            ).not.toHaveBeenCalled();
            expect(
                notificationService.decryptFailureTokens
            ).toHaveBeenCalledWith('user-id', []);
            expect(
                notificationPushDeliveryService.stampSentInTx
            ).toHaveBeenCalledWith(
                tx,
                'notification-id',
                [],
                EnumNotificationPushProcess.send,
                'actor-id'
            );
            expect(
                deviceService.cleanupNotificationTokensInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('sends nothing while Firebase is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);

            const result = await useCase.execute('outbox-id', data);

            expect(
                notificationPushDeliveryService.stampProcessed
            ).not.toHaveBeenCalled();
            expect(outboxService.updateData).not.toHaveBeenCalled();
            expect(result).toEqual({
                message: 'notification.queue.push.error.firebaseNotInitialized',
            });
        });
    });
});
