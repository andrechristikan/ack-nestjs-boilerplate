import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';

@Injectable()
export class HealthAwsS3PublicBucketIndicator {
    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await this.awsS3Service.checkBucket();

            return indicator.up();
        } catch (err: any) {
            return indicator.down(
                `HealthAwsS3PublicBucketIndicator Failed - ${err?.message}`
            );
        }
    }
}

@Injectable()
export class HealthAwsS3PrivateBucketIndicator {
    constructor(
        private readonly awsS3Service: AwsS3Service,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const connection = await this.awsS3Service.checkBucket({
                access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
            });

            if (!connection) {
                return indicator.down(
                    `HealthAwsS3PrivateBucketIndicator Failed - Connection to AWS S3 private bucket failed`
                );
            }

            return indicator.up();
        } catch (err: any) {
            return indicator.down(
                `HealthAwsS3PrivateBucketIndicator Failed - ${err?.message}`
            );
        }
    }
}
