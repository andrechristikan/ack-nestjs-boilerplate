import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { NotificationQueueFactory } from '@modules/notification/factories/notification.queue.factory';

describe('NotificationQueueFactory', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const config: Record<string, number> = {
        'queue.job.attempts': 4,
        'queue.job.emailBackoffDelayInMs': 111,
        'queue.job.pushBackoffDelayInMs': 222,
        'queue.job.notificationBackoffDelayInMs': 333,
        'queue.job.workspaceBackoffDelayInMs': 444,
        'queue.job.removeOnCompleteAgeInSeconds': 555,
        'queue.job.removeOnFailAgeInSeconds': 666,
    };

    let factory: NotificationQueueFactory;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => config[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        factory = module.get(NotificationQueueFactory);
    });

    it('builds default job options from the queue config with the notification backoff delay', () => {
        expect(factory.createRegisterQueueOptions()).toEqual({
            defaultJobOptions: {
                attempts: 4,
                backoff: { type: 'exponential', delay: 333 },
                removeOnComplete: { age: 555 },
                removeOnFail: { age: 666 },
            },
        });
    });
});
