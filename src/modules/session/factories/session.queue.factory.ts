import type {
    RegisterQueueOptions,
    RegisterQueueOptionsFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionQueueFactory implements RegisterQueueOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createRegisterQueueOptions(): RegisterQueueOptions {
        const maxAttempts = this.configService.get<number>(
            'session.queue.maxAttempts'
        )!;
        const keepLogs = this.configService.get<number>(
            'session.queue.keepLogs'
        )!;
        const backoffDelayInMs = this.configService.get<number>(
            'session.queue.backoffDelayInMs'
        )!;
        const removeOnCompleteAgeInSeconds = this.configService.get<number>(
            'session.queue.removeOnCompleteAgeInSeconds'
        )!;
        const removeOnFailAgeInSeconds = this.configService.get<number>(
            'session.queue.removeOnFailAgeInSeconds'
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
