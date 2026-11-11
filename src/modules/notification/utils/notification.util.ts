import type { IFirebasePushResult } from '@common/firebase/interfaces/firebase.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import type {
    INotificationPushSendOutcome,
    INotificationPushTokenPair,
    INotificationRecipient,
    INotificationStepFailure,
    INotificationStepOutcomes,
    INotificationStepResult,
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
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
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

    private toEncryptedTokens(
        pairs: INotificationPushTokenPair[],
        tokens: string[]
    ): string[] {
        return pairs
            .filter(pair => tokens.includes(pair.token))
            .map(pair => pair.encrypted);
    }

    private resolveChannels(
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

    toStepFailure(
        step: EnumNotificationStep,
        reason: unknown
    ): INotificationStepFailure {
        const rawError =
            reason instanceof Error ? reason : new Error(String(reason));

        return { step, rawError };
    }

    toStepSummary(failedSteps: INotificationStepFailure[]): string {
        const steps = failedSteps.map(({ step }) => step);

        return this.messageService.setMessage(
            'notification.queue.error.stepsFailed',
            { properties: { steps: steps.join(', ') } }
        );
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

    toTokenPairs(
        userId: string,
        encryptedTokens: string[]
    ): INotificationPushTokenPair[] {
        return encryptedTokens.map(encrypted => {
            const token = this.decryptPayload(encrypted, userId);

            return { encrypted, token };
        });
    }

    toMulticastOutcome(
        pairs: INotificationPushTokenPair[],
        { failureTokens, retryTokens }: IFirebasePushResult,
        encryptedFailureTokens: string[] | null
    ): INotificationPushSendOutcome {
        const failed = this.toEncryptedTokens(pairs, failureTokens);
        const merged = [...(encryptedFailureTokens ?? []), ...failed];
        const pending = this.toEncryptedTokens(pairs, retryTokens);
        let failure: INotificationStepFailure | null = null;
        if (pending.length > 0) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.tokensPending',
                { properties: { count: pending.length } }
            );
            failure = {
                step: EnumNotificationStep.sendMulticast,
                rawError: new Error(message),
            };
        }

        return {
            encryptedFailureTokens: [...new Set(merged)],
            encryptedPendingTokens: pending,
            failure,
        };
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

    toTemplateLabel(process: EnumNotificationProcess): string {
        return process.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`);
    }
}
