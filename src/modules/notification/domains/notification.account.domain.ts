import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationStepFailure,
    INotificationStepResult,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';

/** Writes and fans out the sign-up, welcome and verification notifications. */
@Injectable()
export class NotificationAccountDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userDomain: UserDomain,
        private readonly helperStringService: HelperStringService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue
    ) {}

    async processWelcomeByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationWelcomeByAdminEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping welcome by admin notification',
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
                        kind: EnumNotificationKind.welcomeByAdmin,
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
                    message: 'Welcome by admin notification failed',
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
            const emailSent = this.notificationEmailQueue.sendWelcomeByAdmin(
                emailPayload,
                data
            );
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
            message: 'Welcome by admin notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processWelcome(
        userId: string,
        data: INotificationVerificationEmailEncryptedPayload,
        notificationId: string,
        verificationNotificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message: 'User not found, skipping welcome notification',
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
                        kind: EnumNotificationKind.welcome,
                        payload: {
                            id: notificationId,
                            userId: user.id,
                            metadata: { username: user.username },
                            createdBy: user.id,
                        },
                    },
                    {
                        kind: EnumNotificationKind.verificationEmail,
                        payload: {
                            id: verificationNotificationId,
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
                    message: 'Welcome notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (!done.includes(EnumNotificationStep.sendWelcomeEmail)) {
            const welcomePayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
                notificationId,
                cc: [],
                bcc: [],
            };
            const welcomeSent =
                this.notificationEmailQueue.sendWelcome(welcomePayload);
            steps.push(EnumNotificationStep.sendWelcomeEmail);
            promises.push(welcomeSent);
        }

        if (!done.includes(EnumNotificationStep.sendVerificationEmail)) {
            const verificationEmailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
                notificationId: verificationNotificationId,
                cc: [],
                bcc: [],
            };
            const verificationSent =
                this.notificationEmailQueue.sendVerificationEmail(
                    verificationEmailPayload,
                    data
                );
            steps.push(EnumNotificationStep.sendVerificationEmail);
            promises.push(verificationSent);
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
            message: 'Welcome notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processWelcomeSocial(
        userId: string,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message: 'User not found, skipping welcome social notification',
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
                        kind: EnumNotificationKind.welcomeSocial,
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
                    message: 'Welcome social notification failed',
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
                this.notificationEmailQueue.sendWelcomeSocial(emailPayload);
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
            message: 'Welcome social notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processVerifiedEmail(
        userId: string,
        data: INotificationVerifiedEmailPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message: 'User not found, skipping verified email notification',
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
                        kind: EnumNotificationKind.verifiedEmail,
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
                    message: 'Verified email notification failed',
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
            const emailSent = this.notificationEmailQueue.sendVerifiedEmail(
                emailPayload,
                data
            );
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
            message: 'Verified email notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processVerificationEmail(
        userId: string,
        data: INotificationVerificationEmailEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping verification email notification',
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
                        kind: EnumNotificationKind.verificationEmail,
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
                    message: 'Verification email notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (!done.includes(EnumNotificationStep.sendVerificationEmail)) {
            const emailPayload: INotificationEmailSendPayload = {
                userId: user.id,
                email: user.email,
                username: user.username,
                notificationId,
                cc: [],
                bcc: [],
            };
            const emailSent = this.notificationEmailQueue.sendVerificationEmail(
                emailPayload,
                data
            );
            steps.push(EnumNotificationStep.sendVerificationEmail);
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
            message: 'Verification email notification processed',
            completedSteps: done,
            failedSteps,
        };
    }

    async processVerifiedMobileNumber(
        userId: string,
        data: INotificationVerifiedMobileNumberPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping verified mobile number notification',
                completedSteps,
                failedSteps: [],
            };
        }

        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.createNotification)) {
            const censoredMobileNumber = this.helperStringService.censor(
                data.mobileNumber
            );

            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.verifiedMobileNumber,
                        payload: {
                            id: notificationId,
                            userId: user.id,
                            metadata: {
                                username: user.username,
                                mobileNumber: censoredMobileNumber,
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
                    message: 'Mobile number verified notification failed',
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
                this.notificationEmailQueue.sendVerifiedMobileNumber(
                    emailPayload,
                    data
                );
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
            message: 'Mobile number verified notification processed',
            completedSteps: done,
            failedSteps,
        };
    }
}
