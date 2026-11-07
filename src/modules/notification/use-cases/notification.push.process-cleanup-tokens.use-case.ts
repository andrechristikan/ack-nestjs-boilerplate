import { DeviceService } from '@modules/device/services/device.service';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationPushCleanupTokenEncryptedPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationPushProcessCleanupTokensUseCase implements IAppUseCase<
    [
        Job<
            INotificationPushCleanupTokenEncryptedPayload,
            IQueueResponse,
            EnumNotificationPushProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    async execute({
        data: { userId, encryptedFailureTokens },
    }: Job<
        INotificationPushCleanupTokenEncryptedPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        const failureTokens = this.notificationUtil.decryptFailureTokens(
            userId,
            encryptedFailureTokens
        );
        const countRemovedTokens =
            await this.deviceService.cleanupNotificationTokens(
                userId,
                failureTokens
            );

        return this.notificationUtil.toCleanupTokensResult(
            failureTokens.length,
            countRemovedTokens
        );
    }
}
