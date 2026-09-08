import { DeviceService } from '@modules/device/services/device.service';
import { INotificationPushMaintenanceService } from '@modules/notification/interfaces/notification.push.maintenance.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Removes the notification tokens Firebase rejected and the ones that went stale. */
@Injectable()
export class NotificationPushMaintenanceService implements INotificationPushMaintenanceService {
    private readonly staleTokenThresholdInMs: number;

    constructor(
        private readonly deviceService: DeviceService,
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
            await this.deviceService.cleanupNotificationTokens(
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
            await this.deviceService.cleanupStaleNotificationTokens(
                this.staleTokenThresholdInMs
            );

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens,
        };
    }
}
