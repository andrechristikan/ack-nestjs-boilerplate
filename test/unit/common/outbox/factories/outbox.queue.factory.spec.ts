import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { OutboxQueueFactory } from '@common/outbox/factories/outbox.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('OutboxQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: OutboxQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        factory = module.get(OutboxQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options with the outbox backoff delay', () => {
            stubConfigValues(configService, {
                'outbox.queue.maxAttempts': 5,
                'outbox.queue.keepLogs': 100,
                'outbox.queue.backoffDelayInMs': 10000,
                'outbox.queue.removeOnCompleteAgeInSeconds': 3600,
                'outbox.queue.removeOnFailAgeInSeconds': 86400,
            });

            const options = factory.createRegisterQueueOptions();

            expect(options).toEqual({
                defaultJobOptions: {
                    attempts: 5,
                    keepLogs: 100,
                    backoff: {
                        type: 'exponential',
                        delay: 10000,
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
