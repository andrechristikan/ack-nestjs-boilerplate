import { RedisQueueClient } from '@common/redis/constants/redis.constant';
import { QueueWorkerFactory } from '@queues/factories/queue.worker.factory';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

@Module({})
export class QueueModule {
    static forRoot(): DynamicModule {
        return {
            module: QueueModule,
            global: true,
            imports: [
                BullModule.forRootAsync({
                    imports: [ConfigModule],
                    inject: [ConfigService, RedisQueueClient],
                    useFactory: (
                        configService: ConfigService,
                        connection: Redis
                    ) => ({
                        connection,
                        prefix: configService.get<string>(
                            'redis.queue.namespace'
                        )!,
                        defaultJobOptions: {
                            backoff: {
                                type: 'exponential',
                                delay: configService.get<number>(
                                    'queue.job.notificationBackoffDelayInMs'
                                )!,
                            },
                            attempts:
                                configService.get<number>(
                                    'queue.job.attempts'
                                )!,
                            removeOnComplete: {
                                age: configService.get<number>(
                                    'queue.job.removeOnCompleteAgeInSeconds'
                                )!,
                            },
                            removeOnFail: {
                                age: configService.get<number>(
                                    'queue.job.removeOnFailAgeInSeconds'
                                )!,
                            },
                        },
                    }),
                }),
            ],
            controllers: [],
            providers: [QueueWorkerFactory],
            exports: [BullModule],
        };
    }
}
