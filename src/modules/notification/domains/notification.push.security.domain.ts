import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushSendOutcome,
    INotificationPushStepResult,
    INotificationSendPushPayload,
    INotificationStepFailure,
    INotificationTemporaryPasswordPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

/** Renders and delivers the password, two-factor and new-device login push messages. */
@Injectable()
export class NotificationPushSecurityDomain {
    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly notificationPushQueue: NotificationPushQueue,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private async sendMulticastStep(
        notificationTokens: string[],
        payload: IFirebasePushPayload,
        failureTokens: string[] | null,
        pendingTokens: string[] | null
    ): Promise<INotificationPushSendOutcome> {
        const recipients = pendingTokens ?? notificationTokens;
        try {
            const result = await this.firebaseService.sendMulticast(
                recipients,
                payload
            );
            const merged = [...(failureTokens ?? []), ...result.failureTokens];
            const pending = result.retryTokens;
            const failure: INotificationStepFailure | null =
                pending.length > 0
                    ? {
                          step: EnumNotificationStep.sendMulticast,
                          error: `${pending.length} tokens pending retry`,
                      }
                    : null;

            return {
                failureTokens: [...new Set(merged)],
                pendingTokens: pending,
                failure,
            };
        } catch (error: unknown) {
            const failure = this.notificationUtil.toStepFailure(
                EnumNotificationStep.sendMulticast,
                error
            );

            return { failureTokens, pendingTokens, failure };
        }
    }

    async processNewDeviceLogin(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationNewDeviceLoginPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null,
        pendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping new login notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
                pendingTokens,
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
        let pending = pendingTokens;
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
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: { device, city, username, loginAt },
            });
            const sent = await this.sendMulticastStep(
                notificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.failureTokens;
            pending = sent.pendingTokens;
            if (sent.failure !== null) {
                return {
                    message: 'New login notification failed',
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    failureTokens: tokens,
                    pendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
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
            message: 'New login notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
            pendingTokens: pending,
        };
    }

    async processResetTwoFactorByAdmin(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null,
        pendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping reset two-factor notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
                pendingTokens,
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
        let pending = pendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: { username },
            });
            const sent = await this.sendMulticastStep(
                notificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.failureTokens;
            pending = sent.pendingTokens;
            if (sent.failure !== null) {
                return {
                    message: 'Reset two-factor notification failed',
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    failureTokens: tokens,
                    pendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
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
            message: 'Reset two-factor notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
            pendingTokens: pending,
        };
    }

    async processTemporaryPasswordByAdmin(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        data: INotificationTemporaryPasswordPushPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null,
        pendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping temporary password notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
                pendingTokens,
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
        let pending = pendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const passwordExpiredAtDate = this.helperDateService.createFromIso(
                data.passwordExpiredAt
            );
            const passwordExpiredAt = this.helperDateService.formatToRFC2822(
                passwordExpiredAtDate
            );
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: { username, passwordExpiredAt },
            });
            const sent = await this.sendMulticastStep(
                notificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.failureTokens;
            pending = sent.pendingTokens;
            if (sent.failure !== null) {
                return {
                    message: 'Temporary password notification failed',
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    failureTokens: tokens,
                    pendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
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
            message: 'Temporary password notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
            pendingTokens: pending,
        };
    }

    async processResetPassword(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null,
        pendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping reset password notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
                pendingTokens,
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
        let pending = pendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: { username },
            });
            const sent = await this.sendMulticastStep(
                notificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.failureTokens;
            pending = sent.pendingTokens;
            if (sent.failure !== null) {
                return {
                    message: 'Reset password notification failed',
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    failureTokens: tokens,
                    pendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
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
            message: 'Reset password notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
            pendingTokens: pending,
        };
    }

    async processForgotPassword(
        {
            notificationTokens,
            username,
            notificationId,
            userId,
        }: INotificationSendPushPayload,
        completedSteps: EnumNotificationStep[],
        failureTokens: string[] | null,
        pendingTokens: string[] | null
    ): Promise<INotificationPushStepResult> {
        const isInitialized = this.firebaseService.isInitialized();
        if (!isInitialized) {
            return {
                message:
                    'Firebase not initialized, skipping forgot password notification',
                completedSteps,
                failedSteps: [],
                failureTokens,
                pendingTokens,
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
        let pending = pendingTokens;
        if (!done.includes(EnumNotificationStep.sendMulticast)) {
            const title = this.messageService.setMessage(notification.title);
            const body = this.messageService.setMessage(notification.body, {
                properties: { username },
            });
            const sent = await this.sendMulticastStep(
                notificationTokens,
                { title, body },
                tokens,
                pending
            );
            tokens = sent.failureTokens;
            pending = sent.pendingTokens;
            if (sent.failure !== null) {
                return {
                    message: 'Forgot password notification failed',
                    completedSteps: done,
                    failedSteps: [sent.failure],
                    failureTokens: tokens,
                    pendingTokens: pending,
                };
            }

            done.push(EnumNotificationStep.sendMulticast);
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
            message: 'Forgot password notification processed',
            completedSteps: done,
            failedSteps,
            failureTokens: tokens,
            pendingTokens: pending,
        };
    }
}
