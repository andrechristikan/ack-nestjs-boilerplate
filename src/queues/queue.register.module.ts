import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
    QUEUE_CONFIG_KEY,
    QUEUE_PROCESSOR_CONFIG_KEY,
} from 'src/queues/constants/queue.constant';
import { ENUM_QUEUE } from 'src/queues/enums/queue.enum';

/**
 * Global module for registering Bull queues with default configurations
 * Provides dynamic module registration for email queuing system
 */
@Global()
@Module({})
export class QueueRegisterModule {
    /**
     * Creates and configures email queue with default job options
     * @returns {DynamicModule} Dynamic module with email queue configuration
     */
    static forRoot(): DynamicModule {
        const queues = [
            BullModule.registerQueue({
                name: ENUM_QUEUE.EMAIL,
                configKey: QUEUE_CONFIG_KEY,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: 20,
                    removeOnFail: 50,
                },
            }),
        ];

        return {
            module: QueueRegisterModule,
            exports: queues,
            imports: [
                ...queues,
                BullModule.forRootAsync(QUEUE_CONFIG_KEY, {
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        connection: {
                            url: configService.get<string>('redis.queue.url'),
                            connectionName: `${configService.get<string>(
                                'app.name'
                            )}-${configService.get<ENUM_APP_ENVIRONMENT>('app.env')}:queue`,
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
                            removeOnComplete: 20,
                            removeOnFail: 50,
                        },
                    }),
                }),
                BullModule.forRootAsync(QUEUE_PROCESSOR_CONFIG_KEY, {
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => ({
                        connection: {
                            url: configService.get<string>('redis.queue.url'),
                            connectionName: `${configService.get<string>(
                                'app.name'
                            )}-${configService.get<ENUM_APP_ENVIRONMENT>('app.env')}:processor`,
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
                            removeOnComplete: 20,
                            removeOnFail: 50,
                        },
                    }),
                }),
            ],
        };
    }
}
