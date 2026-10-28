import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailResult,
    INotificationEmailSendEncryptedPayload,
    INotificationEmailSendUnregisteredEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Renders and sends the workspace invite and join-request emails. */
@Injectable()
export class NotificationEmailWorkspaceDomain {
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
        private readonly messageService: MessageService,
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

    private decryptEmail(encryptedEmail: string, context: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encryptedEmail,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            context
        );
    }

    async processWorkspaceInvite(
        {
            encryptedEmail,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        {
            workspaceName,
            inviterName,
            workspaceMemberRole,
            encryptedInviteAcceptLink,
            reference,
            expiredAt,
        }: INotificationWorkspaceInviteEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const inviteAcceptLink = this.helperEncryptionService.aes256Decrypt(
            encryptedInviteAcceptLink,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            userId
        );

        const expiredAtDate = this.helperDateService.createFromIso(expiredAt);
        const expiredAtFormatted =
            this.helperDateService.formatToRFC2822(expiredAtDate);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.workspaceInvite,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                workspaceName,
                inviterName,
                workspaceMemberRole,
                inviteAcceptLink,
                reference,
                expiredAt: expiredAtFormatted,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.workspaceInvite'
        );

        return { message, result };
    }

    async processWorkspaceInviteUnregistered(
        { encryptedEmail }: INotificationEmailSendUnregisteredEncryptedPayload,
        {
            workspaceName,
            inviterName,
            workspaceMemberRole,
            encryptedInviteAcceptLink,
            reference,
            expiredAt,
        }: INotificationWorkspaceInviteUnregisteredEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, reference);
        const inviteAcceptLink = this.helperEncryptionService.aes256Decrypt(
            encryptedInviteAcceptLink,
            this.encryptionSecretKey,
            NotificationPayloadEncryptionPurpose,
            reference
        );

        const expiredAtDate = this.helperDateService.createFromIso(expiredAt);
        const expiredAtFormatted =
            this.helperDateService.formatToRFC2822(expiredAtDate);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.workspaceInvite,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                workspaceName,
                inviterName,
                workspaceMemberRole,
                inviteAcceptLink,
                reference,
                expiredAt: expiredAtFormatted,
            },
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.workspaceInviteUnregistered'
        );

        return {
            message,
            result,
        };
    }

    async processWorkspaceJoinRequest(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        {
            workspaceName,
            requesterName,
            encryptedJoinRequestReviewLink,
        }: INotificationWorkspaceJoinRequestEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const joinRequestReviewLink =
            this.helperEncryptionService.aes256Decrypt(
                encryptedJoinRequestReviewLink,
                this.encryptionSecretKey,
                NotificationPayloadEncryptionPurpose,
                userId
            );

        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.workspaceJoinRequest,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                workspaceName,
                requesterName,
                joinRequestReviewLink,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.workspaceJoinRequest'
        );

        return {
            message,
            result,
        };
    }

    async processWorkspaceJoinAccepted(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        { workspaceName }: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.workspaceJoinAccepted,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                workspaceName,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.workspaceJoinAccepted'
        );

        return {
            message,
            result,
        };
    }

    async processWorkspaceJoinRejected(
        {
            encryptedEmail,
            username,
            cc,
            bcc,
            userId,
        }: INotificationEmailSendEncryptedPayload,
        {
            workspaceName,
            rejectReasonCode,
        }: INotificationWorkspaceJoinRejectedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.decryptEmail(encryptedEmail, userId);
        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${rejectReasonCode}`
        );

        const result = await this.awsSESService.send({
            templateName: EnumNotificationProcess.workspaceJoinRejected,
            recipients: [email],
            sender: this.noreplyEmail,
            templateData: {
                ...this.defaultTemplateData,
                username,
                workspaceName,
                rejectReasonLabel,
            },
            ...(cc.length > 0 && { cc }),
            ...(bcc.length > 0 && { bcc }),
        });

        const message = this.messageService.setMessage(
            'notification.queue.email.workspaceJoinRejected'
        );

        return {
            message,
            result,
        };
    }
}
