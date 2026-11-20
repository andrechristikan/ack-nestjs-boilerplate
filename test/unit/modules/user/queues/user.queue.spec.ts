import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserQueue } from '@modules/user/queues/user.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserQueue', () => {
    const userQueue: MockProxy<Queue> = mock<Queue>();
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    let configService: MockProxy<ConfigService>;
    let queue: UserQueue;

    beforeEach(async () => {
        configService = buildConfigService({
            'app.timezone': 'UTC',
            'user.purgeExpiredCron': '0 3 * * *',
        });
        const module = await Test.createTestingModule({
            providers: [
                UserQueue,
                {
                    provide: getQueueToken(EnumUserQueue.user),
                    useValue: userQueue,
                },
                { provide: CacheService, useValue: cacheService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        queue = module.get(UserQueue);
    });

    describe('onModuleInit', () => {
        it('schedules the recurring purge of expired identity rows', async () => {
            await queue.onModuleInit();

            expect(userQueue.upsertJobScheduler).toHaveBeenCalledTimes(1);
            expect(userQueue.upsertJobScheduler).toHaveBeenCalledWith(
                EnumUserProcess.purgeExpired,
                { pattern: '0 3 * * *', tz: 'UTC' },
                {
                    name: EnumUserProcess.purgeExpired,
                    data: {},
                    opts: { priority: EnumQueuePriority.low },
                }
            );
        });

        it('rejects when the scheduler upsert rejects', async () => {
            const error = new Error('redis down');
            userQueue.upsertJobScheduler.mockRejectedValue(error);

            await expect(queue.onModuleInit()).rejects.toBe(error);
        });
    });

    describe('deletePhotoEffect', () => {
        it('returns the low-priority deletePhoto effect carrying the user, key, and access and no business key', () => {
            const effect = queue.deletePhotoEffect('user-persimmon', {
                bucket: 'bucket',
                key: 'photo-profile/user-persimmon/previous.png',
                cdnUrl: null,
                completedUrl: 'https://cdn.example.com/previous.png',
                mime: 'image/png',
                extension: 'png',
                access: EnumAwsS3Accessibility.public,
            });

            expect(effect).toEqual({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.deletePhoto,
                data: {
                    userId: 'user-persimmon',
                    key: 'photo-profile/user-persimmon/previous.png',
                    access: EnumAwsS3Accessibility.public,
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
        });
    });

    describe('importByAdminEffect', () => {
        it('returns the medium-priority importByAdmin effect holding the rows and the activity payload given, created null, no business key', () => {
            const rows = [
                {
                    username: 'bramble2fox',
                    email: 'bramble@example.com',
                    name: null,
                },
            ];
            const activityLog: IActivityLogActorPayload = {
                actorUserId: 'admin-bramble',
                workspaceId: null,
                apiKeyId: 'api-key-1',
                requestLog: buildRequestContext().requestLog,
            };

            const effect = queue.importByAdminEffect(rows, activityLog);

            expect(effect).toEqual({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.importByAdmin,
                data: { rows, activityLog, created: null },
                priority: EnumQueuePriority.medium,
                idempotencyKey: null,
            });
        });
    });
});
