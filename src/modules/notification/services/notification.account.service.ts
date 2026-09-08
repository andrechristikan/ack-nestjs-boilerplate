import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { INotificationAccountService } from '@modules/notification/interfaces/notification.account.service.interface';
import {
    INotificationEmailSendPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Writes and fans out the sign-up, welcome and verification notifications. */
@Injectable()
export class NotificationAccountService implements INotificationAccountService {
    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userService: UserService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue
    ) {}

    async processWelcomeByAdmin(
        userId: string,
        proceedBy: string,
        data: INotificationWelcomeByAdminPayload
    ): Promise<IQueueResponse> {
        const user = await this.userService.getOneActive(userId);

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
        data: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse> {
        const user = await this.userService.getOneActive(userId);

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
        const user = await this.userService.getOneActive(userId);

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
        const user = await this.userService.getOneActive(userId);

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
        data: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse> {
        const user = await this.userService.getOneActive(userId);

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

    async processVerifiedMobileNumber(
        userId: string,
        data: INotificationVerifiedMobileNumberPayload
    ): Promise<IQueueResponse> {
        const user = await this.userService.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping verified mobile number notification',
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
                EnumNotificationKind.verifiedMobileNumber,
                {
                    id: notificationId,
                    userId: user.id,
                    metadata: {
                        username: user.username,
                        mobileNumber: this.helperStringService.censor(
                            data.mobileNumber
                        ),
                    },
                    createdBy: user.id,
                }
            ),
            this.notificationEmailQueue.sendVerifiedMobileNumber(
                emailPayload,
                data
            ),
        ]);

        return {
            message: 'Mobile number verified notification processed',
            results,
        };
    }
}
