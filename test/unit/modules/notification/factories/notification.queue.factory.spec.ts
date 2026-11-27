import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { NotificationQueueFactory } from '@modules/notification/factories/notification.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('NotificationQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: NotificationQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module = await Test.createTestingModule({
            providers: [
                NotificationQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        factory = module.get(NotificationQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options and no connection from queue config', () => {
            stubConfigValues(configService, {
                'notification.queue.maxAttempts': 5,
                'notification.queue.keepLogs': 100,
                'notification.queue.backoffDelayInMs': 2500,
                'notification.queue.removeOnCompleteAgeInSeconds': 3600,
                'notification.queue.removeOnFailAgeInSeconds': 86400,
            });

            const options = factory.createRegisterQueueOptions();

            expect(options).toEqual({
                defaultJobOptions: {
                    attempts: 5,
                    keepLogs: 100,
                    backoff: {
                        type: 'exponential',
                        delay: 2500,
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
