import { Injectable } from '@nestjs/common';
import {
    HealthCheckError,
    HealthIndicator,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';

@Injectable()
export class AwsHealthIndicator extends HealthIndicator {
    constructor(private readonly awsS3Service: AwsS3Service) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.awsS3Service.listBucket();
            return this.getStatus(key, true);
        } catch (error) {
            throw new HealthCheckError(
                'AwsHealthIndicator failed',
                this.getStatus(key, false)
            );
        }
    }
}
