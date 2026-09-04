import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationEmailSecurityService } from '@modules/notification/interfaces/notification.email.security.service.interface';
import {
    INotificationEmailSendPayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { flatten } from 'flat';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the password, two-factor and new-device login emails. */
@Injectable()
export class NotificationEmailSecurityService implements INotificationEmailSecurityService {
    private readonly logger = new Logger(NotificationEmailSecurityService.name);

    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly userUtil: UserUtil,
        private readonly authUtil: AuthUtil
    ) {
        this.noreplyEmail = this.configService.get<string>('email.noreply')!;
        this.supportEmail = this.configService.get<string>('email.support')!;

        this.homeName = this.configService.get<string>('home.name')!;
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.defaultTemplateData = {
            homeName: this.homeName,
            supportEmail: this.supportEmail,
            homeUrl: this.homeUrl,
        };
    }

    async processTemporaryPasswordByAdmin(
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            password: encryptedPasswordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationTemporaryPasswordPayload
    ): Promise<IQueueResponse> {
        try {
            const passwordString = this.authUtil.decryptPassword(
                userId,
                encryptedPasswordString
            );

            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.temporaryPasswordByAdmin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    password: passwordString,
                    passwordExpiredAt: this.helperDateService.formatToRFC2822(
                        this.helperDateService.createFromIso(passwordExpiredAt)
                    ),
                    passwordCreatedAt: this.helperDateService.formatToRFC2822(
                        this.helperDateService.createFromIso(passwordCreatedAt)
                    ),
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Temporary password email processed', result };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process temporary password email'
            );
            throw err;
        }
    }

    async processChangePassword({
        email,
        username,
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
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
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process change password email');
            throw err;
        }
    }

    async processResetPassword({
        email,
        username,
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
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
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process reset password email');
            throw err;
        }
    }

    async processForgotPassword(
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            expiredAt,
            link: encryptedLink,
            reference,
            expiredInMinutes,
        }: INotificationForgotPasswordPayload
    ): Promise<IQueueResponse> {
        try {
            const link = this.userUtil.decryptedLink(userId, encryptedLink);

            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.forgotPassword,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    link,
                    expiredAt: this.helperDateService.formatToRFC2822(
                        this.helperDateService.createFromIso(expiredAt)
                    ),
                    reference,
                    expiredInMinutes: String(expiredInMinutes),
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Forgot password email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process forgot password email');
            throw err;
        }
    }

    async processResetTwoFactorByAdmin({
        email,
        username,
        cc,
        bcc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
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
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process reset two factor by admin email'
            );
            throw err;
        }
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
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.newDeviceLogin,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    loginFrom,
                    loginWith,
                    loginAt: this.helperDateService.formatToRFC2822(
                        this.helperDateService.createFromIso(loginAt)
                    ),
                    userAgent: flatten(userAgent),
                    ipAddress: ipAddress ?? '',
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'New device login email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process new device login email');
            throw err;
        }
    }
}
