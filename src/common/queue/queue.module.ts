import { RedisQueueClient } from '@common/redis/constants/redis.constant';
import { QueueWorkerFactory } from '@common/queue/factories/queue.worker.factory';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

/** Shared module: BullModule, the shared BullMQ config, for every feature module registering a queue. */
@Global()
@Module({})
export class QueueModule {
    static forRoot(): DynamicModule {
        return {
            module: QueueModule,
            controllers: [],
            providers: [QueueWorkerFactory],
            exports: [BullModule],
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
                                    'queue.job.defaultBackoffDelayInMs'
                                )!,
                            },
                            attempts: configService.get<number>(
                                'queue.job.maxAttempts'
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
        };
    }
}
