import { EnumAppEnvironment } from '@app/enums/app.enum';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
    QueueConfigKey,
    QueueProcessorConfigKey,
} from '@queues/constants/queue.constant';

/**
 * Registers the two BullMQ Redis connections (producer + processor).
 * Named queues are registered by the owning feature's domain module.
 */
@Module({})
export class QueueModule {
    static forRoot(): DynamicModule {
        return {
            module: QueueModule,
            imports: [
                BullModule.forRootAsync(QueueConfigKey, {
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        connection: {
                            url: configService.get<string>('redis.queue.url'),
                            connectionName: `${configService.get<string>(
                                'app.name'
                            )}-${configService.get<EnumAppEnvironment>('app.env')}:queue`,
                        },
                        prefix: configService.get<string>(
                            'redis.queue.namespace'
                        ),
                        defaultJobOptions: {
                            backoff: {
                                type: 'exponential',
                                delay: configService.get<number>(
                                    'queue.job.notificationBackoffDelayInMs'
                                ),
                            },
                            attempts:
                                configService.get<number>('queue.job.attempts'),
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
                BullModule.forRootAsync(QueueProcessorConfigKey, {
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        connection: {
                            url: configService.get<string>('redis.queue.url'),
                            connectionName: `${configService.get<string>(
                                'app.name'
                            )}-${configService.get<EnumAppEnvironment>('app.env')}:processor`,
                        },
                        prefix: configService.get<string>(
                            'redis.queue.namespace'
                        ),
                        defaultJobOptions: {
                            backoff: {
                                type: 'exponential',
                                delay: configService.get<number>(
                                    'queue.job.notificationBackoffDelayInMs'
                                ),
                            },
                            attempts:
                                configService.get<number>('queue.job.attempts'),
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
