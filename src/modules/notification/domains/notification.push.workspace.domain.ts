import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationPushDeliveryDomain } from '@modules/notification/domains/notification.push.delivery.domain';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushSendOutcome,
    INotificationPushStepResult,
    INotificationSendPushEncryptedPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

/** Renders and delivers the workspace invite and join-request push messages. */
@Injectable()
export class NotificationPushWorkspaceDomain {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationPushDeliveryDomain: NotificationPushDeliveryDomain,
        private readonly messageService: MessageService,
        private readonly notificationPushQueue: NotificationPushQueue,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private async sendMulticastStep(
        userId: string,
        encryptedNotificationTokens: string[],
        payload: IFirebasePushPayload,
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushSendOutcome> {
        const pairs = this.notificationUtil.toTokenPairs(
            userId,
            encryptedPendingTokens ?? encryptedNotificationTokens
        );
        try {
            const result = await this.firebaseService.sendMulticast(
                pairs.map(pair => pair.token),
                payload
            );

            return this.notificationUtil.toMulticastOutcome(
                pairs,
                result,
                encryptedFailureTokens
            );
        } catch (error: unknown) {
            const failure = this.notificationUtil.toStepFailure(
                EnumNotificationStep.sendMulticast,
                error
            );

            return { encryptedFailureTokens, encryptedPendingTokens, failure };
        }
    }

    async processWorkspaceInvite(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
        data: INotificationWorkspaceInvitePushPayload,
        completedSteps: EnumNotificationStep[],
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.firebaseNotInitialized',
                {
                    properties: {
                        process: EnumNotificationPushProcess.workspaceInvite,
                    },
                }
            );

            return {
                message,
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationPushDeliveryDomain.stampProcessed(
                notificationId,
                EnumNotificationPushProcess.workspaceInvite
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(
                NotificationKindContract.workspaceInvite.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.workspaceInvite.body,
                {
                    properties: {
                        username,
                        workspaceName: data.workspaceName,
                        inviterName: data.inviterName,
                    },
                }
            );
            const sent = await this.sendMulticastStep(
                userId,
                encryptedNotificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.encryptedFailureTokens;
            pending = sent.encryptedPendingTokens;
            if (sent.failure !== null) {
                const message = this.messageService.setMessage(
                    'notification.queue.push.error.failed',
                    {
                        properties: {
                            process:
                                EnumNotificationPushProcess.workspaceInvite,
                        },
                    }
                );

                return {
                    message,
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    encryptedFailureTokens: tokens,
                    encryptedPendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
        }

        const recordedTokens = tokens ?? [];
        const plainFailureTokens = recordedTokens.map(encrypted =>
            this.notificationUtil.decryptPayload(encrypted, userId)
        );
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
            const sentAtUpdated = this.notificationPushDeliveryDomain.stampSent(
                notificationId,
                plainFailureTokens,
                EnumNotificationPushProcess.workspaceInvite
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.workspaceInvite'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processWorkspaceJoinRequest(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
        data: INotificationWorkspaceJoinRequestPushPayload,
        completedSteps: EnumNotificationStep[],
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.firebaseNotInitialized',
                {
                    properties: {
                        process:
                            EnumNotificationPushProcess.workspaceJoinRequest,
                    },
                }
            );

            return {
                message,
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationPushDeliveryDomain.stampProcessed(
                notificationId,
                EnumNotificationPushProcess.workspaceJoinRequest
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(
                NotificationKindContract.workspaceJoinRequest.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.workspaceJoinRequest.body,
                {
                    properties: {
                        username,
                        workspaceName: data.workspaceName,
                        requesterName: data.requesterName,
                    },
                }
            );
            const sent = await this.sendMulticastStep(
                userId,
                encryptedNotificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.encryptedFailureTokens;
            pending = sent.encryptedPendingTokens;
            if (sent.failure !== null) {
                const message = this.messageService.setMessage(
                    'notification.queue.push.error.failed',
                    {
                        properties: {
                            process:
                                EnumNotificationPushProcess.workspaceJoinRequest,
                        },
                    }
                );

                return {
                    message,
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    encryptedFailureTokens: tokens,
                    encryptedPendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
        }

        const recordedTokens = tokens ?? [];
        const plainFailureTokens = recordedTokens.map(encrypted =>
            this.notificationUtil.decryptPayload(encrypted, userId)
        );
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
            const sentAtUpdated = this.notificationPushDeliveryDomain.stampSent(
                notificationId,
                plainFailureTokens,
                EnumNotificationPushProcess.workspaceJoinRequest
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.workspaceJoinRequest'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processWorkspaceJoinAccepted(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
        data: INotificationWorkspaceJoinAcceptedPayload,
        completedSteps: EnumNotificationStep[],
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.firebaseNotInitialized',
                {
                    properties: {
                        process:
                            EnumNotificationPushProcess.workspaceJoinAccepted,
                    },
                }
            );

            return {
                message,
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationPushDeliveryDomain.stampProcessed(
                notificationId,
                EnumNotificationPushProcess.workspaceJoinAccepted
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(
                NotificationKindContract.workspaceJoinAccepted.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.workspaceJoinAccepted.body,
                {
                    properties: {
                        username,
                        workspaceName: data.workspaceName,
                    },
                }
            );
            const sent = await this.sendMulticastStep(
                userId,
                encryptedNotificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.encryptedFailureTokens;
            pending = sent.encryptedPendingTokens;
            if (sent.failure !== null) {
                const message = this.messageService.setMessage(
                    'notification.queue.push.error.failed',
                    {
                        properties: {
                            process:
                                EnumNotificationPushProcess.workspaceJoinAccepted,
                        },
                    }
                );

                return {
                    message,
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    encryptedFailureTokens: tokens,
                    encryptedPendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
        }

        const recordedTokens = tokens ?? [];
        const plainFailureTokens = recordedTokens.map(encrypted =>
            this.notificationUtil.decryptPayload(encrypted, userId)
        );
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
            const sentAtUpdated = this.notificationPushDeliveryDomain.stampSent(
                notificationId,
                plainFailureTokens,
                EnumNotificationPushProcess.workspaceJoinAccepted
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.workspaceJoinAccepted'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processWorkspaceJoinRejected(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
        data: INotificationWorkspaceJoinRejectedPayload,
        completedSteps: EnumNotificationStep[],
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            const message = this.messageService.setMessage(
                'notification.queue.push.error.firebaseNotInitialized',
                {
                    properties: {
                        process:
                            EnumNotificationPushProcess.workspaceJoinRejected,
                    },
                }
            );

            return {
                message,
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationPushDeliveryDomain.stampProcessed(
                notificationId,
                EnumNotificationPushProcess.workspaceJoinRejected
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const rejectReasonLabel = this.messageService.setMessage(
                `notification.rejectReason.${data.rejectReasonCode}`
            );
            const title = this.messageService.setMessage(
                NotificationKindContract.workspaceJoinRejected.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.workspaceJoinRejected.body,
                {
                    properties: {
                        username,
                        workspaceName: data.workspaceName,
                        rejectReasonLabel,
                    },
                }
            );
            const sent = await this.sendMulticastStep(
                userId,
                encryptedNotificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.encryptedFailureTokens;
            pending = sent.encryptedPendingTokens;
            if (sent.failure !== null) {
                const message = this.messageService.setMessage(
                    'notification.queue.push.error.failed',
                    {
                        properties: {
                            process:
                                EnumNotificationPushProcess.workspaceJoinRejected,
                        },
                    }
                );

                return {
                    message,
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    encryptedFailureTokens: tokens,
                    encryptedPendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
        }

        const recordedTokens = tokens ?? [];
        const plainFailureTokens = recordedTokens.map(encrypted =>
            this.notificationUtil.decryptPayload(encrypted, userId)
        );
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
            const sentAtUpdated = this.notificationPushDeliveryDomain.stampSent(
                notificationId,
                plainFailureTokens,
                EnumNotificationPushProcess.workspaceJoinRejected
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.workspaceJoinRejected'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }
}
