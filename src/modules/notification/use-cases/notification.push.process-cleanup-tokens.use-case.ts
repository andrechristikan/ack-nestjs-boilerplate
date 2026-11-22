import { DeviceService } from '@modules/device/services/device.service';
import type { INotificationPushCleanupTokenEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationPushProcessCleanupTokensUseCase implements IAppUseCase<
    [INotificationPushCleanupTokenEncryptedPayload],
    IQueueResponse
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly notificationService: NotificationService
    ) {}

    async execute({
        userId,
        encryptedFailureTokens,
    }: INotificationPushCleanupTokenEncryptedPayload): Promise<IQueueResponse> {
        const failureTokens = this.notificationService.decryptFailureTokens(
            userId,
            encryptedFailureTokens
        );
        const countRemovedTokens =
            await this.deviceService.cleanupNotificationTokens(
                userId,
                failureTokens
            );

        return this.notificationService.toCleanupTokensResult(
            failureTokens.length,
            countRemovedTokens
        );
    }
}
