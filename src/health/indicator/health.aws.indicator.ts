import { Injectable } from '@nestjs/common';
import {
    HealthCheckError,
    HealthIndicator,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { AwsS3Service } from 'src/aws/service/aws.s3.service';

@Injectable()
export class AwsHealthIndicator extends HealthIndicator {
    constructor(private readonly awsService: AwsS3Service) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.awsService.s3ListBucket();
            return this.getStatus(key, true);
        } catch (error) {
            throw new HealthCheckError(
                'ElasticsearchHealthIndicator failed',
                this.getStatus(key, false)
            );
        }
    }
}
