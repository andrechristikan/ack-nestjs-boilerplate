import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationAcceptTermPolicyPayload,
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
    INotificationInvitePayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkerBulkPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationProcessorService } from '@modules/notification/interfaces/notification.processor.service.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@Injectable()
export class NotificationProcessorService implements INotificationProcessorService {
    private readonly emailBatchSize: number;

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService,
        private readonly notificationPushUtil: NotificationPushUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailUtil: NotificationEmailUtil
    ) {
        this.emailBatchSize = this.configService.get<number>('email.batchSize');
    }

    async processWelcomeByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationWelcomeByAdminPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

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
            this.notificationRepository.createWelcomeByAdmin(
                notificationId,
                user.id,
                user.username,
                proceedBy
            ),
            this.notificationEmailUtil.sendWelcomeByAdmin(emailPayload, data),
        ]);

        return { message: 'Welcome by admin notification processed', results };
    }

    async processWelcome({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

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
            this.notificationRepository.createWelcome(
                welcomeNotificationId,
                verificationEmailNotificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendWelcome(welcomePayload),
            this.notificationEmailUtil.sendVerificationEmail(
                verificationEmailPayload,
                data
            ),
        ]);

        return { message: 'Welcome notification processed', results };
    }

    async processWelcomeSocial({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

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
            this.notificationRepository.createWelcomeSocial(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendWelcomeSocial(emailPayload),
        ]);

        return { message: 'Welcome social notification processed', results };
    }

    async processVerifiedEmail({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerifiedEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

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
            this.notificationRepository.createVerifiedEmail(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendVerifiedEmail(emailPayload, data),
        ]);

        return { message: 'Verified email notification processed', results };
    }

    async processVerificationEmail({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

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
            this.notificationRepository.createVerificationEmail(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendVerificationEmail(
                emailPayload,
                data
            ),
        ]);

        return {
            message: 'Verification email notification processed',
            results,
        };
    }

    async processVerifiedMobileNumber({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerifiedMobileNumberPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

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
            this.notificationRepository.createMobileNumberVerified(
                notificationId,
                user.id,
                user.username,
                data.mobileNumber
            ),
            this.notificationEmailUtil.sendVerifiedMobileNumber(
                emailPayload,
                data
            ),
        ]);

        return {
            message: 'Mobile number verified notification processed',
            results,
        };
    }

    async processTemporaryPasswordByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationTemporaryPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping temporary password by admin notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.createTemporaryPasswordByAdmin(
                notificationId,
                user.id,
                user.username,
                this.helperService.dateCreateFromIso(data.passwordExpiredAt),
                proceedBy
            ),
            this.notificationEmailUtil.sendTemporaryPasswordByAdmin(
                emailPayload,
                data
            ),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices.map(
                    d => d.device.notificationToken
                ),
                username: user.username,
            };

            promises.push(
                this.notificationPushUtil.sendTemporaryPasswordByAdmin(
                    pushPayload,
                    data
                )
            );
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Temporary password by admin notification processed',
            results,
        };
    }

    async processChangePassword({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping change password notification',
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
            this.notificationRepository.createChangePassword(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendChangePassword(emailPayload),
        ]);

        return { message: 'Change password notification processed', results };
    }

    async processInvite({
        data: { userId, data, proceedBy },
    }: Job<
        INotificationWorkerPayload<INotificationInvitePayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        await Promise.all([
            this.notificationRepository.createInvite(
                notificationId,
                user.id,
                user.username,
                proceedBy
            ),
            this.notificationEmailUtil.sendInvite(emailPayload, data),
        ]);

        return { message: 'Invite notification processed' };
    }

    async processForgotPassword({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationForgotPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping forgot password notification',
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
            this.notificationRepository.createForgotPassword(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendForgotPassword(emailPayload, data),
        ]);

        return { message: 'Forgot password notification processed', results };
    }

    async processResetPassword({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
        ]);

        if (!user) {
            return {
                message: 'User not found, skipping reset password notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.createResetPassword(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendResetPassword(emailPayload),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices.map(
                    d => d.device.notificationToken
                ),
                username: user.username,
            };

            promises.push(
                this.notificationPushUtil.sendResetPassword(pushPayload)
            );
        }

        const results = await Promise.allSettled(promises);

        return { message: 'Reset password notification processed', results };
    }

    async processResetTwoFactorByAdmin({
        data: { userId, proceedBy },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping reset two factor by admin notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        const promises = [
            this.notificationRepository.createResetTwoFactorByAdmin(
                notificationId,
                user.id,
                user.username,
                proceedBy
            ),
            this.notificationEmailUtil.sendResetTwoFactorByAdmin(emailPayload),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices.map(
                    d => d.device.notificationToken
                ),
                username: user.username,
            };

            promises.push(
                this.notificationPushUtil.sendResetTwoFactorByAdmin(pushPayload)
            );
        }

        const results = await Promise.allSettled(promises);

        return {
            message: 'Reset two factor by admin notification processed',
            results,
        };
    }

    async processNewDeviceLogin({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationNewDeviceLoginPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceOwnershipRepository.findTokensByUserId(userId),
        ]);

        if (!user) {
            return {
                message:
                    'User not found, skipping new device login notification',
            };
        }

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const device = this.helperService.resolveDevice(
            data.requestLog.userAgent
        );
        const city = this.helperService.resolveCity(
            data.requestLog.geoLocation
        );

        const promises = [
            this.notificationRepository.createNewDeviceLogin(
                notificationId,
                user.id,
                user.username,
                data.loginFrom,
                data.loginWith,
                device,
                city,
                this.helperService.dateCreateFromIso(data.loginAt)
            ),
            this.notificationEmailUtil.sendNewDeviceLogin(emailPayload, data),
        ];

        if (devices.length > 0) {
            const pushPayload: INotificationSendPushPayload = {
                userId,
                notificationId,
                notificationTokens: devices.map(
                    d => d.device.notificationToken
                ),
                username: user.username,
            };

            promises.push(
                this.notificationPushUtil.sendNewDeviceLogin(pushPayload, data)
            );
        }

        const results = await Promise.allSettled(promises);

        return { message: 'New device login notification processed', results };
    }

    async processPublishTermPolicy({
        data: { data, proceedBy },
    }: Job<
        INotificationWorkerBulkPayload<INotificationPublishTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const users = await this.userRepository.findActive();
        const activeSettings =
            await this.notificationRepository.findActiveUserSettingByType(
                users.map(u => u.id),
                EnumNotificationType.transactional,
                [EnumNotificationChannel.email]
            );
        const filteredSettings = new Set(activeSettings.map(s => s.userId));

        const filteredUsers = users.filter(user =>
            filteredSettings.has(user.id)
        );

        if (filteredUsers.length === 0) {
            return {
                message: 'No users to send publish term policy notification',
                userCounts: users.length,
                filteredUserCounts: 0,
                batches: 0,
            };
        }

        const chunks = this.helperService.arrayChunk(
            filteredUsers,
            this.emailBatchSize
        );

        for (const chunk of chunks) {
            const emailPayload: INotificationEmailSendPayload[] = chunk.map(
                user => ({
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    notificationId: this.databaseUtil.createId(),
                })
            );

            await Promise.all([
                this.notificationRepository.createManyPublishTermPolicy(
                    emailPayload,
                    data,
                    proceedBy
                ),
                this.notificationEmailUtil.sendPublishTermPolicy(
                    emailPayload,
                    data
                ),
            ]);
        }

        return {
            message: 'Publish term policy notification processed',
            userCounts: users.length,
            filteredUserCounts: filteredUsers.length,
            batches: chunks.length,
        };
    }

    async processUserAcceptTermPolicy({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationAcceptTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const user = await this.userRepository.findOneActiveById(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping user accept term policy notification',
            };
        }

        const notificationId = this.databaseUtil.createId();

        await this.notificationRepository.createUserAcceptTermPolicy(
            notificationId,
            user.id,
            user.username,
            data.type,
            data.version
        );

        return {
            message: 'User accept term policy notification processed',
        };
    }
}
