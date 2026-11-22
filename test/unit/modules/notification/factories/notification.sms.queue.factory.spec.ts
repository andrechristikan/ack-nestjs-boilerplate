import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationSmsQueueFactory } from '@modules/notification/factories/notification.sms.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('NotificationSmsQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: NotificationSmsQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module = await Test.createTestingModule({
            providers: [
                NotificationSmsQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        factory = module.get(NotificationSmsQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options and no connection from queue config', () => {
            stubConfigValues(configService, {
                'queue.job.maxAttempts': 5,
                'queue.job.keepLogs': 100,
                'queue.job.smsBackoffDelayInMs': 1500,
                'queue.job.removeOnCompleteAgeInSeconds': 3600,
                'queue.job.removeOnFailAgeInSeconds': 86400,
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
