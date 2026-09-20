import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { NotificationEmailQueueFactory } from '@modules/notification/factories/notification.email.queue.factory';

describe('NotificationEmailQueueFactory', () => {
    const configService = new ConfigService({
        'queue.job.attempts': 4,
        'queue.job.emailBackoffDelayInMs': 111,
        'queue.job.pushBackoffDelayInMs': 222,
        'queue.job.notificationBackoffDelayInMs': 333,
        'queue.job.workspaceBackoffDelayInMs': 444,
        'queue.job.removeOnCompleteAgeInSeconds': 555,
        'queue.job.removeOnFailAgeInSeconds': 666,
    });

    it('builds default job options from the queue config with the email backoff delay', () => {
        const factory = new NotificationEmailQueueFactory(configService);

        expect(factory.createRegisterQueueOptions()).toEqual({
            defaultJobOptions: {
                attempts: 4,
                backoff: { type: 'exponential', delay: 111 },
                removeOnComplete: { age: 555 },
                removeOnFail: { age: 666 },
            },
        });
    });
});
