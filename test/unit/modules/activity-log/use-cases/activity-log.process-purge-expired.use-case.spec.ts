import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MessageService } from '@common/message/services/message.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogProcessPurgeExpiredUseCase } from '@modules/activity-log/use-cases/activity-log.process-purge-expired.use-case';

describe('ActivityLogProcessPurgeExpiredUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: ActivityLogProcessPurgeExpiredUseCase;

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogProcessPurgeExpiredUseCase,
                { provide: MessageService, useValue: messageService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(ActivityLogProcessPurgeExpiredUseCase);
    });

    describe('execute', () => {
        it('purges the expired activity entries and reports the count', async () => {
            activityLogService.purgeExpired.mockResolvedValue(3);

            const result = await useCase.execute();

            expect(activityLogService.purgeExpired).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                message: 'activityLog.queue.purgeExpired',
                activityLogs: 3,
            });
        });

        it('rejects when the purge rejects', async () => {
            const error = new Error('db down');
            activityLogService.purgeExpired.mockRejectedValue(error);

            await expect(useCase.execute()).rejects.toBe(error);
        });
    });
});
