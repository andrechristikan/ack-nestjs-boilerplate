import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyQueueFactory } from '@modules/term-policy/factories/term-policy.queue.factory';

describe('TermPolicyQueueFactory', () => {
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    let factory: TermPolicyQueueFactory;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyQueueFactory,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        factory = module.get(TermPolicyQueueFactory);
    });

    describe('createRegisterQueueOptions', () => {
        it('builds the default job options from queue config', () => {
            configGet.mockImplementation((key: string) => {
                const values: Record<string, unknown> = {
                    'queue.job.attempts': 5,
                    'queue.job.keepLogs': 100,
                    'queue.job.termPolicyBackoffDelayInMs': 2500,
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
