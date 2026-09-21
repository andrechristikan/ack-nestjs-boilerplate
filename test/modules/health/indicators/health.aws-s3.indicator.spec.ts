import { mock } from 'vitest-mock-extended';

import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthAwsS3BucketIndicator', () => {
    const s3 = mock<AwsS3Service>();

    beforeEach(() => vi.resetAllMocks());

    it('reports a bucket healthy with the exact key and accessibility', async () => {
        const { health, up } = createHealthIndicatorHarness();
        const indicator = new HealthAwsS3BucketIndicator(s3, health);
        await expect(
            indicator.isHealthy('s3', EnumAwsS3Accessibility.private)
        ).resolves.toBe(up);
        expect(health.check).toHaveBeenCalledWith('s3');
        expect(s3.checkBucket).toHaveBeenCalledWith({
            access: EnumAwsS3Accessibility.private,
        });
    });

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps bucket errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthAwsS3BucketIndicator(s3, health);
        s3.checkBucket.mockRejectedValueOnce(error);
        await expect(
            indicator.isHealthy('s3', EnumAwsS3Accessibility.public)
        ).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthAwsS3BucketIndicator Failed - ${message}`
        );
    });
});
