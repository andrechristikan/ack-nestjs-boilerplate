import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { IHealthService } from '@modules/health/interfaces/health.service.interface';
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
import { Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

@Injectable()
export class HealthService implements IHealthService {
    constructor(
        private readonly health: HealthCheckService,
        private readonly healthInstanceIndicator: HealthInstanceIndicator,
        private readonly awsS3BucketIndicator: HealthAwsS3BucketIndicator,
        private readonly awsSESIndicator: HealthAwsSESIndicator,
        private readonly databaseIndicator: HealthDatabaseIndicator,
        private readonly redisIndicator: HealthRedisIndicator,
        private readonly sentryIndicator: HealthSentryIndicator,
        private readonly firebaseIndicator: HealthFirebaseIndicator,
        private readonly googleIndicator: HealthGoogleIndicator,
        private readonly appleIndicator: HealthAppleIndicator,
        private readonly jwksIndicator: HealthJwksIndicator,
        private readonly queueIndicator: HealthQueueIndicator
    ) {}

    async checkAws(): Promise<HealthCheckResult> {
        return this.health.check([
            () =>
                this.awsS3BucketIndicator.isHealthy(
                    's3PublicBucket',
                    EnumAwsS3Accessibility.public
                ),
            () =>
                this.awsS3BucketIndicator.isHealthy(
                    's3PrivateBucket',
                    EnumAwsS3Accessibility.private
                ),
            () => this.awsSESIndicator.isHealthy('ses'),
        ]);
    }

    async checkDatabase(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.databaseIndicator.isHealthy('database'),
            () => this.redisIndicator.isHealthy('redis'),
            () => this.queueIndicator.isHealthy('queue'),
        ]);
    }

    async checkThirdParty(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.sentryIndicator.isHealthy('sentry'),
            () => this.firebaseIndicator.isHealthy('firebase'),
            () => this.googleIndicator.isHealthy('google'),
            () => this.appleIndicator.isHealthy('apple'),
            () => this.jwksIndicator.isHealthyAccessToken('jwksAccessToken'),
            () => this.jwksIndicator.isHealthyRefreshToken('jwksRefreshToken'),
        ]);
    }

    async checkInstance(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.healthInstanceIndicator.isHealthyMemoryRss('memoryRss'),
            () =>
                this.healthInstanceIndicator.isHealthyMemoryHeap('memoryHeap'),
            () => this.healthInstanceIndicator.isHealthyStorage('storage'),
        ]);
    }
}
