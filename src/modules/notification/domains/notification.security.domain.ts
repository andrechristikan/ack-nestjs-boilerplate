import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationSendPushPayload,
    INotificationStepFailure,
    INotificationStepResult,
    INotificationTemporaryPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';

/** Writes and fans out the password, two-factor and new-device login notifications. */
@Injectable()
export class NotificationSecurityDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userDomain: UserDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async processTemporaryPasswordByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationTemporaryPasswordEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping temporary password by admin notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
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
                            userId: user.id,
                            metadata: {
                                username: user.username,
                                passwordExpiredAt,
                            },
                            createdBy: proceedBy,
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
        if (!done.includes(EnumNotificationStep.sendEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
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
            devices.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
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
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping change password notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.changePassword,
                        payload: {
                            id: notificationId,
                            userId: user.id,
                            metadata: { username: user.username },
                            createdBy: user.id,
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
        if (!done.includes(EnumNotificationStep.sendEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
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
        data: INotificationForgotPasswordEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping forgot password notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.forgotPassword,
                        payload: {
                            id: notificationId,
                            userId: user.id,
                            metadata: { username: user.username },
                            createdBy: user.id,
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
        if (!done.includes(EnumNotificationStep.sendEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
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
            devices.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
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
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message: 'User not found, skipping reset password notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.resetPassword,
                        payload: {
                            id: notificationId,
                            userId: user.id,
                            metadata: { username: user.username },
                            createdBy: user.id,
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
        if (!done.includes(EnumNotificationStep.sendEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
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
            devices.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
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
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping reset two factor by admin notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.resetTwoFactorByAdmin,
                        payload: {
                            id: notificationId,
                            userId: user.id,
                            metadata: { username: user.username },
                            createdBy: proceedBy,
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
        if (!done.includes(EnumNotificationStep.sendEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
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
            devices.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
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
        data: INotificationNewDeviceLoginPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const [user, devices] = await Promise.all([
            this.userDomain.getOneActive(userId),
            this.deviceDomain.getOwnershipsWithNotificationToken(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping new device login notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
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
                            userId: user.id,
                            metadata: {
                                username: user.username,
                                loginFrom: data.loginFrom,
                                loginWith: data.loginWith,
                                device,
                                city,
                                loginAt,
                            },
                            createdBy: user.id,
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
        if (!done.includes(EnumNotificationStep.sendEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
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
            devices.length > 0 &&
            !done.includes(EnumNotificationStep.sendPush)
        ) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices
                    .map(d => d.device.notificationToken)
                    .filter((t): t is string => t !== null),
                username: user.username,
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
