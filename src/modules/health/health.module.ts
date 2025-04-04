import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AwsModule } from 'src/modules/aws/aws.module';
import { HealthAwsPinpointIndicator } from 'src/modules/health/indicators/health.aws-pinpoint.indicator';
import {
    HealthAwsS3PublicBucketIndicator,
    HealthAwsS3PrivateBucketIndicator,
} from 'src/modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsSESIndicator } from 'src/modules/health/indicators/health.aws-ses.indicator';

@Module({
    providers: [
        HealthAwsS3PublicBucketIndicator,
        HealthAwsS3PrivateBucketIndicator,
        HealthAwsPinpointIndicator,
        HealthAwsSESIndicator,
    ],
    exports: [
        HealthAwsS3PublicBucketIndicator,
        HealthAwsS3PrivateBucketIndicator,
        HealthAwsPinpointIndicator,
        HealthAwsSESIndicator,
        TerminusModule,
    ],
    imports: [
        AwsModule,
        TerminusModule.forRoot({
            gracefulShutdownTimeoutMs: 1000,
        }),
    ],
})
export class HealthModule {}
