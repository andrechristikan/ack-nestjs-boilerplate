import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { DeviceService } from '@modules/device/services/device.service';
import type {
    INotificationNotifyPayload,
    INotificationSnapshot,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationProcessUseCase implements IAppUseCase<
    [string, INotificationNotifyPayload],
    IQueueResponse
> {
    constructor(
        private readonly userService: UserService,
        private readonly userVerificationService: UserVerificationService,
        private readonly deviceService: DeviceService,
        private readonly notificationService: NotificationService,
        private readonly notificationUtil: NotificationUtil,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService
    ) {}

    async execute(
        outboxId: string,
        { kind, context, ...recorded }: INotificationNotifyPayload
    ): Promise<IQueueResponse> {
        const properties = { process: kind };
        let { recipient, notificationId } = recorded;
        const { snapshot } = context;
        if (recipient === null && snapshot !== undefined) {
            recipient = this.notificationService.toSnapshotRecipientRecord(
                kind,
                context.userId,
                snapshot as INotificationSnapshot
            );
        } else if (recipient === null) {
            // Sequential by design: write must not run if an earlier step throws
            const [user, settings, tokens] = await Promise.all([
                this.userService.getOneActive(context.userId),
                this.notificationService.getListUserSetting(context.userId),
                this.deviceService.getNotificationTokens(context.userId),
            ]);
            if (!user) {
                const message = this.messageService.setMessage(
                    'notification.queue.error.noRecipient',
                    { properties }
                );

                return { message };
            }

            const channels = this.notificationUtil.resolveChannels(
                kind,
                settings
            );
            if (channels.length === 0) {
                const message = this.messageService.setMessage(
                    'notification.queue.error.noChannel',
                    { properties }
                );

                return { message };
            }

            let mobileNumber: string | null = null;
            if (channels.includes(EnumNotificationChannel.sms)) {
                mobileNumber =
                    await this.userVerificationService.getOneActiveMobileRecipient(
                        String(context.verificationId)
                    );
            }

            recipient = this.notificationService.toRecipientRecord(
                user,
                tokens,
                mobileNumber,
                channels
            );
        }

        if (recorded.recipient === null || notificationId === null) {
            notificationId ??= this.databaseUtil.createId();
            await this.outboxService.updateData(outboxId, {
                recipient,
                notificationId,
            });
        }

        await this.outboxService.withTransaction(async tx =>
            this.notificationService.createInTx(
                tx,
                notificationId,
                kind,
                context,
                recipient
            )
        );

        const message = this.messageService.setMessage(
            'notification.queue.notify',
            { properties }
        );

        return { message };
    }
}
