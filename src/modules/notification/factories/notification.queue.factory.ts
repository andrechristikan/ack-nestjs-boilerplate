import {
    RegisterQueueOptions,
    RegisterQueueOptionsFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationQueueFactory implements RegisterQueueOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createRegisterQueueOptions(): RegisterQueueOptions {
        return {
            defaultJobOptions: {
                attempts: this.configService.get<number>('queue.job.attempts'),
                backoff: {
                    type: 'exponential',
                    delay: this.configService.get<number>(
                        'queue.job.notificationBackoffDelayInMs'
                    ),
                },
                removeOnComplete: {
                    age: this.configService.get<number>(
                        'queue.job.removeOnCompleteAgeInSeconds'
                    )!,
                },
                removeOnFail: {
                    age: this.configService.get<number>(
                        'queue.job.removeOnFailAgeInSeconds'
                    )!,
                },
            },
        };
    }
}
