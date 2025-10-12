import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class HealthAwsSESIndicator {
    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const connection = await this.awsSESService.checkConnection();

            if (!connection) {
                return indicator.down(
                    `HealthAwsSESIndicator Failed - Connection to AWS SES failed`
                );
            }

            return indicator.up();
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';

            return indicator.down(`HealthAwsSESIndicator Failed - ${message}`);
        }
    }
}
