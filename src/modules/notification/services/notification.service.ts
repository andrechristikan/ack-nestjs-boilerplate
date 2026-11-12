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
import {
    EnumNotificationEmailProcess,
    EnumNotificationKeyPattern,
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationPushProcess,
    EnumNotificationQueue,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ConfigService } from '@nestjs/config';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';
import type {
    INotificationContext,
    INotificationContextMap,
    INotificationKeyPatterns,
    INotificationPublishTermPolicyInput,
    INotificationPublishTermPolicyPayload,
    INotificationPushCleanupStaleTokensResult,
    INotificationPushCleanupTokensResult,
    INotificationRecipientRecord,
    INotificationSealedContext,
    INotificationSealedRecord,
    INotificationSnapshot,
    INotificationUserSettingPreference,
    INotificationUserSettingUpdate,
    INotificationWorkspaceInviteFields,
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
    private readonly keyPatterns: INotificationKeyPatterns;
    private readonly stepPattern: string;
    private readonly termPolicyResendPattern: string;

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly deviceService: DeviceService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {
        this.stepPattern = this.configService.get<string>(
            'notification.idempotencyKey.stepPattern'
        )!;
        this.termPolicyResendPattern = this.configService.get<string>(
            'notification.idempotencyKey.termPolicyResendPattern'
        )!;
        const userPattern = this.configService.get<string>(
            'notification.idempotencyKey.userPattern'
        )!;
        const referencePattern = this.configService.get<string>(
            'notification.idempotencyKey.referencePattern'
        )!;
        const joinRequestPattern = this.configService.get<string>(
            'notification.idempotencyKey.joinRequestPattern'
        )!;
        const userTermPolicyPattern = this.configService.get<string>(
            'notification.idempotencyKey.userTermPolicyPattern'
        )!;
        const termPolicyPublishPattern = this.configService.get<string>(
            'notification.idempotencyKey.termPolicyPublishPattern'
        )!;
        this.keyPatterns = {
            [EnumNotificationKeyPattern.userPattern]: userPattern,
            [EnumNotificationKeyPattern.referencePattern]: referencePattern,
            [EnumNotificationKeyPattern.joinRequestPattern]: joinRequestPattern,
            [EnumNotificationKeyPattern.userTermPolicyPattern]:
                userTermPolicyPattern,
            [EnumNotificationKeyPattern.termPolicyPublishPattern]:
                termPolicyPublishPattern,
        };
    }

    private sealContext(
        context: INotificationContext | INotificationWorkspaceInviteFields,
        secrets: string[],
        encryptionContext: string
    ): INotificationSealedRecord {
        const sealed: INotificationSealedRecord = {};
        for (const [field, value] of Object.entries(context)) {
            const isSecret = secrets.includes(field);
            if (!isSecret) {
                sealed[field] = value;

                continue;
            }

            const sealedField = this.notificationUtil.toSealedField(field);
            sealed[sealedField] = this.notificationUtil.encryptPayload(
                value,
                encryptionContext
            );
        }

        return sealed;
    }

    private findKindByTitle(title: string): EnumNotificationKind | null {
        const kinds = Object.values(EnumNotificationKind);

        return (
            kinds.find(
                kind => NotificationKindContract[kind].title === title
            ) ?? null
        );
    }

    private toStepKey(
        notificationId: string,
        step: EnumNotificationStep
    ): string {
        return this.helperStringService.fillPattern(this.stepPattern, {
            notificationId,
            step,
        });
    }

    private sendEmailEffect(
        kind: EnumNotificationKind,
        notificationId: string,
        context: INotificationSealedContext,
        { userId, username, encryptedEmail }: INotificationRecipientRecord
    ): IOutboxEffect {
        const { queuePriority } = NotificationKindContract[kind];
        const idempotencyKey = this.toStepKey(
            notificationId,
            EnumNotificationStep.sendEmail
        );

        return {
            queue: EnumNotificationQueue.notificationEmail,
            name: EnumNotificationEmailProcess.send,
            data: {
                kind,
                notificationId,
                userId,
                username,
                encryptedEmail,
                context,
                completedSteps: [],
            },
            priority: queuePriority,
            idempotencyKey,
        };
    }

    private sendPushEffect(
        kind: EnumNotificationKind,
        notificationId: string,
        context: INotificationSealedContext,
        { userId, username, encryptedTokens }: INotificationRecipientRecord
    ): IOutboxEffect {
        const { queuePriority } = NotificationKindContract[kind];
        const idempotencyKey = this.toStepKey(
            notificationId,
            EnumNotificationStep.sendPush
        );

        return {
            queue: EnumNotificationQueue.notificationPush,
            name: EnumNotificationPushProcess.send,
            data: {
                kind,
                notificationId,
                userId,
                username,
                encryptedTokens,
                context,
                completedSteps: [],
                encryptedPendingTokens: null,
                encryptedFailureTokens: null,
            },
            priority: queuePriority,
            idempotencyKey,
        };
    }

    private toKeyValues(
        process: string,
        sealed: INotificationSealedRecord
    ): Record<string, string> {
        const values: Record<string, string> = { process };
        for (const [field, value] of Object.entries(sealed)) {
            if (typeof value === 'string') {
                values[field] = value;
            }
        }

        return values;
    }

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

    private sealSnapshot(
        { id, email, username }: IUserRecipient,
        tokens: string[]
    ): INotificationSnapshot {
        const encryptedEmail = this.notificationUtil.encryptPayload(email, id);
        const encryptedTokens = [...new Set(tokens)].map(token =>
            this.notificationUtil.encryptPayload(token, id)
        );

        return { username, encryptedEmail, encryptedTokens };
    }

    /** The outbox effect that resolves the recipient, creates the notification, and fans it out; each secret of the kind is encrypted against the recipient's user id. */
    notify<K extends EnumNotificationKind>(
        kind: K,
        context: INotificationContextMap[K]
    ): IOutboxEffect {
        const { userId, proceedBy } = context;
        const { secrets, keyPattern, queuePriority } =
            NotificationKindContract[kind];
        const sealed = this.sealContext(context, secrets, userId);
        let idempotencyKey: string | null = null;
        if (keyPattern !== null) {
            const values = this.toKeyValues(kind, sealed);
            idempotencyKey = this.helperStringService.fillPattern(
                this.keyPatterns[keyPattern],
                values
            );
        }

        return {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.notify,
            data: {
                kind,
                context: { ...sealed, userId, proceedBy },
                recipient: null,
                notificationId: null,
            },
            priority: queuePriority,
            idempotencyKey,
        };
    }

    /** The outbox effect that emails an invitee with no account; the address and the link are encrypted against the invite reference. */
    notifyUnregisteredInvite(
        email: string,
        payload: INotificationWorkspaceInviteFields
    ): IOutboxEffect {
        const { reference } = payload;
        const { secrets, queuePriority } =
            NotificationKindContract[EnumNotificationKind.workspaceInvite];
        const encryptedEmail = this.notificationUtil.encryptPayload(
            email,
            reference
        );
        const sealed = this.sealContext(payload, secrets, reference);
        const idempotencyKey = this.helperStringService.fillPattern(
            this.keyPatterns[EnumNotificationKeyPattern.referencePattern],
            {
                process: EnumNotificationEmailProcess.sendUnregistered,
                reference,
            }
        );

        return {
            queue: EnumNotificationQueue.notificationEmail,
            name: EnumNotificationEmailProcess.sendUnregistered,
            data: { encryptedEmail, context: { ...sealed, reference } },
            priority: queuePriority,
            idempotencyKey,
        };
    }

    toRecipientRecord(
        user: IUserRecipient,
        tokens: string[],
        channels: EnumNotificationChannel[]
    ): INotificationRecipientRecord {
        const snapshot = this.sealSnapshot(user, tokens);

        return { userId: user.id, ...snapshot, channels };
    }

    /** The encrypted address and the encrypted tokens of the devices with a live session now, to be read before a revoke ends those sessions. */
    async getSnapshot(user: IUserRecipient): Promise<INotificationSnapshot> {
        const tokens = await this.deviceService.getNotificationTokens(user.id);

        return this.sealSnapshot(user, tokens);
    }

    /** The recipient a snapshot yields, with every channel the kind lists and the user's settings ignored. */
    toSnapshotRecipientRecord(
        kind: EnumNotificationKind,
        userId: string,
        snapshot: INotificationSnapshot
    ): INotificationRecipientRecord {
        const channels = this.notificationUtil.resolveChannels(kind, []);

        return { userId, ...snapshot, channels };
    }

    /** Creates the notification on the caller's transaction and adds its email and push rows: email when the channels hold it, push when the channels hold it and the recipient has tokens. */
    async createInTx(
        tx: IDatabaseTransactionClient,
        notificationId: string,
        kind: EnumNotificationKind,
        context: INotificationSealedContext,
        recipient: INotificationRecipientRecord
    ): Promise<void> {
        const { userId, username, channels, encryptedTokens } = recipient;
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
            const effect = this.sendEmailEffect(
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
            const effect = this.sendPushEffect(
                kind,
                notificationId,
                context,
                recipient
            );
            effects.push(effect);
        }

        if (effects.length > 0) {
            await this.outboxService.addManyInTx(tx, effects);
        }
    }

    /** The outbox effect that pages the active recipients up to the cutoff and adds one email batch row per page. */
    publishTermPolicyEffect(
        payload: INotificationPublishTermPolicyPayload,
        proceedBy: string
    ): IOutboxEffect {
        const idempotencyKey = this.helperStringService.fillPattern(
            this.keyPatterns[
                EnumNotificationKeyPattern.termPolicyPublishPattern
            ],
            {
                process: EnumNotificationProcess.publishTermPolicy,
                termPolicyId: payload.termPolicyId,
            }
        );

        return {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.publishTermPolicy,
            data: { proceedBy, data: payload },
            priority: EnumQueuePriority.medium,
            idempotencyKey,
        };
    }

    /** The operator re-run of the publish effect: a fresh nonce sits in its data and its key, and in every batch key it adds. */
    resendPublishTermPolicyEffect(
        payload: INotificationPublishTermPolicyInput,
        proceedBy: string
    ): IOutboxEffect {
        const resendNonce = this.databaseUtil.createId();
        const idempotencyKey = this.helperStringService.fillPattern(
            this.termPolicyResendPattern,
            {
                process: EnumNotificationProcess.resendPublishTermPolicy,
                termPolicyId: payload.termPolicyId,
                resendNonce,
            }
        );

        return {
            queue: EnumNotificationQueue.notification,
            name: EnumNotificationProcess.resendPublishTermPolicy,
            data: { proceedBy, data: { ...payload, resendNonce } },
            priority: EnumQueuePriority.medium,
            idempotencyKey,
        };
    }

    cleanupTokensEffect(
        userId: string,
        encryptedFailureTokens: string[]
    ): IOutboxEffect {
        return {
            queue: EnumNotificationQueue.notificationPush,
            name: EnumNotificationPushProcess.cleanupTokens,
            data: { userId, encryptedFailureTokens },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
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

    /** The message properties of a stored notification: the metadata's primitive values, the kind's date fields formatted for display. The kind is the one whose contract row owns the title. */
    toMessageProperties(
        title: string,
        metadata: Prisma.JsonValue
    ): IMessageProperties {
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

        const kind = this.findKindByTitle(title);
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
