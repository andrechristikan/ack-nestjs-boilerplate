import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { NotificationPushDeliveryDomain } from '@modules/notification/domains/notification.push.delivery.domain';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushSendOutcome,
    INotificationPushStepResult,
    INotificationSendPushEncryptedPayload,
    INotificationTemporaryPasswordPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationPushSecurityDomain {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationPushDeliveryDomain: NotificationPushDeliveryDomain,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
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

    async processNewDeviceLogin(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
        data: INotificationNewDeviceLoginPayload,
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
                        process: EnumNotificationPushProcess.newDeviceLogin,
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
                EnumNotificationPushProcess.newDeviceLogin
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const device = this.requestContextService.resolveDevice(
                data.requestLog.userAgent
            );
            const city = this.requestContextService.resolveCity(
                data.requestLog.geoLocation
            );
            const loginAtDate = this.helperDateService.createFromIso(
                data.loginAt
            );
            const loginAt = this.helperDateService.formatToRFC2822(loginAtDate);
            const title = this.messageService.setMessage(
                NotificationKindContract.newDeviceLogin.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.newDeviceLogin.body,
                {
                    properties: { device, city, username, loginAt },
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
                            process: EnumNotificationPushProcess.newDeviceLogin,
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
                EnumNotificationPushProcess.newDeviceLogin
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.newDeviceLogin'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processResetTwoFactorByAdmin(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
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
                            EnumNotificationPushProcess.resetTwoFactorByAdmin,
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
                EnumNotificationPushProcess.resetTwoFactorByAdmin
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(
                NotificationKindContract.resetTwoFactorByAdmin.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.resetTwoFactorByAdmin.body,
                {
                    properties: { username },
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
                                EnumNotificationPushProcess.resetTwoFactorByAdmin,
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
                EnumNotificationPushProcess.resetTwoFactorByAdmin
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.resetTwoFactorByAdmin'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processTemporaryPasswordByAdmin(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
        data: INotificationTemporaryPasswordPushPayload,
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
                            EnumNotificationPushProcess.temporaryPasswordByAdmin,
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
                EnumNotificationPushProcess.temporaryPasswordByAdmin
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const passwordExpiredAtDate = this.helperDateService.createFromIso(
                data.passwordExpiredAt
            );
            const passwordExpiredAt = this.helperDateService.formatToRFC2822(
                passwordExpiredAtDate
            );
            const title = this.messageService.setMessage(
                NotificationKindContract.temporaryPasswordByAdmin.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.temporaryPasswordByAdmin.body,
                {
                    properties: { username, passwordExpiredAt },
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
                                EnumNotificationPushProcess.temporaryPasswordByAdmin,
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
                EnumNotificationPushProcess.temporaryPasswordByAdmin
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.temporaryPasswordByAdmin'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processResetPassword(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
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
                        process: EnumNotificationPushProcess.resetPassword,
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
                EnumNotificationPushProcess.resetPassword
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(
                NotificationKindContract.resetPassword.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.resetPassword.body,
                {
                    properties: { username },
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
                            process: EnumNotificationPushProcess.resetPassword,
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
                EnumNotificationPushProcess.resetPassword
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.resetPassword'
        );

        return {
            message,
            completedSteps: done,
            failedSteps,
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }

    async processForgotPassword(
        {
            encryptedNotificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushEncryptedPayload,
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
                        process: EnumNotificationPushProcess.forgotPassword,
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
                EnumNotificationPushProcess.forgotPassword
            );
            done.push(EnumNotificationStep.updateProcessAt);
        }

        let tokens = encryptedFailureTokens;
        let pending = encryptedPendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(
                NotificationKindContract.forgotPassword.title
            );
            const body = this.messageService.setMessage(
                NotificationKindContract.forgotPassword.body,
                {
                    properties: { username },
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
                            process: EnumNotificationPushProcess.forgotPassword,
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
                EnumNotificationPushProcess.forgotPassword
            );
            steps.push(EnumNotificationStep.updateSentAt);
            promises.push(sentAtUpdated);
        }

        const outcomes = await Promise.allSettled(promises);
        const { completedSteps: settledSteps, failedSteps } =
            this.notificationUtil.foldStepOutcomes(steps, outcomes);
        done.push(...settledSteps);

        const message = this.messageService.setMessage(
            'notification.queue.push.forgotPassword'
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
