import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationEmailQueueFactory } from '@modules/notification/factories/notification.email.queue.factory';

describe('NotificationEmailQueueFactory', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    let factory: NotificationEmailQueueFactory;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        factory = module.get(NotificationEmailQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options from queue config', () => {
            vi.mocked(configService.get).mockImplementation((key: string) => {
                const values: Record<string, unknown> = {
                    'queue.job.attempts': 5,
                    'queue.job.keepLogs': 100,
                    'queue.job.emailBackoffDelayInMs': 2000,
                    'queue.job.removeOnCompleteAgeInSeconds': 3600,
                    'queue.job.removeOnFailAgeInSeconds': 86400,
                };

                return values[key];
            });

            const options = factory.createRegisterQueueOptions();

            expect(options).toEqual({
                defaultJobOptions: {
                    attempts: 5,
                    keepLogs: 100,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: {
                        age: 3600,
                    },
                    removeOnFail: {
                        age: 86400,
                    },
                },
            });
        });
    });
});
