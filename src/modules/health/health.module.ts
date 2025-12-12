import { AwsModule } from '@common/aws/aws.module';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

@Module({
    providers: [
        HealthAwsS3BucketIndicator,
        HealthAwsSESIndicator,
        HealthDatabaseIndicator,
        HealthRedisIndicator,
        HealthSentryIndicator,
    ],
    exports: [
        HealthAwsS3BucketIndicator,
        HealthAwsSESIndicator,
        HealthDatabaseIndicator,
        HealthRedisIndicator,
        HealthSentryIndicator,
        TerminusModule,
    ],
    imports: [
        AwsModule,
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 30000,
        }),
    ],
})
export class HealthModule {}
