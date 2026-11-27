import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { MfaQueueFactory } from '@modules/mfa/factories/mfa.queue.factory';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';

describe('MfaQueueFactory', () => {
    let configService: MockProxy<ConfigService>;
    let factory: MfaQueueFactory;

    beforeEach(async () => {
        configService = buildConfigService({});
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        factory = module.get(MfaQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options and no connection from queue config', () => {
            stubConfigValues(configService, {
                'mfa.queue.maxAttempts': 5,
                'mfa.queue.keepLogs': 100,
                'mfa.queue.backoffDelayInMs': 2500,
                'mfa.queue.removeOnCompleteAgeInSeconds': 3600,
                'mfa.queue.removeOnFailAgeInSeconds': 86400,
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
