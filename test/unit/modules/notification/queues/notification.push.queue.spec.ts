import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipientRecord,
    INotificationSealedData,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('NotificationPushQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationPushQueue: MockProxy<Queue> = mock<Queue>();
    let configService: MockProxy<ConfigService>;
    let queue: NotificationPushQueue;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        configService = buildConfigService({
            ...TestUnitKitConfigValues,
            'notification.idempotencyKey.stepPattern':
                '{notificationId}-{step}',
            'notification.push.cleanupStaleTokensCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                ...TestUnitKitProviders,
                { provide: MessageService, useValue: messageService },
                NotificationPushQueue,
                {
                    provide: getQueueToken(
                        EnumNotificationQueue.notificationPush
                    ),
                    useValue: notificationPushQueue,
                },
                NotificationUtil,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(NotificationPushQueue);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring stale-token cleanup job', async () => {
            await queue.onModuleInit();

            expect(
                notificationPushQueue.upsertJobScheduler
            ).toHaveBeenCalledTimes(1);
            expect(
                notificationPushQueue.upsertJobScheduler
            ).toHaveBeenCalledWith(
                EnumNotificationPushProcess.cleanupStaleTokens,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumNotificationPushProcess.cleanupStaleTokens,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });
    });

    describe('sendCleanupStaleTokens', () => {
        it('creates or updates the recurring stale-token cleanup job scheduler', async () => {
            await queue.sendCleanupStaleTokens();

            expect(
                notificationPushQueue.upsertJobScheduler
            ).toHaveBeenCalledWith(
                EnumNotificationPushProcess.cleanupStaleTokens,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumNotificationPushProcess.cleanupStaleTokens,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            notificationPushQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.sendCleanupStaleTokens()).rejects.toBe(error);
        });
    });

    describe('sendEffect', () => {
        it('returns the push send effect keyed by the sendPush step with the kind priority', () => {
            const context: INotificationSealedData = {
                userId: 'user-id',
                proceedBy: 'actor-id',
                workspaceId: 'workspace-id',
                encryptedInviteAcceptLink: 'encrypted-link',
                snapshot: null,
                verificationId: null,
            };
            const recipient: INotificationRecipientRecord = {
                userId: 'user-id',
                username: 'invitee',
                encryptedEmail: 'encrypted-email',
                encryptedTokens: ['encrypted-token'],
                encryptedMobileNumber: null,
                channels: [EnumNotificationChannel.push],
            };

            const result = queue.sendEffect(
                EnumNotificationKind.workspaceInvite,
                'notification-id',
                context,
                recipient
            );

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationPush,
                name: EnumNotificationPushProcess.send,
                data: {
                    kind: EnumNotificationKind.workspaceInvite,
                    notificationId: 'notification-id',
                    userId: 'user-id',
                    username: 'invitee',
                    encryptedTokens: ['encrypted-token'],
                    context,
                    completedSteps: [],
                    encryptedPendingTokens: null,
                    encryptedFailureTokens: null,
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'notification-id-sendPush',
            });
        });
    });

    describe('cleanupTokensEffect', () => {
        it('returns the push cleanup effect for the failure tokens', () => {
            const result = queue.cleanupTokensEffect('user-id', [
                'encrypted-token',
            ]);

            expect(result).toEqual({
                queue: EnumNotificationQueue.notificationPush,
                name: EnumNotificationPushProcess.cleanupTokens,
                data: {
                    userId: 'user-id',
                    encryptedFailureTokens: ['encrypted-token'],
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
        });
    });
});
