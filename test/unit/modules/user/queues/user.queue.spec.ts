import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import type { UserPhoto } from '@generated/prisma-client/client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import { UserQueue } from '@modules/user/queues/user.queue';
import { MessageService } from '@common/message/services/message.service';

describe('UserQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const userQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const photo: UserPhoto = {
        bucket: 'bucket',
        key: 'photo-profile/user-1/old.png',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/old.png',
        mime: 'image/png',
        extension: 'png',
        access: 'public',
    };
    let queue: UserQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'user.jobId.deletePhotoPattern': '{process}-{nonce}',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                UserQueue,
                {
                    provide: getQueueToken(EnumQueue.user),
                    useValue: userQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        queue = module.get(UserQueue);
    });

    describe('deletePhoto', () => {
        it('adds a delete job with the photo key and access under a fresh job id', async () => {
            databaseUtil.createId.mockReturnValue('nonce-1');
            helperStringService.fillPattern.mockReturnValue(
                'deletePhoto-nonce-1'
            );

            await queue.deletePhoto('user-1', photo);

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{nonce}',
                { process: EnumUserProcess.deletePhoto, nonce: 'nonce-1' }
            );
            expect(userQueue.add).toHaveBeenCalledWith(
                EnumUserProcess.deletePhoto,
                {
                    userId: 'user-1',
                    key: 'photo-profile/user-1/old.png',
                    access: 'public',
                },
                {
                    priority: EnumQueuePriority.low,
                    jobId: 'deletePhoto-nonce-1',
                }
            );
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            userQueue.add.mockRejectedValue(error);

            await expect(
                queue.deletePhoto('user-1', photo)
            ).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: 'user.queue.error.enqueueDeletePhoto',
                })
            );
        });
    });
});
