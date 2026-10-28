import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailResult,
    INotificationEmailSendEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageService } from '@common/message/services/message.service';

/** Renders and sends the sign-up, welcome and verification emails. */
@Injectable()
export class NotificationEmailAccountDomain {
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
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly messageService: MessageService
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

    private decryptEmail(encryptedEmail: string, userId: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encryptedEmail,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );
    }

    async processWelcome({
        encryptedEmail,
        username,
        bcc,
        cc,
        userId,
    }: INotificationEmailSendEncryptedPayload): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.welcome,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.welcome'
        );

        return { message, result };
    }

    async processWelcomeSocial({
        encryptedEmail,
        username,
        bcc,
        cc,
        userId,
    }: INotificationEmailSendEncryptedPayload): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.welcomeSocial,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.welcomeSocial'
        );

        return { message, result };
    }

    async processWelcomeByAdmin(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        {
            encryptedPassword,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationWelcomeByAdminEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
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
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.welcomeByAdmin'
        );

        return { message, result };
    }

    async processVerificationEmail(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        {
            expiredAt,
            reference,
            encryptedLink,
            expiredInMinutes,
        }: INotificationVerificationEmailEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const link = this.helperEncryptionService.aes256Decrypt(
            encryptedLink,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );
        const expiredAtDate = this.helperDateService.createFromIso(expiredAt);
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
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.verificationEmail'
        );

        return { message, result };
    }

    async processVerifiedEmail(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        { reference }: INotificationVerifiedEmailPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.verifiedEmail,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                reference,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.verifiedEmail'
        );

        return { message, result };
    }

    async processVerifiedMobileNumber(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        { reference, mobileNumber }: INotificationVerifiedMobileNumberPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
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
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.verifiedMobileNumber'
        );

        return {
            message,
            result,
        };
    }
}
