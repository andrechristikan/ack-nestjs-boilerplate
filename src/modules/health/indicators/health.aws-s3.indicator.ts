import { Injectable } from '@nestjs/common';
import {
    HealthCheckError,
    HealthIndicator,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';

@Injectable()
export class HealthAwsS3Indicator extends HealthIndicator {
    constructor(private readonly awsS3Service: AwsS3Service) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.awsS3Service.checkBucketExistence();
            return this.getStatus(key, true);
        } catch (err: any) {
            throw new HealthCheckError(
                `HealthAwsS3Indicator Failed - ${err?.message}`,
                this.getStatus(key, false)
            );
        }
    }
}
