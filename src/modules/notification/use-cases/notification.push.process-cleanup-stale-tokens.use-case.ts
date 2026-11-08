import { DeviceService } from '@modules/device/services/device.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationPushProcessCleanupStaleTokensUseCase implements IAppUseCase<
    [],
    IQueueResponse
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly notificationService: NotificationService,
        private readonly configService: ConfigService
    ) {}

    async execute(): Promise<IQueueResponse> {
        const thresholdInMs = this.configService.get<number>(
            'notification.push.staleTokenThresholdInMs'
        )!;
        const countRemovedTokens =
            await this.deviceService.cleanupStaleNotificationTokens(
                thresholdInMs
            );

        return this.notificationService.toCleanupStaleTokensResult(
            countRemovedTokens
        );
    }
}
