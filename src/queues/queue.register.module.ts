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
            BullModule.registerQueue({
                name: EnumQueue.notificationEmail,
                configKey: QueueConfigKey,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 10000,
                    },
                    removeOnComplete: 50,
                    removeOnFail: 100,
                },
            }),
            BullModule.registerQueue({
                name: EnumQueue.notificationPush,
                configKey: QueueConfigKey,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: 50,
                    removeOnFail: 100,
                },
            }),
            BullModule.registerQueue({
                name: EnumQueue.notification,
                configKey: QueueConfigKey,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 3000,
                    },
                    removeOnComplete: 50,
                    removeOnFail: 100,
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
                                delay: 3000,
                            },
                            attempts: 3,
                            removeOnComplete: 50,
                            removeOnFail: 100,
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
                                delay: 3000,
                            },
                            attempts: 3,
                            removeOnComplete: 50,
                            removeOnFail: 100,
                        },
                    }),
                }),
            ],
        };
    }
}
