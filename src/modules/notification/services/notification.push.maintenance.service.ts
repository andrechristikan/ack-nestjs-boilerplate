import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { INotificationPushMaintenanceService } from '@modules/notification/interfaces/notification.push.maintenance.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Removes the notification tokens Firebase rejected and the ones that went stale. */
@Injectable()
export class NotificationPushMaintenanceService implements INotificationPushMaintenanceService {
    private readonly staleTokenThresholdInMs: number;

    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
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
        const result = await this.deviceOwnershipRepository.cleanupTokens(
            userId,
            failureTokens
        );

        return {
            message: `Processed token cleanup for invalid tokens`,
            countRequestedTokens: failureTokens.length,
            countRemovedTokens: result.count,
        };
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        const staleTokens =
            await this.deviceOwnershipRepository.cleanupStaleTokens(
                this.staleTokenThresholdInMs
            );

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens: staleTokens.count,
        };
    }
}
