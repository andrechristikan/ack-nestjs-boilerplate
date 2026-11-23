import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3-bucket.indicator';
import { HealthAwsSesIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';
import { HealthFirebaseIndicator } from '@modules/health/indicators/health.firebase.indicator';
import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';
import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';
import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import type {
    HealthCheckResult,
    HealthIndicatorFunction,
} from '@nestjs/terminus';

@Injectable()
export class HealthService {
    constructor(
        private readonly health: HealthCheckService,
        private readonly healthInstanceIndicator: HealthInstanceIndicator,
        private readonly healthAwsS3BucketIndicator: HealthAwsS3BucketIndicator,
        private readonly healthAwsSesIndicator: HealthAwsSesIndicator,
        private readonly healthDatabaseIndicator: HealthDatabaseIndicator,
        private readonly healthRedisIndicator: HealthRedisIndicator,
        private readonly healthSentryIndicator: HealthSentryIndicator,
        private readonly healthFirebaseIndicator: HealthFirebaseIndicator,
        private readonly healthGoogleIndicator: HealthGoogleIndicator,
        private readonly healthAppleIndicator: HealthAppleIndicator,
        private readonly healthJwksIndicator: HealthJwksIndicator,
        private readonly healthQueueIndicator: HealthQueueIndicator
    ) {}

    private isIndicatorMap(value: unknown): boolean {
        return typeof value === 'object' && value !== null;
    }

    private isHealthCheckResult(
        value: string | object
    ): value is HealthCheckResult {
        if (typeof value !== 'object') {
            return false;
        }

        if (!('status' in value) || typeof value.status !== 'string') {
            return false;
        }

        if (
            !('info' in value) ||
            !('error' in value) ||
            !('details' in value)
        ) {
            return false;
        }

        const isInfoMap = this.isIndicatorMap(value.info);
        const isErrorMap = this.isIndicatorMap(value.error);
        const isDetailsMap = this.isIndicatorMap(value.details);

        return isInfoMap && isErrorMap && isDetailsMap;
    }

    private async check(
        indicators: HealthIndicatorFunction[]
    ): Promise<HealthCheckResult> {
        try {
            const result = await this.health.check(indicators);

            return result;
        } catch (error: unknown) {
            if (error instanceof ServiceUnavailableException) {
                const response = error.getResponse();
                const isHealthCheckResult = this.isHealthCheckResult(response);
                if (isHealthCheckResult) {
                    return response;
                }
            }

            throw new AppUnknownException(error);
        }
    }

    isUp(result: HealthCheckResult): boolean {
        return result.status === 'ok';
    }

    async checkAws(): Promise<HealthCheckResult> {
        return this.check([
            () =>
                this.healthAwsS3BucketIndicator.isHealthy(
                    EnumHealthIndicatorKey.s3PublicBucket,
                    EnumAwsS3Accessibility.public
                ),
            () =>
                this.healthAwsS3BucketIndicator.isHealthy(
                    EnumHealthIndicatorKey.s3PrivateBucket,
                    EnumAwsS3Accessibility.private
                ),
            () =>
                this.healthAwsSesIndicator.isHealthy(
                    EnumHealthIndicatorKey.ses
                ),
        ]);
    }

    async checkDatabase(): Promise<HealthCheckResult> {
        return this.check([
            () =>
                this.healthDatabaseIndicator.isHealthy(
                    EnumHealthIndicatorKey.database
                ),
            () =>
                this.healthRedisIndicator.isHealthy(
                    EnumHealthIndicatorKey.redis
                ),
            () =>
                this.healthQueueIndicator.isHealthy(
                    EnumHealthIndicatorKey.queue
                ),
        ]);
    }

    async checkThirdParty(): Promise<HealthCheckResult> {
        return this.check([
            () =>
                this.healthSentryIndicator.isHealthy(
                    EnumHealthIndicatorKey.sentry
                ),
            () =>
                this.healthFirebaseIndicator.isHealthy(
                    EnumHealthIndicatorKey.firebase
                ),
            () =>
                this.healthGoogleIndicator.isHealthy(
                    EnumHealthIndicatorKey.google
                ),
            () =>
                this.healthAppleIndicator.isHealthy(
                    EnumHealthIndicatorKey.apple
                ),
            () =>
                this.healthJwksIndicator.isHealthyAccessToken(
                    EnumHealthIndicatorKey.jwksAccessToken
                ),
            () =>
                this.healthJwksIndicator.isHealthyRefreshToken(
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
