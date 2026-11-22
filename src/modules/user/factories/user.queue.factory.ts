import type {
    RegisterQueueOptions,
    RegisterQueueOptionsFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserQueueFactory implements RegisterQueueOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createRegisterQueueOptions(): RegisterQueueOptions {
        const maxAttempts = this.configService.get<number>(
            'queue.job.maxAttempts'
        )!;
        const keepLogs = this.configService.get<number>('queue.job.keepLogs')!;
        const backoffDelayInMs = this.configService.get<number>(
            'queue.job.userBackoffDelayInMs'
        )!;
        const removeOnCompleteAgeInSeconds = this.configService.get<number>(
            'queue.job.removeOnCompleteAgeInSeconds'
        )!;
        const removeOnFailAgeInSeconds = this.configService.get<number>(
            'queue.job.removeOnFailAgeInSeconds'
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
