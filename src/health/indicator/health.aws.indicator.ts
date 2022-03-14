import { Injectable } from '@nestjs/common';
import {
    HealthCheckError,
    HealthIndicator,
    HealthIndicatorResult,
} from '@nestjs/terminus';
import { AwsService } from 'src/aws/aws.service';

@Injectable()
export class AwsHealthIndicator extends HealthIndicator {
    constructor(private readonly awsService: AwsService) {
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
