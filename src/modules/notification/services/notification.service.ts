import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    Notification,
    NotificationUserSetting,
    Prisma,
} from '@generated/prisma-client';
import { NotificationSettingUpdateAllowedCombinations } from '@modules/notification/constants/notification.constant';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { INotificationUserSettingUpdate } from '@modules/notification/interfaces/notification.interface';
import { INotificationService } from '@modules/notification/interfaces/notification.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService implements INotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly requestStoreService: RequestStoreService
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
        const checkExist = await this.notificationRepository.existById(
            userId,
            notificationId
        );
        if (!checkExist) {
            throw new NotificationNotFoundException();
        } else if (checkExist.isRead) {
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

        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        await this.notificationUserSettingRepository.updateUserSetting(
            userId,
            data,
            requestLog
        );
    }

    /** Rejects any type/channel pair not in the allowed combinations list. */
    validateUserSetting(
        type: EnumNotificationType,
        channel: EnumNotificationChannel
    ): void {
        const validType = NotificationSettingUpdateAllowedCombinations.find(
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
