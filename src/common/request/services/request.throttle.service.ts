import { Injectable } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { RequestThrottleHeaderName } from '@common/request/constants/request.constant';
import type { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import type { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';

/**
 * Counts a hit for a named limiter, fails open on storage trouble, and either blocks with
 * `Retry-After` or sets the rate-limit headers.
 */
@Injectable()
export class RequestThrottleService {
    constructor(
        private readonly storageService: RequestThrottleStorageService
    ) {}

    async evaluate(
        response: Response,
        name: EnumRequestThrottleName,
        tracker: string,
        policy: IRequestThrottlePolicy
    ): Promise<void> {
        const record = await this.storageService.increment(
            tracker,
            policy.ttlInMs,
            policy.limit,
            policy.blockDurationInMs,
            name
        );

        if (record.isBlocked) {
            response.setHeader('Retry-After', record.timeToBlockExpire);

            throw new ThrottlerException();
        }

        response.setHeader(
            `${RequestThrottleHeaderName}-Limit-${name}`,
            policy.limit
        );
        response.setHeader(
            `${RequestThrottleHeaderName}-Remaining-${name}`,
            Math.max(0, policy.limit - record.totalHits)
        );
        response.setHeader(
            `${RequestThrottleHeaderName}-Reset-${name}`,
            record.timeToExpire
        );
    }
}
