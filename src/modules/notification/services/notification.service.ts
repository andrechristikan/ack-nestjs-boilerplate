import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
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
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import type {
    INotificationCreateEntry,
    INotificationCreateRecipient,
    INotificationRecipientRecord,
    INotificationSealedData,
    INotificationSealedRecord,
    INotificationSnapshot,
    INotificationUserSettingPreference,
    INotificationUserSettingUpdate,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationSmsQueue } from '@modules/notification/queues/notification.sms.queue';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { MessageService } from '@common/message/services/message.service';
import type { IMessageProperties } from '@common/message/interfaces/message.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class NotificationService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationPushQueue: NotificationPushQueue,
        private readonly notificationSmsQueue: NotificationSmsQueue
    ) {}

    private findKindByTitle(title: string): EnumNotificationKind | null {
        const kinds = Object.values(EnumNotificationKind);

        return (
            kinds.find(
                kind => NotificationKindContract[kind].title === title
            ) ?? null
        );
    }

    private listConfigurableSettings(
        settings: NotificationUserSetting[]
    ): NotificationUserSetting[] {
        const configurable = new Set(
            NotificationSettingContract.flatMap(contract =>
                contract.channels.map(channel => `${contract.type}:${channel}`)
            )
        );

        return settings.filter(setting =>
            configurable.has(`${setting.type}:${setting.channel}`)
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

    /** The recipient record with the address, each distinct token, and the mobile number, when one is given, encrypted against the user id. */
    toRecipientRecord(
        user: IUserRecipient,
        tokens: string[],
        mobileNumber: string | null,
        channels: EnumNotificationChannel[]
    ): INotificationRecipientRecord {
        const snapshot = this.notificationUtil.sealSnapshot(user, tokens);
        let encryptedMobileNumber: string | null = null;
        if (mobileNumber !== null) {
            encryptedMobileNumber = this.notificationUtil.encryptPayload(
                mobileNumber,
                user.id
            );
        }

        return {
            userId: user.id,
            ...snapshot,
            encryptedMobileNumber,
            channels,
        };
    }

    /** The recipient a snapshot yields, with every channel the kind lists and the user's settings ignored. */
    toSnapshotRecipientRecord(
        kind: EnumNotificationKind,
        userId: string,
        snapshot: INotificationSnapshot
    ): INotificationRecipientRecord {
        const channels = this.notificationUtil.resolveChannels(kind, []);

        return { userId, ...snapshot, encryptedMobileNumber: null, channels };
    }

    /** Creates the notification on the caller's transaction and adds its channel rows: email when the channels hold it, push when they hold it and the recipient has tokens, sms when they hold it and the recipient has a number. */
    async createInTx(
        tx: IDatabaseTransactionClient,
        notificationId: string,
        kind: EnumNotificationKind,
        context: INotificationSealedData,
        recipient: INotificationRecipientRecord
    ): Promise<void> {
        const {
            userId,
            username,
            channels,
            encryptedTokens,
            encryptedMobileNumber,
        } = recipient;
        const metadata = this.notificationUtil.toMetadata(
            kind,
            context,
            username
        );
        await this.notificationRepository.createInTx(tx, kind, {
            id: notificationId,
            userId,
            metadata,
            createdBy: context.proceedBy,
            channels,
        });

        const effects: IOutboxEffect[] = [];
        if (channels.includes(EnumNotificationChannel.email)) {
            const effect = this.notificationEmailQueue.sendEffect(
                kind,
                notificationId,
                context,
                recipient
            );
            effects.push(effect);
        }

        if (
            channels.includes(EnumNotificationChannel.push) &&
            encryptedTokens.length > 0
        ) {
            const effect = this.notificationPushQueue.sendEffect(
                kind,
                notificationId,
                context,
                recipient
            );
            effects.push(effect);
        }

        if (
            channels.includes(EnumNotificationChannel.sms) &&
            encryptedMobileNumber !== null
        ) {
            const effect = this.notificationSmsQueue.sendEffect(
                kind,
                notificationId,
                context,
                recipient,
                encryptedMobileNumber
            );
            effects.push(effect);
        }

        if (effects.length > 0) {
            await this.outboxService.addManyInTx(tx, effects);
        }
    }

    /** Creates one notification per recipient on the caller's transaction, with the channels the kind's contract lists as pending and delivered. */
    async createManyInTx(
        tx: IDatabaseTransactionClient,
        kind: EnumNotificationKind,
        metadata: Prisma.InputJsonValue,
        proceedBy: string,
        recipients: INotificationCreateRecipient[]
    ): Promise<void> {
        const { pendingChannels, deliveredChannels } =
            NotificationKindContract[kind];
        const channels = [...pendingChannels, ...deliveredChannels];
        const entries: INotificationCreateEntry[] = recipients.map(
            ({ userId, notificationId }) => ({
                kind,
                payload: {
                    id: notificationId,
                    userId,
                    metadata,
                    createdBy: proceedBy,
                    channels,
                },
            })
        );

        await this.notificationRepository.createManyInTx(tx, entries);
    }

    async markEmailSentInTx(
        tx: IDatabaseTransactionClient,
        notificationIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void> {
        await this.notificationRepository.markEmailSentInTx(
            tx,
            notificationIds,
            sentAt,
            updatedBy
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
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

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        // Sequential by design: a write after its checks
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

        return this.notificationRepository.markAllAsRead(userId, excludedTypes);
    }

    async updateUserSettingInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        data: INotificationUserSettingUpdate
    ): Promise<void> {
        const updated =
            await this.notificationUserSettingRepository.updateUserSettingInTx(
                tx,
                authContext.userId,
                data
            );
        if (!updated) {
            throw new NotificationSettingInvalidException();
        }

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userNotificationSettingUpdated,
                metadata: {
                    channel: data.channel,
                    type: data.type,
                    isActive: data.isActive,
                },
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }

    async createDefaultsManyInTx(
        tx: IDatabaseTransactionClient,
        userIds: string[],
        createdBy: string
    ): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        await this.notificationUserSettingRepository.createDefaultsManyInTx(
            tx,
            userIds,
            createdBy
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

    /** The message properties of a stored notification: the metadata with each sealed secret of the kind opened for the recipient, its primitive values, the kind's date fields formatted for display. The kind is the one whose contract row owns the title. */
    toMessageProperties(
        title: string,
        metadata: Prisma.JsonValue,
        userId: string
    ): IMessageProperties {
        const properties: IMessageProperties = {};
        if (
            metadata === null ||
            typeof metadata !== 'object' ||
            Array.isArray(metadata)
        ) {
            return properties;
        }

        const kind = this.findKindByTitle(title);
        const stored = metadata as INotificationSealedRecord;
        let record = stored;
        if (kind !== null) {
            record = this.notificationUtil.openContext(kind, stored, userId);
        }

        for (const [key, value] of Object.entries(record)) {
            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                properties[key] = value;
            }
        }

        if (kind === null) {
            return properties;
        }

        return this.notificationUtil.toDisplayProperties(kind, properties);
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
