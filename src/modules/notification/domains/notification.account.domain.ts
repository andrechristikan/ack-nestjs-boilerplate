import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreateEntry,
    INotificationEmailSendEncryptedPayload,
    INotificationRecipientEncryptedPayload,
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
import { Injectable } from '@nestjs/common';

/** Writes and fans out the sign-up, welcome and verification notifications. */
@Injectable()
export class NotificationAccountDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly helperStringService: HelperStringService,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue
    ) {}

    async processWelcomeByAdmin(
        userId: string,
        proceedBy: string,
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationWelcomeByAdminEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Welcome by admin notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.welcomeByAdmin,
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
                    message: 'Welcome by admin notification failed',
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
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationVerificationEmailEncryptedPayload,
        notificationId: string,
        verificationNotificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (!done.includes(EnumNotificationStep.createNotification)) {
            const { pendingChannels, deliveredChannels } =
                NotificationKindContract.verificationEmail;
            const welcomeEntries: INotificationCreateEntry[] =
                recipient.channels.length > 0
                    ? [
                          {
                              kind: EnumNotificationKind.welcome,
                              payload: {
                                  id: notificationId,
                                  userId,
                                  metadata: { username: recipient.username },
                                  createdBy: userId,
                                  channels: recipient.channels,
                              },
                          },
                      ]
                    : [];

            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    ...welcomeEntries,
                    {
                        kind: EnumNotificationKind.verificationEmail,
                        payload: {
                            id: verificationNotificationId,
                            userId,
                            metadata: { username: recipient.username },
                            createdBy: userId,
                            channels: [
                                ...pendingChannels,
                                ...deliveredChannels,
                            ],
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
        if (
            recipient.channels.includes(EnumNotificationChannel.email) &&
            !done.includes(EnumNotificationStep.sendWelcomeEmail)
        ) {
            const welcomePayload: INotificationEmailSendEncryptedPayload = {
                userId,
                encryptedEmail: recipient.encryptedEmail,
                username: recipient.username,
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
            const verificationEmailPayload: INotificationEmailSendEncryptedPayload =
                {
                    userId,
                    encryptedEmail: recipient.encryptedEmail,
                    username: recipient.username,
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
        recipient: INotificationRecipientEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Welcome social notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.welcomeSocial,
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
                    message: 'Welcome social notification failed',
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
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationVerifiedEmailPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Verified email notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.verifiedEmail,
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
                    message: 'Verified email notification failed',
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
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationVerificationEmailEncryptedPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Verification email notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                // Sequential by design: gate before the work it guards
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.verificationEmail,
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
                    message: 'Verification email notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const steps: EnumNotificationStep[] = [];
        const promises: Promise<void>[] = [];
        if (
            recipient.channels.includes(EnumNotificationChannel.email) &&
            !done.includes(EnumNotificationStep.sendVerificationEmail)
        ) {
            const emailPayload: INotificationEmailSendEncryptedPayload = {
                userId,
                encryptedEmail: recipient.encryptedEmail,
                username: recipient.username,
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
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationVerifiedMobileNumberPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'Verified mobile number notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

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
                            userId,
                            metadata: {
                                username: recipient.username,
                                mobileNumber: censoredMobileNumber,
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
                    message: 'Mobile number verified notification failed',
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
