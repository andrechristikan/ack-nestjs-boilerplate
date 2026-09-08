import { AwsModule } from '@common/aws/aws.module';
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
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

/**
 * Wires Terminus and the custom indicators for system health checks.
 */
@Module({
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
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 30000,
        }),
    ],
})
export class HealthModule {}
