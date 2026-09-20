import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceInviteUnregisteredEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Renders and sends the workspace invite and join-request emails. */
@Injectable()
export class NotificationEmailWorkspaceDomain {
    private readonly logger = new Logger(NotificationEmailWorkspaceDomain.name);

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

    async processWorkspaceInvite(
        { email, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            workspaceName,
            inviterName,
            workspaceMemberRole,
            encryptedInviteAcceptLink,
            reference,
            expiredAt,
        }: INotificationWorkspaceInviteEncryptedPayload
    ): Promise<IQueueResponse> {
        try {
            const inviteAcceptLink = this.helperEncryptionService.aes256Decrypt(
                encryptedInviteAcceptLink,
                this.encryptionSecretKey,
                NotificationPayloadEncryptionPurpose,
                userId
            );

            const expiredAtDate =
                this.helperDateService.createFromIso(expiredAt);
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
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return { message: 'Workspace invite email processed', result };
        } catch (err: unknown) {
            this.logger.error(err, 'Failed to process workspace invite email');
            throw err;
        }
    }

    async processWorkspaceInviteUnregistered(
        { email }: INotificationEmailSendUnregisteredPayload,
        {
            workspaceName,
            inviterName,
            workspaceMemberRole,
            encryptedInviteAcceptLink,
            reference,
            expiredAt,
        }: INotificationWorkspaceInviteUnregisteredEncryptedPayload
    ): Promise<IQueueResponse> {
        try {
            const inviteAcceptLink = this.helperEncryptionService.aes256Decrypt(
                encryptedInviteAcceptLink,
                this.encryptionSecretKey,
                NotificationPayloadEncryptionPurpose,
                reference
            );

            const expiredAtDate =
                this.helperDateService.createFromIso(expiredAt);
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

            return {
                message: 'Workspace invite (unregistered) email processed',
                result,
            };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process workspace invite (unregistered) email'
            );
            throw err;
        }
    }

    async processWorkspaceJoinRequest(
        { email, username, cc, bcc, userId }: INotificationEmailSendPayload,
        {
            workspaceName,
            requesterName,
            encryptedJoinRequestReviewLink,
        }: INotificationWorkspaceJoinRequestEncryptedPayload
    ): Promise<IQueueResponse> {
        try {
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
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return {
                message: 'Workspace join request email processed',
                result,
            };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process workspace join request email'
            );
            throw err;
        }
    }

    async processWorkspaceJoinAccepted(
        { email, username, cc, bcc }: INotificationEmailSendPayload,
        { workspaceName }: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<IQueueResponse> {
        try {
            const result = await this.awsSESService.send({
                templateName: EnumNotificationProcess.workspaceJoinAccepted,
                recipients: [email],
                sender: this.noreplyEmail,
                templateData: {
                    ...this.defaultTemplateData,
                    username,
                    workspaceName,
                },
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return {
                message: 'Workspace join accepted email processed',
                result,
            };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process workspace join accepted email'
            );
            throw err;
        }
    }

    async processWorkspaceJoinRejected(
        { email, username, cc, bcc }: INotificationEmailSendPayload,
        {
            workspaceName,
            rejectReasonCode,
        }: INotificationWorkspaceJoinRejectedPayload
    ): Promise<IQueueResponse> {
        try {
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
                ...(cc?.length && { cc }),
                ...(bcc?.length && { bcc }),
            });

            return {
                message: 'Workspace join rejected email processed',
                result,
            };
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to process workspace join rejected email'
            );
            throw err;
        }
    }
}
