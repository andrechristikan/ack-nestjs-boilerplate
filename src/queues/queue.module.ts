import { EnumAppEnvironment } from '@app/enums/app.enum';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueConfigKey } from '@queues/constants/queue.constant';

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
                            url: configService.get<string>('redis.queue.url')!,
                            connectionName: `${configService.get<string>(
                                'app.name'
                            )}-${configService.get<EnumAppEnvironment>('app.env')}:queue`,
                            enableOfflineQueue: false,
                            connectTimeout: configService.get<number>(
                                'queue.redis.connectTimeoutInMs'
                            )!,
                            maxRetriesPerRequest: configService.get<number>(
                                'queue.redis.maxRetriesPerRequest'
                            )!,
                        },
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
        };
    }
}
