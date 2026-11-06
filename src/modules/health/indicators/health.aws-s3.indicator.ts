import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports AWS S3 bucket reachability as a Terminus health indicator.
 */
@Injectable()
export class HealthAwsS3BucketIndicator {
    private readonly logger = new Logger(HealthAwsS3BucketIndicator.name);

    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when S3 is not configured, or when the bucket check for the given accessibility
     * fails or throws.
     */
    async isHealthy(
        key: EnumHealthIndicatorKey,
        access: EnumAwsS3Accessibility
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        const isInitialized = this.awsS3Service.isInitialized();
        if (!isInitialized) {
            return indicator.down('AWS S3 is not configured');
        }

        try {
            await this.awsS3Service.checkBucket({
                access,
            });

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'AWS S3 bucket health check failed');

            return indicator.down('AWS S3 bucket check failed');
        }
    }
}
