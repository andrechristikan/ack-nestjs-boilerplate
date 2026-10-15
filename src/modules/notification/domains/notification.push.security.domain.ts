import type { IFirebasePushPayload } from '@common/firebase/interfaces/firebase.interface';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushSendOutcome,
    INotificationPushStepResult,
    INotificationSendPushEncryptedPayload,
    INotificationStepFailure,
    INotificationTemporaryPasswordPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Renders and delivers the password, two-factor and new-device login push messages. */
@Injectable()
export class NotificationPushSecurityDomain {
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly notificationRepository: NotificationRepository,
        private readonly messageService: MessageService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly notificationPushQueue: NotificationPushQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    private decryptToken(encryptedToken: string, userId: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encryptedToken,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );
    }

    private async sendMulticastStep(
        userId: string,
        encryptedNotificationTokens: string[],
        payload: IFirebasePushPayload,
        encryptedFailureTokens: string[] | null,
        encryptedPendingTokens: string[] | null
    ): Promise<INotificationPushSendOutcome> {
        const pairs = (
            encryptedPendingTokens ?? encryptedNotificationTokens
        ).map(encrypted => {
            const token = this.decryptToken(encrypted, userId);

            return { encrypted, token };
        });
        const toEncrypted = (tokens: string[]): string[] =>
            pairs
                .filter(pair => tokens.includes(pair.token))
                .map(pair => pair.encrypted);
        try {
            const result = await this.firebaseService.sendMulticast(
                pairs.map(pair => pair.token),
                payload
            );
            const merged = [
                ...(encryptedFailureTokens ?? []),
                ...toEncrypted(result.failureTokens),
            ];
            const pending = toEncrypted(result.retryTokens);
            const failure: INotificationStepFailure | null =
                pending.length > 0
                    ? {
                          step: EnumNotificationStep.sendMulticast,
                          error: `${pending.length} tokens pending retry`,
                      }
                    : null;

            return {
                encryptedFailureTokens: [...new Set(merged)],
                encryptedPendingTokens: pending,
                failure,
            };
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
            return {
                message:
                    'Firebase not initialized, skipping new login notification',
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationRepository.updateProcessAt(
                userId,
                notificationId,
                EnumNotificationChannel.push
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
                return {
                    message: 'New login notification failed',
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
            this.decryptToken(encrypted, userId)
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
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                plainFailureTokens
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
            return {
                message:
                    'Firebase not initialized, skipping reset two-factor notification',
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationRepository.updateProcessAt(
                userId,
                notificationId,
                EnumNotificationChannel.push
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
                return {
                    message: 'Reset two-factor notification failed',
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
            this.decryptToken(encrypted, userId)
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
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                plainFailureTokens
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
            return {
                message:
                    'Firebase not initialized, skipping temporary password notification',
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationRepository.updateProcessAt(
                userId,
                notificationId,
                EnumNotificationChannel.push
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
                return {
                    message: 'Temporary password notification failed',
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
            this.decryptToken(encrypted, userId)
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
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                plainFailureTokens
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
            return {
                message:
                    'Firebase not initialized, skipping reset password notification',
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationRepository.updateProcessAt(
                userId,
                notificationId,
                EnumNotificationChannel.push
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
                return {
                    message: 'Reset password notification failed',
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
            this.decryptToken(encrypted, userId)
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
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                plainFailureTokens
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
            return {
                message:
                    'Firebase not initialized, skipping forgot password notification',
                completedSteps,
                failedSteps: [],
                encryptedFailureTokens,
                encryptedPendingTokens,
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.updateProcessAt)) {
            // Sequential by design: write must not run if an earlier step throws
            await this.notificationRepository.updateProcessAt(
                userId,
                notificationId,
                EnumNotificationChannel.push
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
                return {
                    message: 'Forgot password notification failed',
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
            this.decryptToken(encrypted, userId)
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
            const sentAtUpdated = this.notificationRepository.updateSentAt(
                userId,
                notificationId,
                EnumNotificationChannel.push,
                plainFailureTokens
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
            encryptedFailureTokens: tokens,
            encryptedPendingTokens: pending,
        };
    }
}
