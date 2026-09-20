import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { WorkspaceQueueFactory } from '@modules/workspace/factories/workspace.queue.factory';

describe('WorkspaceQueueFactory', () => {
    const configService = new ConfigService({
        'queue.job.attempts': 4,
        'queue.job.emailBackoffDelayInMs': 111,
        'queue.job.pushBackoffDelayInMs': 222,
        'queue.job.notificationBackoffDelayInMs': 333,
        'queue.job.workspaceBackoffDelayInMs': 444,
        'queue.job.removeOnCompleteAgeInSeconds': 555,
        'queue.job.removeOnFailAgeInSeconds': 666,
    });

    it('builds default job options from the queue config with the workspace backoff delay', () => {
        const factory = new WorkspaceQueueFactory(configService);

        expect(factory.createRegisterQueueOptions()).toEqual({
            defaultJobOptions: {
                attempts: 4,
                backoff: { type: 'exponential', delay: 444 },
                removeOnComplete: { age: 555 },
                removeOnFail: { age: 666 },
            },
        });
    });
});
