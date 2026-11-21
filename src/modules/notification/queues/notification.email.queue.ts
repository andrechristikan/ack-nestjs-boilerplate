import { HelperStringService } from '@common/helper/services/helper.string.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationQueue,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailPublishTermPolicyEffect,
    INotificationEmailSendEffect,
    INotificationEmailSendUnregisteredEffect,
    INotificationRecipientRecord,
    INotificationSealedData,
    INotificationTermPolicyBatchRecipient,
    INotificationWorkspaceInviteFields,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { ITermPolicyPublishPayload } from '@modules/term-policy/interfaces/term-policy.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationEmailQueue extends QueueBase {
    private readonly referencePattern: string;
    private readonly termPolicyBatchPattern: string;
    private readonly termPolicyBatchResendPattern: string;

    constructor(
        @InjectQueue(EnumNotificationQueue.notificationEmail)
        protected readonly queue: Queue,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly notificationUtil: NotificationUtil
    ) {
        super(queue);
        this.referencePattern = this.configService.get<string>(
            'notification.idempotencyKey.referencePattern'
        )!;
        this.termPolicyBatchPattern = this.configService.get<string>(
            'notification.idempotencyKey.termPolicyBatchPattern'
        )!;
        this.termPolicyBatchResendPattern = this.configService.get<string>(
            'notification.idempotencyKey.termPolicyBatchResendPattern'
        )!;
    }

    sendEffect(
        kind: EnumNotificationKind,
        notificationId: string,
        context: INotificationSealedData,
        { userId, username, encryptedEmail }: INotificationRecipientRecord
    ): INotificationEmailSendEffect {
        const { queuePriority } = NotificationKindContract[kind];
        const idempotencyKey = this.notificationUtil.toStepKey(
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

    /** The outbox effect that emails an invitee with no account; the address and the link are encrypted against the invite reference. */
    notifyUnregisteredInvite(
        email: string,
        payload: INotificationWorkspaceInviteFields
    ): INotificationEmailSendUnregisteredEffect {
        const { reference } = payload;
        const { secrets, queuePriority } =
            NotificationKindContract[EnumNotificationKind.workspaceInvite];
        const encryptedEmail = this.notificationUtil.encryptPayload(
            email,
            reference
        );
        const sealed = this.notificationUtil.sealContext(
            payload,
            secrets,
            reference
        );
        const idempotencyKey = this.helperStringService.fillPattern(
            this.referencePattern,
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

    emailPublishTermPolicyEffect(
        data: ITermPolicyPublishPayload,
        batchId: string,
        proceedBy: string,
        recipients: INotificationTermPolicyBatchRecipient[]
    ): INotificationEmailPublishTermPolicyEffect {
        const { resendNonce } = data;
        const pattern =
            resendNonce === null
                ? this.termPolicyBatchPattern
                : this.termPolicyBatchResendPattern;
        const idempotencyKey = this.helperStringService.fillPattern(pattern, {
            process: EnumNotificationEmailProcess.publishTermPolicy,
            termPolicyId: data.termPolicyId,
            batchId,
            ...(resendNonce !== null && { resendNonce }),
        });
        const encryptedRecipients = recipients.map(
            ({ userId, notificationId, email, username }) => {
                const encryptedEmail = this.notificationUtil.encryptPayload(
                    email,
                    userId
                );

                return { userId, notificationId, encryptedEmail, username };
            }
        );

        return {
            queue: EnumNotificationQueue.notificationEmail,
            name: EnumNotificationEmailProcess.publishTermPolicy,
            data: {
                data,
                batchId,
                proceedBy,
                recipients: encryptedRecipients,
            },
            priority: EnumQueuePriority.medium,
            idempotencyKey,
        };
    }
}
