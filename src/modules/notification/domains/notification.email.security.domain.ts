import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { flatten } from 'flat';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the password, two-factor and new-device login emails. */
@Injectable()
export class NotificationEmailSecurityDomain {
    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly defaultTemplateData: Record<string, string>;

    private readonly encryptionSecretKey: string;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService
    ) {
        // AppEnvSchema requires both addresses once AWS SES credentials are set, and
        // AwsSESService.send is a no-op while SES is uninitialized, so neither is read as null.
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        this.supportEmail = this.configService.get<string>('email.support')!;

        this.homeName = this.configService.get<string>('home.name')!;
        this.homeUrl = this.configService.get<string>('home.url')!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;

        this.defaultTemplateData = {
            homeName: this.homeName,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
        };
    }

    async processTemporaryPasswordByAdmin(
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            encryptedPassword,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationTemporaryPasswordEncryptedPayload
    ): Promise<IQueueResponse> {
        const password = this.helperEncryptionService.aes256Decrypt(
            encryptedPassword,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );

        const passwordExpiredAtDate =
            this.helperDateService.createFromIso(passwordExpiredAt);
        const passwordExpiredAtFormatted =
            this.helperDateService.formatToRFC2822(passwordExpiredAtDate);
        const passwordCreatedAtDate =
            this.helperDateService.createFromIso(passwordCreatedAt);
        const passwordCreatedAtFormatted =
            this.helperDateService.formatToRFC2822(passwordCreatedAtDate);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.temporaryPasswordByAdmin,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                password,
                passwordExpiredAt: passwordExpiredAtFormatted,
                passwordCreatedAt: passwordCreatedAtFormatted,
            },
            ...(cc?.length && { cc }),
            ...(bcc?.length && { bcc }),
        });

        return { message: 'Temporary password email processed', result };
    }

    async processChangePassword({
        email,
        username,
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.changePassword,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
            },
            ...(cc?.length && { cc }),
            ...(bcc?.length && { bcc }),
        });

        return { message: 'Change password email processed', result };
    }

    async processResetPassword({
        email,
        username,
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.resetPassword,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
            },
            ...(cc?.length && { cc }),
            ...(bcc?.length && { bcc }),
        });

        return { message: 'Reset password email processed', result };
    }

    async processForgotPassword(
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            expiredAt,
            encryptedLink,
            reference,
            expiredInMinutes,
        }: INotificationForgotPasswordEncryptedPayload
    ): Promise<IQueueResponse> {
        const link = this.helperEncryptionService.aes256Decrypt(
            encryptedLink,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );

        const expiredAtDate = this.helperDateService.createFromIso(expiredAt);
        const expiredAtFormatted =
            this.helperDateService.formatToRFC2822(expiredAtDate);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.forgotPassword,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                link,
                expiredAt: expiredAtFormatted,
                reference,
                expiredInMinutes: String(expiredInMinutes),
            },
            ...(cc?.length && { cc }),
            ...(bcc?.length && { bcc }),
        });

        return { message: 'Forgot password email processed', result };
    }

    async processResetTwoFactorByAdmin({
        email,
        username,
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.resetTwoFactorByAdmin,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
            },
            ...(cc?.length && { cc }),
            ...(bcc?.length && { bcc }),
        });

        return {
            message: 'Reset two factor by admin email processed',
            result,
        };
    }

    async processNewDeviceLogin(
        { email, username, cc, bcc }: INotificationEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            requestLog: { userAgent, ipAddress },
        }: INotificationNewDeviceLoginPayload
    ): Promise<IQueueResponse> {
        const loginAtDate = this.helperDateService.createFromIso(loginAt);
        const loginAtFormatted =
            this.helperDateService.formatToRFC2822(loginAtDate);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.newDeviceLogin,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                loginFrom,
                loginWith,
                loginAt: loginAtFormatted,
                userAgent: flatten(userAgent),
                ipAddress: ipAddress ?? '',
            },
            ...(cc?.length && { cc }),
            ...(bcc?.length && { bcc }),
        });

        return { message: 'New device login email processed', result };
    }
}
