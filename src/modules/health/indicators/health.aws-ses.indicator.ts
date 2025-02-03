import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import { AwsSESService } from 'src/modules/aws/services/aws.ses.service';

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
        } catch (err: any) {
            return indicator.down(
                `HealthAwsSESIndicator Failed - ${err?.message}`
            );
        }
    }
}
