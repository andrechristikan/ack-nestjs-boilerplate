import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the sign-up, welcome and verification emails. */
@Injectable()
export class NotificationEmailAccountDomain {
    private readonly logger = new Logger(NotificationEmailAccountDomain.name);

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
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            encryptedPassword,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationWelcomeByAdminEncryptedPayload
    ): Promise<IQueueResponse> {
        try {
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
                templateName: EnumNotificationProcess.welcomeByAdmin,
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
            encryptedLink,
            expiredInMinutes,
        }: INotificationVerificationEmailEncryptedPayload
    ): Promise<IQueueResponse> {
        try {
            const link = this.helperEncryptionService.aes256Decrypt(
                encryptedLink,
                this.encryptionSecretKey,
                NotificationPayloadEncryptionPurpose,
                userId
            );
            const expiredAtDate =
                this.helperDateService.createFromIso(expiredAt);
            const expiredAtFormatted =
                this.helperDateService.formatToRFC2822(expiredAtDate);
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
