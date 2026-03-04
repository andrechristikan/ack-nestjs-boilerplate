import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
    NotificationUserSetting,
} from '@generated/prisma-client';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
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
import { NotificationUtil } from '@modules/notification/utils/notification.util';
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
        private readonly deviceRepository: DeviceRepository,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService,
        private readonly notificationPushUtil: NotificationPushUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailUtil: NotificationEmailUtil,
        private readonly notificationUtil: NotificationUtil
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

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        await Promise.all([
            this.notificationRepository.createWelcomeByAdmin(
                notificationId,
                user.id,
                user.username,
                proceedBy
            ),
            this.notificationEmailUtil.sendWelcomeByAdmin(emailPayload, data),
        ]);

        return { message: 'Welcome by admin notification processed' };
    }

    async processWelcome({
        data: { userId, data, proceedBy },
    }: Job<
        INotificationWorkerPayload<INotificationVerificationEmailPayload>,
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
            this.notificationRepository.createWelcome(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendWelcome(emailPayload),
            this.notificationEmailUtil.sendVerificationEmail(
                emailPayload,
                data
            ),
        ]);

        return { message: 'Welcome notification processed' };
    }

    async processWelcomeSocial({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
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
            this.notificationRepository.createWelcomeSocial(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendWelcomeSocial(emailPayload),
        ]);

        return { message: 'Welcome social notification processed' };
    }

    async processVerifiedEmail({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerifiedEmailPayload>,
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
            this.notificationRepository.createVerifiedEmail(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendVerifiedEmail(emailPayload, data),
        ]);

        return { message: 'Verified email notification processed' };
    }

    async processVerificationEmail({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerificationEmailPayload>,
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

        return { message: 'Verification email notification processed' };
    }

    async processVerifiedMobileNumber({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerifiedMobileNumberPayload>,
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

        return { message: 'Mobile number verified notification processed' };
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
            this.deviceRepository.findByUserId(userId),
        ]);

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const pushPayload: INotificationSendPushPayload = {
            userId,
            notificationId,
            notificationToken: devices.map(d => d.notificationToken),
            username: user.username,
        };

        await Promise.all([
            this.notificationRepository.createTemporaryPasswordByAdmin(
                notificationId,
                user.id,
                user.username,
                proceedBy
            ),
            this.notificationEmailUtil.sendTemporaryPasswordByAdmin(
                emailPayload,
                data
            ),
            this.notificationPushUtil.sendTemporaryPasswordByAdmin(pushPayload),
        ]);

        return {
            message: 'Temporary password by admin notification processed',
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

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };

        await Promise.all([
            this.notificationRepository.createChangePassword(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendChangePassword(emailPayload),
        ]);

        return { message: 'Change password notification processed' };
    }

    async processForgotPassword({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationForgotPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const [user, devices] = await Promise.all([
            this.userRepository.findOneActiveById(userId),
            this.deviceRepository.findByUserId(userId, null, true),
        ]);

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const pushPayload: INotificationSendPushPayload = {
            userId,
            notificationId,
            notificationToken: devices.map(d => d.notificationToken),
            username: user.username,
        };

        await Promise.all([
            this.notificationRepository.createForgotPassword(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendForgotPassword(emailPayload, data),
            this.notificationPushUtil.sendForgotPassword(pushPayload),
        ]);

        return { message: 'Forgot password notification processed' };
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
            this.deviceRepository.findByUserId(userId, null, true),
        ]);

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const pushPayload: INotificationSendPushPayload = {
            userId,
            notificationId,
            notificationToken: devices.map(d => d.notificationToken),
            username: user.username,
        };

        await Promise.all([
            this.notificationRepository.createResetPassword(
                notificationId,
                user.id,
                user.username
            ),
            this.notificationEmailUtil.sendResetPassword(emailPayload),
            this.notificationPushUtil.sendResetPassword(pushPayload),
        ]);

        return { message: 'Reset password notification processed' };
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
            this.deviceRepository.findByUserId(userId, null, true),
        ]);

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const pushPayload: INotificationSendPushPayload = {
            userId,
            notificationId,
            notificationToken: devices.map(d => d.notificationToken),
            username: user.username,
        };

        await Promise.all([
            this.notificationRepository.createResetTwoFactorByAdmin(
                notificationId,
                user.id,
                user.username,
                proceedBy
            ),
            this.notificationEmailUtil.sendResetTwoFactorByAdmin(emailPayload),
            this.notificationPushUtil.sendResetTwoFactorByAdmin(pushPayload),
        ]);

        return { message: 'Reset two factor by admin notification processed' };
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
            this.deviceRepository.findByUserId(userId),
        ]);

        const notificationId = this.databaseUtil.createId();
        const emailPayload: INotificationEmailSendPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
            notificationId,
        };
        const pushPayload: INotificationSendPushPayload = {
            userId,
            notificationId,
            notificationToken: devices.map(d => d.notificationToken),
            username: user.username,
        };

        await Promise.all([
            this.notificationRepository.createNewDeviceLogin(
                notificationId,
                user.id,
                user.username,
                data.loginFrom,
                data.loginWith,
                data.requestLog.userAgent
            ),
            this.notificationEmailUtil.sendNewDeviceLogin(emailPayload, data),
            this.notificationPushUtil.sendNewDeviceLogin(pushPayload, data),
        ]);

        return { message: 'New device login notification processed' };
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
}
