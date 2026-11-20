import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { EnumNotificationQueue } from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('NotificationPushQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const notificationPushQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let configService: MockProxy<ConfigService>;
    let queue: NotificationPushQueue;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'notification.push.cleanupStaleTokensCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationPushQueue,
                {
                    provide: getQueueToken(
                        EnumNotificationQueue.notificationPush
                    ),
                    useValue: notificationPushQueue,
                },
                { provide: CacheService, useValue: cacheService },
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
});
