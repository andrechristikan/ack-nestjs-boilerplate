import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import type {
    HealthCheckResult,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { HealthAppleIndicator } from '@modules/health/indicators/health.apple.indicator';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { HealthDatabaseIndicator } from '@modules/health/indicators/health.database.indicator';
import { HealthService } from '@modules/health/services/health.service';
import { HealthFirebaseIndicator } from '@modules/health/indicators/health.firebase.indicator';
import { HealthGoogleIndicator } from '@modules/health/indicators/health.google.indicator';
import { HealthInstanceIndicator } from '@modules/health/indicators/health.instance.indicator';
import { HealthJwksIndicator } from '@modules/health/indicators/health.jwks.indicator';
import { HealthQueueIndicator } from '@modules/health/indicators/health.queue.indicator';
import { HealthRedisIndicator } from '@modules/health/indicators/health.redis.indicator';
import { HealthSentryIndicator } from '@modules/health/indicators/health.sentry.indicator';
import { HealthUtil } from '@modules/health/utils/health.util';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

describe('HealthService', () => {
    const health: MockProxy<HealthCheckService> = mock<HealthCheckService>();
    const healthInstanceIndicator: MockProxy<HealthInstanceIndicator> =
        mock<HealthInstanceIndicator>();
    const awsS3BucketIndicator: MockProxy<HealthAwsS3BucketIndicator> =
        mock<HealthAwsS3BucketIndicator>();
    const awsSESIndicator: MockProxy<HealthAwsSESIndicator> =
        mock<HealthAwsSESIndicator>();
    const databaseIndicator: MockProxy<HealthDatabaseIndicator> =
        mock<HealthDatabaseIndicator>();
    const redisIndicator: MockProxy<HealthRedisIndicator> =
        mock<HealthRedisIndicator>();
    const sentryIndicator: MockProxy<HealthSentryIndicator> =
        mock<HealthSentryIndicator>();
    const firebaseIndicator: MockProxy<HealthFirebaseIndicator> =
        mock<HealthFirebaseIndicator>();
    const googleIndicator: MockProxy<HealthGoogleIndicator> =
        mock<HealthGoogleIndicator>();
    const appleIndicator: MockProxy<HealthAppleIndicator> =
        mock<HealthAppleIndicator>();
    const jwksIndicator: MockProxy<HealthJwksIndicator> =
        mock<HealthJwksIndicator>();
    const queueIndicator: MockProxy<HealthQueueIndicator> =
        mock<HealthQueueIndicator>();

    const healthUtil: MockProxy<HealthUtil> = mock<HealthUtil>();

    const healthCheckResult: HealthCheckResult = {
        status: 'ok',
        details: {},
    };

    let service: HealthService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthService,
                { provide: HealthCheckService, useValue: health },
                { provide: HealthUtil, useValue: healthUtil },
                {
                    provide: HealthInstanceIndicator,
                    useValue: healthInstanceIndicator,
                },
                {
                    provide: HealthAwsS3BucketIndicator,
                    useValue: awsS3BucketIndicator,
                },
                { provide: HealthAwsSESIndicator, useValue: awsSESIndicator },
                {
                    provide: HealthDatabaseIndicator,
                    useValue: databaseIndicator,
                },
                { provide: HealthRedisIndicator, useValue: redisIndicator },
                { provide: HealthSentryIndicator, useValue: sentryIndicator },
                {
                    provide: HealthFirebaseIndicator,
                    useValue: firebaseIndicator,
                },
                { provide: HealthGoogleIndicator, useValue: googleIndicator },
                { provide: HealthAppleIndicator, useValue: appleIndicator },
                { provide: HealthJwksIndicator, useValue: jwksIndicator },
                { provide: HealthQueueIndicator, useValue: queueIndicator },
            ],
        }).compile();

        service = module.get(HealthService);
    });

    describe('checkAws', () => {
        it('checks the S3 public bucket, S3 private bucket, and SES indicators', async () => {
            let checks: Array<() => Promise<HealthIndicatorResult>> = [];
            health.check.mockImplementation(async passedChecks => {
                checks = passedChecks as Array<
                    () => Promise<HealthIndicatorResult>
                >;

                return healthCheckResult;
            });
            awsS3BucketIndicator.isHealthy.mockResolvedValue({
                s3PublicBucket: { status: 'up' },
            });
            awsSESIndicator.isHealthy.mockResolvedValue({
                ses: { status: 'up' },
            });

            const result = await service.checkAws();

            expect(result).toBe(healthCheckResult);
            expect(checks).toHaveLength(3);

            await checks[0]!();
            expect(awsS3BucketIndicator.isHealthy).toHaveBeenNthCalledWith(
                1,
                's3PublicBucket',
                EnumAwsS3Accessibility.public
            );

            await checks[1]!();
            expect(awsS3BucketIndicator.isHealthy).toHaveBeenNthCalledWith(
                2,
                's3PrivateBucket',
                EnumAwsS3Accessibility.private
            );

            await checks[2]!();
            expect(awsSESIndicator.isHealthy).toHaveBeenCalledWith('ses');
        });
    });

    describe('checkDatabase', () => {
        it('checks the database, redis, and queue indicators', async () => {
            let checks: Array<() => Promise<HealthIndicatorResult>> = [];
            health.check.mockImplementation(async passedChecks => {
                checks = passedChecks as Array<
                    () => Promise<HealthIndicatorResult>
                >;

                return healthCheckResult;
            });
            databaseIndicator.isHealthy.mockResolvedValue({
                database: { status: 'up' },
            });
            redisIndicator.isHealthy.mockResolvedValue({
                redis: { status: 'up' },
            });
            queueIndicator.isHealthy.mockResolvedValue({
                queue: { status: 'up' },
            });

            const result = await service.checkDatabase();

            expect(result).toBe(healthCheckResult);
            expect(checks).toHaveLength(3);

            await checks[0]!();
            expect(databaseIndicator.isHealthy).toHaveBeenCalledWith(
                'database'
            );

            await checks[1]!();
            expect(redisIndicator.isHealthy).toHaveBeenCalledWith('redis');

            await checks[2]!();
            expect(queueIndicator.isHealthy).toHaveBeenCalledWith('queue');
        });
    });

    describe('checkThirdParty', () => {
        it('checks the sentry, firebase, google, apple, and jwks indicators', async () => {
            let checks: Array<() => Promise<HealthIndicatorResult>> = [];
            health.check.mockImplementation(async passedChecks => {
                checks = passedChecks as Array<
                    () => Promise<HealthIndicatorResult>
                >;

                return healthCheckResult;
            });
            sentryIndicator.isHealthy.mockResolvedValue({
                sentry: { status: 'up' },
            });
            firebaseIndicator.isHealthy.mockResolvedValue({
                firebase: { status: 'up' },
            });
            googleIndicator.isHealthy.mockResolvedValue({
                google: { status: 'up' },
            });
            appleIndicator.isHealthy.mockResolvedValue({
                apple: { status: 'up' },
            });
            jwksIndicator.isHealthyAccessToken.mockResolvedValue({
                jwksAccessToken: { status: 'up' },
            });
            jwksIndicator.isHealthyRefreshToken.mockResolvedValue({
                jwksRefreshToken: { status: 'up' },
            });

            const result = await service.checkThirdParty();

            expect(result).toBe(healthCheckResult);
            expect(checks).toHaveLength(6);

            await checks[0]!();
            expect(sentryIndicator.isHealthy).toHaveBeenCalledWith('sentry');

            await checks[1]!();
            expect(firebaseIndicator.isHealthy).toHaveBeenCalledWith(
                'firebase'
            );

            await checks[2]!();
            expect(googleIndicator.isHealthy).toHaveBeenCalledWith('google');

            await checks[3]!();
            expect(appleIndicator.isHealthy).toHaveBeenCalledWith('apple');

            await checks[4]!();
            expect(jwksIndicator.isHealthyAccessToken).toHaveBeenCalledWith(
                'jwksAccessToken'
            );

            await checks[5]!();
            expect(jwksIndicator.isHealthyRefreshToken).toHaveBeenCalledWith(
                'jwksRefreshToken'
            );
        });
    });

    describe('checkInstance', () => {
        it('checks the memory rss, memory heap, and storage indicators', async () => {
            let checks: Array<() => Promise<HealthIndicatorResult>> = [];
            health.check.mockImplementation(async passedChecks => {
                checks = passedChecks as Array<
                    () => Promise<HealthIndicatorResult>
                >;

                return healthCheckResult;
            });
            healthInstanceIndicator.isHealthyMemoryRss.mockResolvedValue({
                memoryRss: { status: 'up' },
            });
            healthInstanceIndicator.isHealthyMemoryHeap.mockResolvedValue({
                memoryHeap: { status: 'up' },
            });
            healthInstanceIndicator.isHealthyStorage.mockResolvedValue({
                storage: { status: 'up' },
            });

            const result = await service.checkInstance();

            expect(result).toBe(healthCheckResult);
            expect(checks).toHaveLength(3);

            await checks[0]!();
            expect(
                healthInstanceIndicator.isHealthyMemoryRss
            ).toHaveBeenCalledWith('memoryRss');

            await checks[1]!();
            expect(
                healthInstanceIndicator.isHealthyMemoryHeap
            ).toHaveBeenCalledWith('memoryHeap');

            await checks[2]!();
            expect(
                healthInstanceIndicator.isHealthyStorage
            ).toHaveBeenCalledWith('storage');
        });
    });

    describe('check', () => {
        it('returns the Terminus result when every indicator passes', async () => {
            health.check.mockResolvedValue(healthCheckResult);

            const result = await service['check']([]);

            expect(result).toBe(healthCheckResult);
        });

        it('returns the health result Terminus reports through ServiceUnavailableException', async () => {
            const failed: HealthCheckResult = {
                ...healthCheckResult,
                status: 'error',
            };
            health.check.mockRejectedValue(
                new ServiceUnavailableException(failed)
            );
            healthUtil.isHealthCheckResult.mockReturnValue(true);

            const result = await service['check']([]);

            expect(result).toEqual(failed);
            expect(healthUtil.isHealthCheckResult).toHaveBeenCalledWith(failed);
        });

        it('wraps a ServiceUnavailableException that carries no health result in AppUnknownException', async () => {
            const error = new ServiceUnavailableException('unavailable');
            health.check.mockRejectedValue(error);
            healthUtil.isHealthCheckResult.mockReturnValue(false);

            await expect(service['check']([])).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });

        it('wraps any other error in AppUnknownException', async () => {
            const error = new Error('indicator crashed');
            health.check.mockRejectedValue(error);

            await expect(service['check']([])).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
            expect(healthUtil.isHealthCheckResult).not.toHaveBeenCalled();
        });
    });
});
