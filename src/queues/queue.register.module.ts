import { EnumAppEnvironment } from '@app/enums/app.enum';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
    QueueConfigKey,
    QueueProcessorConfigKey,
} from '@queues/constants/queue.constant';
import { EnumQueue } from '@queues/enums/queue.enum';

/**
 * Registers BullMQ queues and their Redis connections (queue + processor) with default job options.
 */
@Global()
@Module({})
export class QueueRegisterModule {
    static forRoot(): DynamicModule {
        const queues = [
            BullModule.registerQueueAsync({
                name: EnumQueue.notificationEmail,
                configKey: QueueConfigKey,
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    defaultJobOptions: {
                        attempts:
                            configService.get<number>('queue.job.attempts'),
                        backoff: {
                            type: 'exponential',
                            delay: configService.get<number>(
                                'queue.job.emailBackoffDelayInMs'
                            ),
                        },
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
            BullModule.registerQueueAsync({
                name: EnumQueue.notificationPush,
                configKey: QueueConfigKey,
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    defaultJobOptions: {
                        attempts:
                            configService.get<number>('queue.job.attempts'),
                        backoff: {
                            type: 'exponential',
                            delay: configService.get<number>(
                                'queue.job.pushBackoffDelayInMs'
                            ),
                        },
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
            BullModule.registerQueueAsync({
                name: EnumQueue.notification,
                configKey: QueueConfigKey,
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    defaultJobOptions: {
                        attempts:
                            configService.get<number>('queue.job.attempts'),
                        backoff: {
                            type: 'exponential',
                            delay: configService.get<number>(
                                'queue.job.notificationBackoffDelayInMs'
                            ),
                        },
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
            BullModule.registerQueueAsync({
                name: EnumQueue.workspace,
                configKey: QueueConfigKey,
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => ({
                    defaultJobOptions: {
                        attempts:
                            configService.get<number>('queue.job.attempts'),
                        backoff: {
                            type: 'exponential',
                            delay: configService.get<number>(
                                'queue.job.workspaceBackoffDelayInMs'
                            ),
                        },
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
        ];

        return {
            module: QueueRegisterModule,
            exports: queues,
            imports: [
                ...queues,
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
