import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticFraudUtil {
    private readonly nearLockoutOffset: number;

    constructor(private readonly configService: ConfigService) {
        this.nearLockoutOffset = this.configService.get<number>(
            'analytic.fraud.nearLockoutOffset'
        )!;
    }

    nearLockoutThreshold(maxAttempt: number): number {
        return Math.max(1, maxAttempt - this.nearLockoutOffset);
    }
}
