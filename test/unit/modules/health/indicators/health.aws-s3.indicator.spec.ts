import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { HealthAwsS3BucketIndicator } from '@modules/health/indicators/health.aws-s3.indicator';

describe('HealthAwsS3BucketIndicator', () => {
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthAwsS3BucketIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthAwsS3BucketIndicator,
                { provide: AwsS3Service, useValue: awsS3Service },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthAwsS3BucketIndicator);
    });

    describe('isHealthy', () => {
        it('reports down as not configured when S3 is not initialized', async () => {
            awsS3Service.isInitialized.mockReturnValue(false);
            session.down.mockReturnValue({
                s3PublicBucket: { status: 'down' },
            });

            const result = await indicator.isHealthy(
                's3PublicBucket',
                EnumAwsS3Accessibility.public
            );

            expect(result).toEqual({ s3PublicBucket: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'AWS S3 is not configured'
            );
            expect(awsS3Service.checkBucket).not.toHaveBeenCalled();
            expect(session.up).not.toHaveBeenCalled();
        });

        it('reports up when the bucket check resolves', async () => {
            awsS3Service.isInitialized.mockReturnValue(true);
            awsS3Service.checkBucket.mockResolvedValue(true);
            session.up.mockReturnValue({ s3PublicBucket: { status: 'up' } });

            const result = await indicator.isHealthy(
                's3PublicBucket',
                EnumAwsS3Accessibility.public
            );

            expect(result).toEqual({ s3PublicBucket: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith(
                's3PublicBucket'
            );
            expect(awsS3Service.checkBucket).toHaveBeenCalledWith({
                access: EnumAwsS3Accessibility.public,
            });
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down with the error message when the bucket check throws an Error', async () => {
            awsS3Service.isInitialized.mockReturnValue(true);
            awsS3Service.checkBucket.mockRejectedValue(
                new Error('bucket unreachable')
            );
            session.down.mockReturnValue({
                s3PrivateBucket: { status: 'down' },
            });

            const result = await indicator.isHealthy(
                's3PrivateBucket',
                EnumAwsS3Accessibility.private
            );

            expect(result).toEqual({ s3PrivateBucket: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAwsS3BucketIndicator Failed - bucket unreachable'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            awsS3Service.isInitialized.mockReturnValue(true);
            awsS3Service.checkBucket.mockRejectedValue('not-an-error');
            session.down.mockReturnValue({
                s3PrivateBucket: { status: 'down' },
            });

            const result = await indicator.isHealthy(
                's3PrivateBucket',
                EnumAwsS3Accessibility.private
            );

            expect(result).toEqual({ s3PrivateBucket: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAwsS3BucketIndicator Failed - Unknown error'
            );
        });
    });
});
