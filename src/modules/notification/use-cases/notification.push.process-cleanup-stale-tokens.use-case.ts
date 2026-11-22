import { DeviceService } from '@modules/device/services/device.service';
import { MessageService } from '@common/message/services/message.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationPushProcessCleanupStaleTokensUseCase implements IAppUseCase<
    [],
    IQueueResponse
> {
    private readonly staleTokenThresholdInMs: number;

    constructor(
        private readonly deviceService: DeviceService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.staleTokenThresholdInMs = this.configService.get<number>(
            'notification.push.staleTokenThresholdInMs'
        )!;
    }

    async execute(): Promise<IQueueResponse> {
        const countRemovedTokens =
            await this.deviceService.cleanupStaleNotificationTokens(
                this.staleTokenThresholdInMs
            );

        const message = this.messageService.setMessage(
            'notification.queue.push.cleanupStaleTokens',
            { properties: { count: countRemovedTokens } }
        );

        return { message };
    }
}
