import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { HealthDomain } from '@modules/health/domains/health.domain';
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
import { HealthCheckService } from '@nestjs/terminus';

vi.mock('@common/firebase/services/firebase.service', () => ({
    FirebaseService: class {},
}));

vi.mock('@modules/health/indicators/health.sentry.indicator', () => ({
    HealthSentryIndicator: class {},
}));

describe('HealthDomain', () => {
    const health: MockProxy<HealthCheckService> = mock<HealthCheckService>();
    const instance = mock<HealthInstanceIndicator>();
    const s3 = mock<HealthAwsS3BucketIndicator>();
    const ses = mock<HealthAwsSESIndicator>();
    const database = mock<HealthDatabaseIndicator>();
    const redis = mock<HealthRedisIndicator>();
    const sentry = mock<HealthSentryIndicator>();
    const firebase = mock<HealthFirebaseIndicator>();
    const google = mock<HealthGoogleIndicator>();
    const apple = mock<HealthAppleIndicator>();
    const jwks = mock<HealthJwksIndicator>();
    const queue = mock<HealthQueueIndicator>();
    const result = { status: 'ok', info: {}, error: {}, details: {} } as never;
    const domain = new HealthDomain(
        health,
        instance,
        s3,
        ses,
        database,
        redis,
        sentry,
        firebase,
        google,
        apple,
        jwks,
        queue
    );

    beforeEach(() => {
        health.check.mockImplementation(async checks => {
            for (const check of checks) {
                if (typeof check === 'function') {
                    await check();
                }
            }
            return result;
        });
    });

    it('checks both S3 buckets and SES with exact keys', async () => {
        await expect(domain.checkAws()).resolves.toBe(result);
        expect(s3.isHealthy).toHaveBeenNthCalledWith(
            1,
            's3PublicBucket',
            EnumAwsS3Accessibility.public
        );
        expect(s3.isHealthy).toHaveBeenNthCalledWith(
            2,
            's3PrivateBucket',
            EnumAwsS3Accessibility.private
        );
        expect(ses.isHealthy).toHaveBeenCalledWith('ses');
    });

    it('checks database dependencies with exact keys', async () => {
        await expect(domain.checkDatabase()).resolves.toBe(result);
        expect(database.isHealthy).toHaveBeenCalledWith('database');
        expect(redis.isHealthy).toHaveBeenCalledWith('redis');
        expect(queue.isHealthy).toHaveBeenCalledWith('queue');
    });

    it('checks third-party dependencies with exact keys', async () => {
        await expect(domain.checkThirdParty()).resolves.toBe(result);
        expect(sentry.isHealthy).toHaveBeenCalledWith('sentry');
        expect(firebase.isHealthy).toHaveBeenCalledWith('firebase');
        expect(google.isHealthy).toHaveBeenCalledWith('google');
        expect(apple.isHealthy).toHaveBeenCalledWith('apple');
        expect(jwks.isHealthyAccessToken).toHaveBeenCalledWith(
            'jwksAccessToken'
        );
        expect(jwks.isHealthyRefreshToken).toHaveBeenCalledWith(
            'jwksRefreshToken'
        );
    });

    it('checks instance resources with exact keys', async () => {
        await expect(domain.checkInstance()).resolves.toBe(result);
        expect(instance.isHealthyMemoryRss).toHaveBeenCalledWith('memoryRss');
        expect(instance.isHealthyMemoryHeap).toHaveBeenCalledWith('memoryHeap');
        expect(instance.isHealthyStorage).toHaveBeenCalledWith('storage');
    });
});
