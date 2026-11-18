import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerificationMobileNumberEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationWelcomeByAdminEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationSmsQueue } from '@modules/notification/queues/notification.sms.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Writes and fans out the sign-up, welcome and verification notifications. */
@Injectable()
export class NotificationAccountDomain {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userDomain: UserDomain,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly notificationSmsQueue: NotificationSmsQueue
    ) {}

    async processWelcomeByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationWelcomeByAdminEncryptedPayload
    ): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping welcome by admin notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.create(
                EnumNotificationKind.welcomeByAdmin,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: proceedBy,
                }
            ),
            this.notificationEmailQueue.sendWelcomeByAdmin(emailPayload, data),
        ]);

        return { message: 'Welcome by admin notification processed', results };
    }

    async processWelcome(
        userId: string,
        data: INotificationVerificationEmailEncryptedPayload
    ): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return { message: 'User not found, skipping welcome notification' };
        }

        const welcomeNotificationId = this.databaseUtil.createId();
        const welcomePayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId: welcomeNotificationId,
        };

        const verificationEmailNotificationId = this.databaseUtil.createId();
        const verificationEmailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId: verificationEmailNotificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.createMany([
                {
                    kind: EnumNotificationKind.welcome,
                    payload: {
                        id: welcomeNotificationId,
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
                {
                    kind: EnumNotificationKind.verificationEmail,
                    payload: {
                        id: verificationEmailNotificationId,
                        userId: user.id,
                        metadata: { username: user.username },
                        createdBy: user.id,
                    },
                },
            ]),
            this.notificationEmailQueue.sendWelcome(welcomePayload),
            this.notificationEmailQueue.sendVerificationEmail(
                verificationEmailPayload,
                data
            ),
        ]);

        return { message: 'Welcome notification processed', results };
    }

    async processWelcomeSocial(userId: string): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message: 'User not found, skipping welcome social notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.create(
                EnumNotificationKind.welcomeSocial,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendWelcomeSocial(emailPayload),
        ]);

        return { message: 'Welcome social notification processed', results };
    }

    async processVerifiedEmail(
        userId: string,
        data: INotificationVerifiedEmailPayload
    ): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message: 'User not found, skipping verified email notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.create(
                EnumNotificationKind.verifiedEmail,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendVerifiedEmail(emailPayload, data),
        ]);

        return { message: 'Verified email notification processed', results };
    }

    async processVerificationEmail(
        userId: string,
        data: INotificationVerificationEmailEncryptedPayload
    ): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping verification email notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const results = await Promise.allSettled([
            this.notificationRepository.create(
                EnumNotificationKind.verificationEmail,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: { username: user.username },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendVerificationEmail(
                emailPayload,
                data
            ),
        ]);

        return {
            message: 'Verification email notification processed',
            results,
        };
    }

    async processVerificationMobileNumber(
        userId: string,
        data: INotificationVerificationMobileNumberEncryptedPayload
    ): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping verification mobile number notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const censoredMobileNumber = this.helperStringService.censor(
            data.phoneNumber
        );

        const notification = await this.notificationRepository.create(
            EnumNotificationKind.verificationMobileNumber,
            {
                id: notificationId,
                userId: user.id,
                metadata: {
                    username: user.username,
                    mobileNumber: censoredMobileNumber,
                },
                createdBy: user.id,
            }
        );

        // Sequential by design: the SMS processor requires the sms delivery row
        await this.notificationSmsQueue.sendVerificationMobileNumber({
            userId: user.id,
            notificationId: notification.id,
            phoneNumber: data.phoneNumber,
            encryptedOtp: data.encryptedOtp,
            expiredInMinutes: data.expiredInMinutes,
            mobileNumberId: data.mobileNumberId,
            reference: data.reference,
        });

        return {
            message: 'Verification mobile number notification processed',
        };
    }
}
