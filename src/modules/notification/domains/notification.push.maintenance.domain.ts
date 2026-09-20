import { DeviceDomain } from '@modules/device/domains/device.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Removes the notification tokens Firebase rejected and the ones that went stale. */
@Injectable()
export class NotificationPushMaintenanceDomain {
    private readonly staleTokenThresholdInMs: number;

    constructor(
        private readonly deviceDomain: DeviceDomain,
        private readonly configService: ConfigService
    ) {
        this.staleTokenThresholdInMs = this.configService.get<number>(
            'notification.push.staleTokenThresholdInMs'
        )!;
    }

    async processCleanupTokens(
        userId: string,
        failureTokens: string[]
    ): Promise<IQueueResponse> {
        const countRemovedTokens =
            await this.deviceDomain.cleanupNotificationTokens(
                userId,
                failureTokens
            );

        return {
            message: `Processed token cleanup for invalid tokens`,
            countRequestedTokens: failureTokens.length,
            countRemovedTokens,
        };
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        const countRemovedTokens =
            await this.deviceDomain.cleanupStaleNotificationTokens(
                this.staleTokenThresholdInMs
            );

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens,
        };
    }
}
