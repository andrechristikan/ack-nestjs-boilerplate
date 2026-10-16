import { EnumNotificationChannel } from '@generated/prisma-client/client';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendEncryptedPayload,
    INotificationRecipientEncryptedPayload,
    INotificationSendPushEncryptedPayload,
    INotificationStepFailure,
    INotificationStepResult,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

/** Writes and fans out the workspace invite and join-request notifications. */
@Injectable()
export class NotificationWorkspaceDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async processWorkspaceInvite(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationWorkspaceInviteEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Workspace invite notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.workspaceInvite,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                workspaceId: data.workspaceId,
                                workspaceName: data.workspaceName,
                                inviterName: data.inviterName,
                            },
                            createdBy: proceedBy,
                            channels: recipient.channels,
                        },
                    },
                ]);
                done.push(EnumNotificationStep.createNotification);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.createNotification,
                    error
                );

                return {
                    message: 'Workspace invite notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (
            recipient.channels.includes(EnumNotificationChannel.email) &&
            !done.includes(EnumNotificationStep.sendEmail)
        ) {
            const emailPayload: INotificationEmailSendEncryptedPayload = {
                userId,
                encryptedEmail: recipient.encryptedEmail,
                username: recipient.username,
                notificationId,
                cc: [],
                bcc: [],
            };
            const emailSent = this.notificationEmailQueue.sendWorkspaceInvite(
                emailPayload,
                data
            );
            steps.push(EnumNotificationStep.sendEmail);
            promises.push(emailSent);
        }

        if (
            recipient.channels.includes(EnumNotificationChannel.push) &&
            recipient.encryptedNotificationTokens.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushEncryptedPayload = {
                userId,
                notificationId,
                encryptedNotificationTokens:
                    recipient.encryptedNotificationTokens,
                username: recipient.username,
            };
            const pushSent = this.notificationPushQueue.sendWorkspaceInvite(
                pushPayload,
                {
                    workspaceId: data.workspaceId,
                    workspaceName: data.workspaceName,
                    inviterName: data.inviterName,
                    workspaceMemberRole: data.workspaceMemberRole,
                    reference: data.reference,
                    expiredAt: data.expiredAt,
                }
            );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        for (const [index, outcome] of outcomes.entries()) {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                continue;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        }

        return {
            message: 'Workspace invite notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processWorkspaceJoinRequest(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationWorkspaceJoinRequestEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Workspace join request notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.workspaceJoinRequest,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                workspaceId: data.workspaceId,
                                workspaceName: data.workspaceName,
                                requesterName: data.requesterName,
                            },
                            createdBy: proceedBy,
                            channels: recipient.channels,
                        },
                    },
                ]);
                done.push(EnumNotificationStep.createNotification);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.createNotification,
                    error
                );

                return {
                    message: 'Workspace join request notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (
            recipient.channels.includes(EnumNotificationChannel.email) &&
            !done.includes(EnumNotificationStep.sendEmail)
        ) {
            const emailPayload: INotificationEmailSendEncryptedPayload = {
                userId,
                encryptedEmail: recipient.encryptedEmail,
                username: recipient.username,
                notificationId,
                cc: [],
                bcc: [],
            };
            const emailSent =
                this.notificationEmailQueue.sendWorkspaceJoinRequest(
                    emailPayload,
                    data
                );
            steps.push(EnumNotificationStep.sendEmail);
            promises.push(emailSent);
        }

        if (
            recipient.channels.includes(EnumNotificationChannel.push) &&
            recipient.encryptedNotificationTokens.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushEncryptedPayload = {
                userId,
                notificationId,
                encryptedNotificationTokens:
                    recipient.encryptedNotificationTokens,
                username: recipient.username,
            };
            const pushSent =
                this.notificationPushQueue.sendWorkspaceJoinRequest(
                    pushPayload,
                    {
                        workspaceId: data.workspaceId,
                        workspaceName: data.workspaceName,
                        requesterName: data.requesterName,
                    }
                );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        for (const [index, outcome] of outcomes.entries()) {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                continue;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        }

        return {
            message: 'Workspace join request notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processWorkspaceJoinAccepted(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationWorkspaceJoinAcceptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Workspace join accepted notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.workspaceJoinAccepted,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                workspaceId: data.workspaceId,
                                workspaceName: data.workspaceName,
                            },
                            createdBy: proceedBy,
                            channels: recipient.channels,
                        },
                    },
                ]);
                done.push(EnumNotificationStep.createNotification);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.createNotification,
                    error
                );

                return {
                    message: 'Workspace join accepted notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (
            recipient.channels.includes(EnumNotificationChannel.email) &&
            !done.includes(EnumNotificationStep.sendEmail)
        ) {
            const emailPayload: INotificationEmailSendEncryptedPayload = {
                userId,
                encryptedEmail: recipient.encryptedEmail,
                username: recipient.username,
                notificationId,
                cc: [],
                bcc: [],
            };
            const emailSent =
                this.notificationEmailQueue.sendWorkspaceJoinAccepted(
                    emailPayload,
                    data
                );
            steps.push(EnumNotificationStep.sendEmail);
            promises.push(emailSent);
        }

        if (
            recipient.channels.includes(EnumNotificationChannel.push) &&
            recipient.encryptedNotificationTokens.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushEncryptedPayload = {
                userId,
                notificationId,
                encryptedNotificationTokens:
                    recipient.encryptedNotificationTokens,
                username: recipient.username,
            };
            const pushSent =
                this.notificationPushQueue.sendWorkspaceJoinAccepted(
                    pushPayload,
                    data
                );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        for (const [index, outcome] of outcomes.entries()) {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                continue;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        }

        return {
            message: 'Workspace join accepted notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processWorkspaceJoinRejected(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationWorkspaceJoinRejectedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Workspace join rejected notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.workspaceJoinRejected,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                workspaceId: data.workspaceId,
                                workspaceName: data.workspaceName,
                                rejectReasonCode: data.rejectReasonCode,
                            },
                            createdBy: proceedBy,
                            channels: recipient.channels,
                        },
                    },
                ]);
                done.push(EnumNotificationStep.createNotification);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.createNotification,
                    error
                );

                return {
                    message: 'Workspace join rejected notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (
            recipient.channels.includes(EnumNotificationChannel.email) &&
            !done.includes(EnumNotificationStep.sendEmail)
        ) {
            const emailPayload: INotificationEmailSendEncryptedPayload = {
                userId,
                encryptedEmail: recipient.encryptedEmail,
                username: recipient.username,
                notificationId,
                cc: [],
                bcc: [],
            };
            const emailSent =
                this.notificationEmailQueue.sendWorkspaceJoinRejected(
                    emailPayload,
                    data
                );
            steps.push(EnumNotificationStep.sendEmail);
            promises.push(emailSent);
        }

        if (
            recipient.channels.includes(EnumNotificationChannel.push) &&
            recipient.encryptedNotificationTokens.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushEncryptedPayload = {
                userId,
                notificationId,
                encryptedNotificationTokens:
                    recipient.encryptedNotificationTokens,
                username: recipient.username,
            };
            const pushSent =
                this.notificationPushQueue.sendWorkspaceJoinRejected(
                    pushPayload,
                    data
                );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        for (const [index, outcome] of outcomes.entries()) {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                continue;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        }

        return {
            message: 'Workspace join rejected notification processed',
            completedSteps: done,
            failedSteps,
        };
    }
}
