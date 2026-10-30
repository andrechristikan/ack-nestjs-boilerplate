import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
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
import { NotificationUtil } from '@modules/notification/utils/notification.util';
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

    async processWorkspaceInvite(
        {
            encryptedEmail,
            cc,
            bcc,
            userId,
            notificationId,
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
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        const inviteAcceptLink = this.notificationUtil.decryptPayload(
            encryptedInviteAcceptLink,
            userId
        );

        const expiredAtDate = this.helperDateService.createFromIso(expiredAt);
        const expiredAtFormatted =
            this.helperDateService.formatToRFC2822(expiredAtDate);
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            reference
        );
        const inviteAcceptLink = this.notificationUtil.decryptPayload(
            encryptedInviteAcceptLink,
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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        {
            workspaceName,
            requesterName,
            encryptedJoinRequestReviewLink,
        }: INotificationWorkspaceJoinRequestEncryptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        const joinRequestReviewLink = this.notificationUtil.decryptPayload(
            encryptedJoinRequestReviewLink,
            userId
        );

        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        { workspaceName }: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

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
            notificationId,
        }: INotificationEmailSendEncryptedPayload,
        {
            workspaceName,
            rejectReasonCode,
        }: INotificationWorkspaceJoinRejectedPayload
    ): Promise<INotificationEmailResult> {
        const email = this.notificationUtil.decryptPayload(
            encryptedEmail,
            userId
        );
        const rejectReasonLabel = this.messageService.setMessage(
            `notification.rejectReason.${rejectReasonCode}`
        );

        // Sequential by design: processedAt is stamped before the SES call and sentAt after its success
        await this.stampProcessed(notificationId);
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
        await this.stampSent(notificationId);

        const message = this.messageService.setMessage(
            'notification.queue.email.workspaceJoinRejected'
        );

        return {
            message,
            result,
        };
    }
}
