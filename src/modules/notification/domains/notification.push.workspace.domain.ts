import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushStepResult,
    INotificationSendPushPayload,
    INotificationStepFailure,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

/** Renders and delivers the workspace invite and join-request push messages. */
@Injectable()
export class NotificationPushWorkspaceDomain {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly notificationPushQueue: NotificationPushQueue,
        private readonly notificationUtil: NotificationUtil
    ) {}

    async processWorkspaceInvite(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceInvitePushPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping workspace invite notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
            };
        }

        const done = [...completedSteps];
        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = failureTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: {
                    username,
                    workspaceName: data.workspaceName,
                    inviterName: data.inviterName,
                },
            });
            try {
                const result = await this.firebaseService.sendMulticast(
                    notificationTokens,
                    { title, body }
                );
                tokens = result.failureTokens;
                done.push(EnumNotificationStep.sendMulticast);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.sendMulticast,
                    error
                );

                return {
                    message: 'Workspace invite notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                    failureTokens: tokens,
                };
            }
        }

        const recordedTokens = tokens ?? [];
        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (!done.includes(EnumNotificationStep.cleanupTokens)) {
            const cleanupSent = this.notificationPushQueue.sendCleanupTokens(
                notificationId,
                userId,
                recordedTokens
            );
            steps.push(EnumNotificationStep.cleanupTokens);
            promises.push(cleanupSent);
        }
        if (!done.includes(EnumNotificationStep.updateSentAt)) {
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                recordedTokens
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        outcomes.forEach((outcome, index) => {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                return;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        });

        return {
            message: 'Workspace invite notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
        };
    }

    async processWorkspaceJoinRequest(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRequestPushPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping workspace join request notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
            };
        }

        const done = [...completedSteps];
        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = failureTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: {
                    username,
                    workspaceName: data.workspaceName,
                    requesterName: data.requesterName,
                },
            });
            try {
                const result = await this.firebaseService.sendMulticast(
                    notificationTokens,
                    { title, body }
                );
                tokens = result.failureTokens;
                done.push(EnumNotificationStep.sendMulticast);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.sendMulticast,
                    error
                );

                return {
                    message: 'Workspace join request notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                    failureTokens: tokens,
                };
            }
        }

        const recordedTokens = tokens ?? [];
        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (!done.includes(EnumNotificationStep.cleanupTokens)) {
            const cleanupSent = this.notificationPushQueue.sendCleanupTokens(
                notificationId,
                userId,
                recordedTokens
            );
            steps.push(EnumNotificationStep.cleanupTokens);
            promises.push(cleanupSent);
        }
        if (!done.includes(EnumNotificationStep.updateSentAt)) {
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                recordedTokens
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        outcomes.forEach((outcome, index) => {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                return;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        });

        return {
            message: 'Workspace join request notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
        };
    }

    async processWorkspaceJoinAccepted(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinAcceptedPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping workspace join accepted notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
            };
        }

        const done = [...completedSteps];
        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = failureTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: {
                    username,
                    workspaceName: data.workspaceName,
                },
            });
            try {
                const result = await this.firebaseService.sendMulticast(
                    notificationTokens,
                    { title, body }
                );
                tokens = result.failureTokens;
                done.push(EnumNotificationStep.sendMulticast);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.sendMulticast,
                    error
                );

                return {
                    message: 'Workspace join accepted notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                    failureTokens: tokens,
                };
            }
        }

        const recordedTokens = tokens ?? [];
        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (!done.includes(EnumNotificationStep.cleanupTokens)) {
            const cleanupSent = this.notificationPushQueue.sendCleanupTokens(
                notificationId,
                userId,
                recordedTokens
            );
            steps.push(EnumNotificationStep.cleanupTokens);
            promises.push(cleanupSent);
        }
        if (!done.includes(EnumNotificationStep.updateSentAt)) {
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                recordedTokens
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        outcomes.forEach((outcome, index) => {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                return;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        });

        return {
            message: 'Workspace join accepted notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
        };
    }

    async processWorkspaceJoinRejected(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRejectedPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping workspace join rejected notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
            };
        }

        const done = [...completedSteps];
        const notification = await this.notificationRepository.updateProcessAt(
            userId,
            notificationId,
            EnumNotificationChannel.push
        );
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = failureTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const rejectReasonLabel = this.messageService.setMessage(
                `notification.rejectReason.${data.rejectReasonCode}`
            );
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: {
                    username,
                    workspaceName: data.workspaceName,
                    rejectReasonLabel,
                },
            });
            try {
                const result = await this.firebaseService.sendMulticast(
                    notificationTokens,
                    { title, body }
                );
                tokens = result.failureTokens;
                done.push(EnumNotificationStep.sendMulticast);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.sendMulticast,
                    error
                );

                return {
                    message: 'Workspace join rejected notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                    failureTokens: tokens,
                };
            }
        }

        const recordedTokens = tokens ?? [];
        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (!done.includes(EnumNotificationStep.cleanupTokens)) {
            const cleanupSent = this.notificationPushQueue.sendCleanupTokens(
                notificationId,
                userId,
                recordedTokens
            );
            steps.push(EnumNotificationStep.cleanupTokens);
            promises.push(cleanupSent);
        }
        if (!done.includes(EnumNotificationStep.updateSentAt)) {
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                recordedTokens
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const failedSteps: INotificationStepFailure[] = [];
        outcomes.forEach((outcome, index) => {
            const step = steps[index]!;
            if (outcome.status === 'fulfilled') {
                done.push(step);

                return;
            }

            const failure = this.notificationUtil.toStepFailure(
                step,
                outcome.reason
            );
            failedSteps.push(failure);
        });

        return {
            message: 'Workspace join rejected notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
        };
    }
}
