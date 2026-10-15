import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendEncryptedPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationRecipientEncryptedPayload,
    INotificationSendPushEncryptedPayload,
    INotificationStepFailure,
    INotificationStepResult,
    INotificationTemporaryPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';

/** Writes and fans out the password, two-factor and new-device login notifications. */
@Injectable()
export class NotificationSecurityDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async processTemporaryPasswordByAdmin(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationTemporaryPasswordEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Temporary password by admin notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            const passwordExpiredAt = this.helperDateService.createFromIso(
                data.passwordExpiredAt
            );

            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.temporaryPasswordByAdmin,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                passwordExpiredAt,
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
                    message: 'Temporary password by admin notification failed',
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
                this.notificationEmailQueue.sendTemporaryPasswordByAdmin(
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
                this.notificationPushQueue.sendTemporaryPasswordByAdmin(
                    pushPayload,
                    {
                        passwordCreatedAt: data.passwordCreatedAt,
                        passwordExpiredAt: data.passwordExpiredAt,
                    }
                );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
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
            message: 'Temporary password by admin notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processChangePassword(
        userId: string,
        recipient: INotificationRecipientEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Change password notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.changePassword,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: { username: recipient.username },
                            createdBy: userId,
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
                    message: 'Change password notification failed',
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
                this.notificationEmailQueue.sendChangePassword(emailPayload);
            steps.push(EnumNotificationStep.sendEmail);
            promises.push(emailSent);
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
            message: 'Change password notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processForgotPassword(
        userId: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationForgotPasswordEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Forgot password notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.forgotPassword,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: { username: recipient.username },
                            createdBy: userId,
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
                    message: 'Forgot password notification failed',
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
            const emailSent = this.notificationEmailQueue.sendForgotPassword(
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
                this.notificationPushQueue.sendForgotPassword(pushPayload);
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
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
        };
    }

    async processResetPassword(
        userId: string,
        recipient: INotificationRecipientEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Reset password notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.resetPassword,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: { username: recipient.username },
                            createdBy: userId,
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
                    message: 'Reset password notification failed',
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
                this.notificationEmailQueue.sendResetPassword(emailPayload);
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
                this.notificationPushQueue.sendResetPassword(pushPayload);
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
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
        };
    }

    async processResetTwoFactorByAdmin(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Reset two factor by admin notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.resetTwoFactorByAdmin,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: { username: recipient.username },
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
                    message: 'Reset two factor by admin notification failed',
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
                this.notificationEmailQueue.sendResetTwoFactorByAdmin(
                    emailPayload
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
                this.notificationPushQueue.sendResetTwoFactorByAdmin(
                    pushPayload
                );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
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
            message: 'Reset two factor by admin notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processNewDeviceLogin(
        userId: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationNewDeviceLoginPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'New device login notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            const device = this.requestContextService.resolveDevice(
                data.requestLog.userAgent
            );
            const city = this.requestContextService.resolveCity(
                data.requestLog.geoLocation
            );
            const loginAt = this.helperDateService.createFromIso(data.loginAt);

            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.newDeviceLogin,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                loginFrom: data.loginFrom,
                                loginWith: data.loginWith,
                                device,
                                city,
                                loginAt,
                            },
                            createdBy: userId,
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
                    message: 'New device login notification failed',
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
            const emailSent = this.notificationEmailQueue.sendNewDeviceLogin(
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
            const pushSent = this.notificationPushQueue.sendNewDeviceLogin(
                pushPayload,
                data
            );
            steps.push(EnumNotificationStep.sendPush);
            promises.push(pushSent);
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
            message: 'New device login notification processed',
            completedSteps: done,
            failedSteps,
        };
    }
}
