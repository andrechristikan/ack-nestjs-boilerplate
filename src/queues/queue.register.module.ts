import { EnumAppEnvironment } from '@app/enums/app.enum';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import queueConfig from '@configs/queue.config';
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
        const { job } = queueConfig();

        const queues = [
            BullModule.registerQueue({
                name: EnumQueue.notificationEmail,
                configKey: QueueConfigKey,
                defaultJobOptions: {
                    attempts: job.attempts,
                    backoff: {
                        type: 'exponential',
                        delay: job.emailBackoffDelayInMs,
                    },
                    removeOnComplete: job.removeOnComplete,
                    removeOnFail: job.removeOnFail,
                },
            }),
            BullModule.registerQueue({
                name: EnumQueue.notificationPush,
                configKey: QueueConfigKey,
                defaultJobOptions: {
                    attempts: job.attempts,
                    backoff: {
                        type: 'exponential',
                        delay: job.pushBackoffDelayInMs,
                    },
                    removeOnComplete: job.removeOnComplete,
                    removeOnFail: job.removeOnFail,
                },
            }),
            BullModule.registerQueue({
                name: EnumQueue.notification,
                configKey: QueueConfigKey,
                defaultJobOptions: {
                    attempts: job.attempts,
                    backoff: {
                        type: 'exponential',
                        delay: job.notificationBackoffDelayInMs,
                    },
                    removeOnComplete: job.removeOnComplete,
                    removeOnFail: job.removeOnFail,
                },
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
                            attempts: configService.get<number>(
                                'queue.job.attempts'
                            ),
                            removeOnComplete: configService.get<number>(
                                'queue.job.removeOnComplete'
                            ),
                            removeOnFail: configService.get<number>(
                                'queue.job.removeOnFail'
                            ),
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
                            attempts: configService.get<number>(
                                'queue.job.attempts'
                            ),
                            removeOnComplete: configService.get<number>(
                                'queue.job.removeOnComplete'
                            ),
                            removeOnFail: configService.get<number>(
                                'queue.job.removeOnFail'
                            ),
                        },
                    }),
                }),
            ],
        };
    }
}
