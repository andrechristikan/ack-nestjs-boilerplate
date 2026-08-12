import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
import { RequestThrottlerStorageService } from '@common/request/services/request.throttler.service';

/**
 * Counts a hit for a named limiter, fails open on storage trouble, and either blocks with
 * `Retry-After` or sets the rate-limit headers.
 */
@Injectable()
export class RequestThrottleUtil {
    private readonly headerPrefix: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly storageService: RequestThrottlerStorageService
    ) {
        this.headerPrefix = this.configService.get<string>(
            'request.throttle.headerPrefix'
        )!;
    }

    async evaluate(
        response: Response,
        name: string,
        tracker: string,
        policy: IRequestThrottlePolicy
    ): Promise<void> {
        const record = await this.storageService
            .increment(
                tracker,
                policy.ttlInMs,
                policy.limit,
                policy.blockDurationInMs,
                name
            )
            .catch(() => null);

        if (!record) {
            return;
        }

        if (record.isBlocked) {
            response.setHeader('Retry-After', record.timeToBlockExpire);

            throw new ThrottlerException();
        }

        response.setHeader(`${this.headerPrefix}-Limit-${name}`, policy.limit);
        response.setHeader(
            `${this.headerPrefix}-Remaining-${name}`,
            Math.max(0, policy.limit - record.totalHits)
        );
        response.setHeader(
            `${this.headerPrefix}-Reset-${name}`,
            record.timeToExpire
        );
    }
}
