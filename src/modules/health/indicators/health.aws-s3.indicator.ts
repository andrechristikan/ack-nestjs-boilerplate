import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class HealthAwsS3BucketIndicator {
    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(
        key: string,
        access?: EnumAwsS3Accessibility
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.awsS3Service.checkBucket({
                access,
            });

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(
                `HealthAwsS3BucketIndicator Failed - ${message}`
            );
        }
    }
}
