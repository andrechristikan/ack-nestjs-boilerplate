import type {
    RegisterQueueOptions,
    RegisterQueueOptionsFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationQueueFactory implements RegisterQueueOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createRegisterQueueOptions(): RegisterQueueOptions {
        const attempts = this.configService.get<number>('queue.job.attempts');
        const backoffDelayInMs = this.configService.get<number>(
            'queue.job.notificationBackoffDelayInMs'
        );
        const removeOnCompleteAgeInSeconds = this.configService.get<number>(
            'queue.job.removeOnCompleteAgeInSeconds'
        )!;
        const removeOnFailAgeInSeconds = this.configService.get<number>(
            'queue.job.removeOnFailAgeInSeconds'
        )!;

        return {
            defaultJobOptions: {
                attempts,
                backoff: {
                    type: 'exponential',
                    delay: backoffDelayInMs,
                },
                removeOnComplete: {
                    age: removeOnCompleteAgeInSeconds,
                },
                removeOnFail: {
                    age: removeOnFailAgeInSeconds,
                },
            },
        };
    }
}
