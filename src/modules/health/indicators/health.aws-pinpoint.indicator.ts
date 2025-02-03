import { Injectable } from '@nestjs/common';
import {
    HealthIndicatorResult,
    HealthIndicatorService,
} from '@nestjs/terminus';
import { AwsPinpointService } from 'src/modules/aws/services/aws.pinpoint.service';

@Injectable()
export class HealthAwsPinpointIndicator {
    constructor(
        private readonly awsPinpointService: AwsPinpointService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            const connection = await this.awsPinpointService.checkConnection();

            if (!connection) {
                return indicator.down(
                    `HealthAwsPinpointIndicator Failed - Connection to AWS Pinpoint failed`
                );
            }

            return indicator.up();
        } catch (err: any) {
            return indicator.down(
                `HealthAwsPinpointIndicator Failed - ${err?.message}`
            );
        }
    }
}
