import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Reports AWS SES reachability as a Terminus health indicator.
 */
@Injectable()
export class HealthAwsSESIndicator {
    private readonly logger = new Logger(HealthAwsSESIndicator.name);

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly healthIndicatorService: HealthIndicatorService
    ) {}

    /**
     * Down when SES is not configured, or when the SES connection check fails or throws.
     */
    async isHealthy(
        key: EnumHealthIndicatorKey
    ): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        const isInitialized = this.awsSESService.isInitialized();
        if (!isInitialized) {
            return indicator.down('AWS SES is not configured');
        }

        try {
            const connection = await this.awsSESService.checkConnection();

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
