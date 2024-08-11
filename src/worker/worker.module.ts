import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from 'src/modules/email/email.module';
import { EmailProcessor } from 'src/modules/email/processors/email.processor';
import { WORKER_CONNECTION_NAME } from 'src/worker/constants/worker.constant';

@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    name: WORKER_CONNECTION_NAME,
                    host: configService.get<string>('redis.host'),
                    port: configService.get<number>('redis.port'),
                    password: configService.get<string>('redis.password'),
                    tls: configService.get<any>('redis.tls'),
                },
                defaultJobOptions: {
                    backoff: {
                        type: 'exponential',
                        delay: 3000,
                    },
                    attempts: 3,
                },
            }),
        }),
        EmailModule,
    ],
    providers: [EmailProcessor],
})
export class WorkerModule {}
