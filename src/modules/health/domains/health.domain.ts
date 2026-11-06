import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
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
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import type {
    HealthCheckResult,
    HealthIndicatorFunction,
} from '@nestjs/terminus';

@Injectable()
export class HealthDomain {
    constructor(
        private readonly health: HealthCheckService,
        private readonly healthUtil: HealthUtil,
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

    private async check(
        indicators: HealthIndicatorFunction[]
    ): Promise<HealthCheckResult> {
        try {
            const result = await this.health.check(indicators);

            return result;
        } catch (error: unknown) {
            if (error instanceof ServiceUnavailableException) {
                const response = error.getResponse();
                const isHealthCheckResult =
                    this.healthUtil.isHealthCheckResult(response);
                if (isHealthCheckResult) {
                    return response;
                }
            }

            throw new AppUnknownException(error);
        }
    }

    async checkAws(): Promise<HealthCheckResult> {
        return this.check([
            () =>
                this.awsS3BucketIndicator.isHealthy(
                    EnumHealthIndicatorKey.s3PublicBucket,
                    EnumAwsS3Accessibility.public
                ),
            () =>
                this.awsS3BucketIndicator.isHealthy(
                    EnumHealthIndicatorKey.s3PrivateBucket,
                    EnumAwsS3Accessibility.private
                ),
            () => this.awsSESIndicator.isHealthy(EnumHealthIndicatorKey.ses),
        ]);
    }

    async checkDatabase(): Promise<HealthCheckResult> {
        return this.check([
            () =>
                this.databaseIndicator.isHealthy(
                    EnumHealthIndicatorKey.database
                ),
            () => this.redisIndicator.isHealthy(EnumHealthIndicatorKey.redis),
            () => this.queueIndicator.isHealthy(EnumHealthIndicatorKey.queue),
        ]);
    }

    async checkThirdParty(): Promise<HealthCheckResult> {
        return this.check([
            () => this.sentryIndicator.isHealthy(EnumHealthIndicatorKey.sentry),
            () =>
                this.firebaseIndicator.isHealthy(
                    EnumHealthIndicatorKey.firebase
                ),
            () => this.googleIndicator.isHealthy(EnumHealthIndicatorKey.google),
            () => this.appleIndicator.isHealthy(EnumHealthIndicatorKey.apple),
            () =>
                this.jwksIndicator.isHealthyAccessToken(
                    EnumHealthIndicatorKey.jwksAccessToken
                ),
            () =>
                this.jwksIndicator.isHealthyRefreshToken(
                    EnumHealthIndicatorKey.jwksRefreshToken
                ),
        ]);
    }

    async checkInstance(): Promise<HealthCheckResult> {
        return this.check([
            () =>
                this.healthInstanceIndicator.isHealthyMemoryRss(
                    EnumHealthIndicatorKey.memoryRss
                ),
            () =>
                this.healthInstanceIndicator.isHealthyMemoryHeap(
                    EnumHealthIndicatorKey.memoryHeap
                ),
            () =>
                this.healthInstanceIndicator.isHealthyStorage(
                    EnumHealthIndicatorKey.storage
                ),
        ]);
    }
}
