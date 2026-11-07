import { AwsModule } from '@common/aws/aws.module';
import { EnumHealthQueue } from '@modules/health/enums/health.enum';
import { HealthQueueFactory } from '@modules/health/factories/health.queue.factory';
import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';
import { HealthFirebaseIndicator } from '@modules/health/indicators/health.firebase.indicator';
import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';
import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';
import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

@Module({
    controllers: [],
    providers: [
        HealthService,
        HealthUtil,
        HealthAwsS3BucketIndicator,
        HealthAwsSESIndicator,
        HealthDatabaseIndicator,
        HealthInstanceIndicator,
        HealthRedisIndicator,
        HealthSentryIndicator,
        HealthFirebaseIndicator,
        HealthGoogleIndicator,
        HealthAppleIndicator,
        HealthJwksIndicator,
        HealthQueueIndicator,
    ],
    exports: [HealthService, HealthUtil],
    imports: [
        AwsModule,
        BullModule.registerQueueAsync({
            name: EnumHealthQueue.health,
            useClass: HealthQueueFactory,
        }),
        TerminusModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                gracefulShutdownTimeoutMs: configService.get<number>(
                    'health.gracefulShutdownTimeoutInMs'
                )!,
            }),
        }),
    ],
})
export class HealthModule {}
