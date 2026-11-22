import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationPushQueueFactory } from '@modules/notification/factories/notification.push.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('NotificationPushQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: NotificationPushQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module = await Test.createTestingModule({
            providers: [
                NotificationPushQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        factory = module.get(NotificationPushQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options and no connection from queue config', () => {
            stubConfigValues(configService, {
                'queue.job.maxAttempts': 5,
                'queue.job.keepLogs': 100,
                'queue.job.pushBackoffDelayInMs': 1500,
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
