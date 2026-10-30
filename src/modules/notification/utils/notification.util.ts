import type { IAwsSESSendBulkRecipient } from '@common/aws/interfaces/aws.ses.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import type {
    INotificationPushCleanupStaleTokensResult,
    INotificationPushCleanupTokensResult,
    INotificationRecipient,
    INotificationStepFailure,
    INotificationStepOutcomes,
    INotificationStepResult,
    INotificationTermPolicyBatchRecipientEncryptedPayload,
    INotificationTermPolicyRecipientState,
    INotificationUserSettingPreference,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { MessageService } from '@common/message/services/message.service';

@Injectable()
export class NotificationUtil {
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly messageService: MessageService
    ) {
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    toStepFailure(
        step: EnumNotificationStep,
        reason: unknown
    ): INotificationStepFailure {
        const error = reason instanceof Error ? reason.message : String(reason);

        return { step, error };
    }

    toStepSummary(failedSteps: INotificationStepFailure[]): string {
        const pairs = failedSteps.map(({ step, error }) => `${step}:${error}`);

        return this.messageService.setMessage(
            'notification.queue.error.stepsFailed',
            { properties: { steps: pairs.join(', ') } }
        );
    }

    resolveChannels(
        kind: EnumNotificationKind,
        settings: INotificationUserSettingPreference[]
    ): EnumNotificationChannel[] {
        const { type, isMandatory, pendingChannels, deliveredChannels } =
            NotificationKindContract[kind];
        const channels = [...pendingChannels, ...deliveredChannels];
        const configurable = NotificationSettingContract.find(
            contract => contract.type === type
        );
        if (isMandatory || !configurable) {
            return channels;
        }

        const disabled = new Set(
            settings
                .filter(
                    setting =>
                        setting.type === type &&
                        !setting.isActive &&
                        configurable.channels.includes(setting.channel)
                )
                .map(setting => setting.channel)
        );

        const surviving = channels.filter(channel => !disabled.has(channel));
        const hasUserFacingChannel = surviving.some(
            channel => channel !== EnumNotificationChannel.silent
        );

        return hasUserFacingChannel ? surviving : [];
    }

    toStepResponse({
        message,
        completedSteps,
    }: INotificationStepResult): IQueueResponse {
        return { message, completedSteps };
    }

    foldStepOutcomes(
        steps: EnumNotificationStep[],
        outcomes: PromiseSettledResult<void>[]
    ): INotificationStepOutcomes {
        const completedSteps: EnumNotificationStep[] = [];
        const failedSteps: INotificationStepFailure[] = [];
        for (const [index, outcome] of outcomes.entries()) {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                completedSteps.push(step);

                continue;
            }

            const failure = this.toStepFailure(step, outcome.reason);
            failedSteps.push(failure);
        }

        return { completedSteps, failedSteps };
    }

    decryptPayload(encrypted: string, context: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encrypted,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            context
        );
    }

    decryptFailureTokens(
        userId: string,
        encryptedFailureTokens: string[]
    ): string[] {
        return encryptedFailureTokens.map(encrypted =>
            this.decryptPayload(encrypted, userId)
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

    toBulkDestination({
        userId,
        encryptedEmail,
        username,
    }: INotificationTermPolicyBatchRecipientEncryptedPayload): IAwsSESSendBulkRecipient {
        const recipient = this.decryptPayload(encryptedEmail, userId);

        return { recipient, templateData: { username } };
    }

    toNoChannelResult(
        process: EnumNotificationProcess,
        completedSteps: EnumNotificationStep[]
    ): INotificationStepResult {
        const message = this.messageService.setMessage(
            'notification.queue.error.noChannel',
            { properties: { process } }
        );

        return { message, completedSteps, failedSteps: [] };
    }

    listPendingBatchIds(
        users: IUserRecipient[],
        markers: INotificationTermPolicyRecipientState[]
    ): string[] {
        const batchIdByUserId = new Map(
            markers
                .filter(
                    marker =>
                        marker.sentAt === null && marker.claimedAt === null
                )
                .map(marker => [marker.userId, marker.batchId])
        );

        return [
            ...new Set(
                users.flatMap(({ id }) => batchIdByUserId.get(id) ?? [])
            ),
        ];
    }

    mapRecipient(
        { id, email, username }: IUserRecipient,
        kind: EnumNotificationKind,
        tokens: (string | null)[],
        settings: INotificationUserSettingPreference[]
    ): INotificationRecipient {
        const notificationTokens = [
            ...new Set(
                tokens.filter((token): token is string => token !== null)
            ),
        ];
        const channels = this.resolveChannels(kind, settings);

        return { userId: id, email, username, notificationTokens, channels };
    }

    listMutedInAppTypes(
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
}
