import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumNotificationChannel,
    EnumNotificationType,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Notification,
    NotificationUserSetting,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import type { INotificationUserSettingUpdate } from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly userDomain: UserDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService
    ) {}

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePagingReturn<Notification>> {
        return this.notificationRepository.findWithPaginationCursor(
            userId,
            pagination
        );
    }

    async getListUserSetting(
        userId: string
    ): Promise<NotificationUserSetting[]> {
        return this.notificationUserSettingRepository.findUserSetting(userId);
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        const notification = await this.notificationRepository.findIsReadById(
            userId,
            notificationId
        );
        if (!notification) {
            throw new NotificationNotFoundException();
        } else if (notification.isRead) {
            throw new NotificationAlreadyReadException();
        }

        await this.notificationRepository.markAsRead(userId, notificationId);
    }

    async markAllAsRead(userId: string): Promise<number> {
        const batchUpdated =
            await this.notificationRepository.markAllAsRead(userId);

        return batchUpdated.count;
    }

    async updateUserSetting(
        userId: string,
        data: INotificationUserSettingUpdate
    ): Promise<void> {
        this.validateUserSetting(data.type, data.channel);

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userUpdateNotificationSetting,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            }),
        ];
        await this.databaseService.withTransaction(async tx => {
            await this.notificationUserSettingRepository.updateUserSettingInTx(
                tx,
                userId,
                data
            );
            await this.userDomain.touchUpdatedByInTx(tx, userId);
        });

        this.activityLogDomain.stagePrepared(events);
    }

    async createDefaultsInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.notificationUserSettingRepository.createDefaultsInTx(
            tx,
            userId
        );
    }

    /** Rejects any type/channel pair not in the allowed combinations list. */
    validateUserSetting(
        type: EnumNotificationType,
        channel: EnumNotificationChannel
    ): void {
        const validType = NotificationSettingContract.find(
            e => e.type === type
        );

        if (!validType) {
            throw new NotificationInvalidTypeException();
        }

        if (!validType.channels.includes(channel)) {
            throw new NotificationInvalidChannelException();
        }
    }
}
