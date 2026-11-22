import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { UserQueueFactory } from '@modules/user/factories/user.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('UserQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: UserQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        factory = module.get(UserQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options and no connection from queue config', () => {
            stubConfigValues(configService, {
                'queue.job.maxAttempts': 5,
                'queue.job.keepLogs': 100,
                'queue.job.userBackoffDelayInMs': 2500,
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
