import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { SessionQueueFactory } from '@modules/session/factories/session.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('SessionQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: SessionQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        factory = module.get(SessionQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options and no connection from queue config', () => {
            stubConfigValues(configService, {
                'session.queue.maxAttempts': 5,
                'session.queue.keepLogs': 100,
                'session.queue.backoffDelayInMs': 2500,
                'session.queue.removeOnCompleteAgeInSeconds': 3600,
                'session.queue.removeOnFailAgeInSeconds': 86400,
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
