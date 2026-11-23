import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthAwsSesIndicator {
    private readonly logger = new Logger(HealthAwsSesIndicator.name);

    constructor(
        private readonly awsSesService: AwsSesService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        const isInitialized = this.awsSesService.isInitialized();
        if (!isInitialized) {
            return indicator.down('AWS SES is not configured');
        }

        try {
            const connection = await this.awsSesService.checkConnection();

            if (!connection) {
                return indicator.down('AWS SES connection failed');
            }

            return indicator.up();
        } catch (err: unknown) {
            this.logger.error(err, 'AWS SES health check failed');

            return indicator.down('AWS SES connection failed');
        }
    }
}
