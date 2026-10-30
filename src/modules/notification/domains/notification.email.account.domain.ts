import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailResult,
    INotificationEmailSendEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
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

    constructor(
        private readonly awsSESService: AwsSESService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService
    ) {
        // AppEnvSchema requires both addresses once AWS SES credentials are set, and
        // AwsSESService.send is a no-op while SES is uninitialized, so neither is read as null.
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

    private async stampProcessed(notificationId: string): Promise<void> {
        const processedAt = this.helperDateService.create();
        await this.notificationRepository.updateDeliveryProcessedAt(
            notificationId,
            EnumNotificationChannel.email,
            processedAt
        );
    }

    private async stampSent(notificationId: string): Promise<void> {
        const sentAt = this.helperDateService.create();
        await this.notificationRepository.updateDeliverySentAt(
            notificationId,
            EnumNotificationChannel.email,
            sentAt,
            []
        );
    }

    async processWelcome({
        encryptedEmail,
        username,
        bcc,
        cc,
        userId,
        notificationId,
    }: INotificationEmailSendEncryptedPayload): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
        notificationId,
    }: INotificationEmailSendEncryptedPayload): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        {
            encryptedPassword,
            passwordExpiredAt,
            passwordCreatedAt,
        }: INotificationWelcomeByAdminEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        const password = this.notificationUtil.decryptPayload(
            encryptedPassword,
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
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        {
            expiredAt,
            reference,
            encryptedLink,
            expiredInMinutes,
        }: INotificationVerificationEmailEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        const link = this.notificationUtil.decryptPayload(
            encryptedLink,
            userId
        );
        const expiredAtDate = this.helperDateService.createFromIso(expiredAt);
        const expiredAtFormatted =
            this.helperDateService.formatToRFC2822(expiredAtDate);
        const expiredInMinutesFormatted = String(expiredInMinutes);

        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        { reference }: INotificationVerifiedEmailPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        { reference, mobileNumber }: INotificationVerifiedMobileNumberPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

        const message = this.messageService.setMessage(
            'notification.queue.email.verifiedMobileNumber'
        );

        return {
            message,
            result,
        };
    }
}
