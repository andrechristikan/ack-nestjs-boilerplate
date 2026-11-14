import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import { NotificationSmsQueueFactory } from '@modules/notification/factories/notification.sms.queue.factory';

describe('NotificationSmsQueueFactory', () => {
    const configService = mock<ConfigService>();
    let factory: NotificationSmsQueueFactory;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        factory = module.get(NotificationSmsQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options from queue config', () => {
            vi.mocked(configService.get).mockImplementation((key: string) => {
                const values: Record<string, unknown> = {
                    'queue.job.attempts': 5,
                    'queue.job.keepLogs': 100,
                    'queue.job.smsBackoffDelayInMs': 1500,
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
                        delay: 1500,
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
