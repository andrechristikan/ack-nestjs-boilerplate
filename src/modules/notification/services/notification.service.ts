import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Notification,
    NotificationUserSetting,
} from '@generated/prisma-client/client';
import { DeviceService } from '@modules/device/services/device.service';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import type {
    INotificationPushCleanupStaleTokensResult,
    INotificationPushCleanupTokensResult,
    INotificationRecipient,
    INotificationUserSettingPreference,
    INotificationUserSettingUpdate,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { MessageService } from '@common/message/services/message.service';
import type { IMessageProperties } from '@common/message/interfaces/message.interface';

@Injectable()
export class NotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly deviceService: DeviceService,
        private readonly messageService: MessageService
    ) {}

    private listConfigurableSettings(
        settings: NotificationUserSetting[]
    ): NotificationUserSetting[] {
        return settings.filter(setting =>
            NotificationSettingContract.some(
                contract =>
                    contract.type === setting.type &&
                    contract.channels.includes(setting.channel)
            )
        );
    }

    private listMutedInAppTypes(
        settings: INotificationUserSettingPreference[]
    ): EnumNotificationType[] {
        return settings
            .filter(
                setting =>
                    setting.channel === EnumNotificationChannel.inApp &&
                    !setting.isActive
            )
            .map(setting => setting.type);
    }

    private async findMutedInAppTypes(
        userId: string
    ): Promise<EnumNotificationType[]> {
        const settings =
            await this.notificationUserSettingRepository.findUserSetting(
                userId
            );

        return this.listMutedInAppTypes(settings);
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.NotificationWhereInput>
    ): Promise<IResponsePaginationReturn<Notification>> {
        const excludedTypes = await this.findMutedInAppTypes(userId);

        return this.notificationRepository.findWithPaginationCursor(
            userId,
            pagination,
            excludedTypes
        );
    }

    async getListUserSetting(
        userId: string
    ): Promise<NotificationUserSetting[]> {
        const settings =
            await this.notificationUserSettingRepository.findUserSetting(
                userId
            );

        return this.listConfigurableSettings(settings);
    }

    async getRecipient(
        user: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [tokens, settings] = await Promise.all([
            this.deviceService.getNotificationTokens(user.id),
            this.getListUserSetting(user.id),
        ]);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        // Sequential by design: gate before the work it guards
        const notification = await this.notificationRepository.findIsReadById(
            userId,
            notificationId
        );
        if (!notification) {
            throw new NotificationNotFoundException();
        }
        if (notification.isRead) {
            throw new NotificationAlreadyReadException();
        }

        const marked = await this.notificationRepository.markAsRead(
            notificationId,
            userId
        );
        if (!marked) {
            throw new NotificationAlreadyReadException();
        }
    }

    async markAllAsRead(userId: string): Promise<number> {
        const excludedTypes = await this.findMutedInAppTypes(userId);
        const batchUpdated = await this.notificationRepository.markAllAsRead(
            userId,
            excludedTypes
        );

        return batchUpdated.count;
    }

    async updateUserSetting(
        userId: string,
        data: INotificationUserSettingUpdate
    ): Promise<void> {
        this.validateUserSetting(data.type, data.channel);

        const updated =
            await this.notificationUserSettingRepository.updateUserSetting(
                userId,
                data
            );
        if (!updated) {
            throw new NotificationSettingInvalidException();
        }
    }

    async createDefaultsManyInTx(
        tx: IDatabaseTransactionClient,
        userIds: string[]
    ): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        await this.notificationUserSettingRepository.createDefaultsManyInTx(
            tx,
            userIds
        );
    }

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

    decryptFailureTokens(
        userId: string,
        encryptedFailureTokens: string[]
    ): string[] {
        return encryptedFailureTokens.map(encrypted =>
            this.notificationUtil.decryptPayload(encrypted, userId)
        );
    }

    toCleanupTokensResult(
        countRequestedTokens: number,
        countRemovedTokens: number
    ): INotificationPushCleanupTokensResult {
        const message = this.messageService.setMessage(
            'notification.queue.push.cleanupTokens'
        );

        return { message, countRequestedTokens, countRemovedTokens };
    }

    toCleanupStaleTokensResult(
        countRemovedTokens: number
    ): INotificationPushCleanupStaleTokensResult {
        const message = this.messageService.setMessage(
            'notification.queue.push.cleanupStaleTokens'
        );

        return { message, countRemovedTokens };
    }

    toMessageProperties(metadata: Prisma.JsonValue): IMessageProperties {
        const properties: IMessageProperties = {};
        if (
            metadata === null ||
            typeof metadata !== 'object' ||
            Array.isArray(metadata)
        ) {
            return properties;
        }

        for (const [key, value] of Object.entries(metadata)) {
            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                properties[key] = value;
            }
        }

        return properties;
    }

    toRejectReasonProperties(
        properties: IMessageProperties,
        language: string | null
    ): IMessageProperties {
        const code = properties.rejectReasonCode;
        if (typeof code !== 'string') {
            return properties;
        }

        const options = {
            ...(language !== null && { customLanguage: language }),
        };
        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${code}`,
            options
        );

        return { ...properties, rejectReasonLabel };
    }
}
