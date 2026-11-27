import type {
    RegisterQueueOptions,
    RegisterQueueOptionsFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationSmsQueueFactory implements RegisterQueueOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createRegisterQueueOptions(): RegisterQueueOptions {
        const maxAttempts = this.configService.get<number>(
            'notification.queue.maxAttempts'
        )!;
        const keepLogs = this.configService.get<number>(
            'notification.queue.keepLogs'
        )!;
        const backoffDelayInMs = this.configService.get<number>(
            'notification.queue.smsBackoffDelayInMs'
        )!;
        const removeOnCompleteAgeInSeconds = this.configService.get<number>(
            'notification.queue.removeOnCompleteAgeInSeconds'
        )!;
        const removeOnFailAgeInSeconds = this.configService.get<number>(
            'notification.queue.removeOnFailAgeInSeconds'
        )!;

        return {
            defaultJobOptions: {
                attempts: maxAttempts,
                keepLogs,
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
