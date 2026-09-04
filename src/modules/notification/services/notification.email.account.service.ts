import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationEmailAccountService } from '@modules/notification/interfaces/notification.email.account.service.interface';
import {
    INotificationEmailSendPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the sign-up, welcome and verification emails. */
@Injectable()
export class NotificationEmailAccountService implements INotificationEmailAccountService {
    private readonly logger = new Logger(NotificationEmailAccountService.name);

    private readonly noreplyEmail: string;
    private readonly supportEmail: string;

    private readonly homeName: string;
    private readonly homeUrl: string;

    private readonly defaultTemplateData: Record<string, string>;

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly userUtil: UserUtil
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

    async processWelcome({
        email,
        username,
        bcc,
        cc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcome,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Welcome email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process welcome email');
            throw err;
        }
    }

    async processWelcomeSocial({
        email,
        username,
        bcc,
        cc,
    }: INotificationEmailSendPayload): Promise<IQueueResponse> {
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcomeSocial,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Welcome social email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process welcome social email');
            throw err;
        }
    }

    async processWelcomeByAdmin(
        { email, username, cc, bcc }: INotificationEmailSendPayload,
        {
            password: passwordString,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationWelcomeByAdminPayload
    ): Promise<IQueueResponse> {
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.welcomeByAdmin,
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

            return { message: 'Create by admin email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process welcome by admin email');
            throw err;
        }
    }

    async processVerificationEmail(
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            expiredAt,
            reference,
            link: encryptedLink,
            expiredInMinutes,
        }: INotificationVerificationEmailPayload
    ): Promise<IQueueResponse> {
        try {
            const link = this.userUtil.decryptedLink(userId, encryptedLink);
            const expiredAtFormatted = this.helperDateService.formatToRFC2822(
                this.helperDateService.createFromIso(expiredAt)
            );
            const expiredInMinutesFormatted = String(expiredInMinutes);

            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.verificationEmail,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    link,
                    reference,
                    expiredAt: expiredAtFormatted,
                    expiredInMinutes: expiredInMinutesFormatted,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Verification email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process verification email');
            throw err;
        }
    }

    async processVerifiedEmail(
        { email, username, cc, bcc }: INotificationEmailSendPayload,
        { reference }: INotificationVerifiedEmailPayload
    ): Promise<IQueueResponse> {
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.verifiedEmail,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    reference,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Email verified email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process verified email');
            throw err;
        }
    }

    async processVerifiedMobileNumber(
        { email, username, cc, bcc }: INotificationEmailSendPayload,
        { reference, mobileNumber }: INotificationVerifiedMobileNumberPayload
    ): Promise<IQueueResponse> {
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.verifiedMobileNumber,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    reference,
                    mobileNumber,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return {
                message: 'Mobile number verified email processed',
                result,
            };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process verified mobile number email'
            );
            throw err;
        }
    }
}
