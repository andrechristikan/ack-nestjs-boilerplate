import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { INotificationPushMaintenanceService } from '@modules/notification/interfaces/notification.push.maintenance.service.interface';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Removes the notification tokens Firebase rejected and the ones that went stale. */
@Injectable()
export class NotificationPushMaintenanceService implements INotificationPushMaintenanceService {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository
    ) {}

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
            await this.deviceOwnershipRepository.cleanupStaleTokens();

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens: staleTokens.count,
        };
    }
}
