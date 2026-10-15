import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { NotificationUserSetting } from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import type {
    INotificationStepFailure,
    INotificationStepResult,
} from '@modules/notification/interfaces/notification.interface';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationUtil {
    toStepFailure(
        step: EnumNotificationStep,
        reason: unknown
    ): INotificationStepFailure {
        const error = reason instanceof Error ? reason.message : String(reason);

        return { step, error };
    }

    toStepSummary(failedSteps: INotificationStepFailure[]): string {
        const pairs = failedSteps.map(({ step, error }) => `${step}:${error}`);

        return `Notification steps failed: ${pairs.join(', ')}`;
    }

    resolveChannels(
        kind: EnumNotificationKind,
        settings: Pick<
            NotificationUserSetting,
            'channel' | 'type' | 'isActive'
        >[]
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
}
