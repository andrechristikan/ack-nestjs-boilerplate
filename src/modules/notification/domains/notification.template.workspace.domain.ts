import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES templates for the workspace invite and join-request emails. */
@Injectable()
export class NotificationTemplateWorkspaceDomain {
    constructor(private readonly awsSESService: AwsSESService) {}

    async emailImportWorkspaceInvite(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.workspace-invite.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceInvite,
                subject: `Workspace Invitation`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import workspace invite template'
            );
        }
    }

    async emailGetWorkspaceInvite(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceInvite,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get workspace invite template'
            );
        }
    }

    async emailDeleteWorkspaceInvite(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceInvite,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete workspace invite template'
            );
        }
    }

    async emailImportWorkspaceJoinRequest(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.workspace-join-request.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceJoinRequest,
                subject: `New Workspace Join Request`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import workspace join request template'
            );
        }
    }

    async emailGetWorkspaceJoinRequest(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get workspace join request template'
            );
        }
    }

    async emailDeleteWorkspaceJoinRequest(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete workspace join request template'
            );
        }
    }

    async emailImportWorkspaceJoinAccepted(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.workspace-join-accepted.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceJoinAccepted,
                subject: `Workspace Join Request Accepted`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import workspace join accepted template'
            );
        }
    }

    async emailGetWorkspaceJoinAccepted(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get workspace join accepted template'
            );
        }
    }

    async emailDeleteWorkspaceJoinAccepted(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete workspace join accepted template'
            );
        }
    }

    async emailImportWorkspaceJoinRejected(): Promise<void> {
        try {
            const templatePath = join(
                import.meta.dirname,
                '../templates',
                'notification.workspace-join-rejected.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceJoinRejected,
                subject: `Workspace Join Request Rejected`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to import workspace join rejected template'
            );
        }
    }

    async emailGetWorkspaceJoinRejected(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });
            return template;
        } catch (err: unknown) {
            if (err instanceof TemplateDoesNotExistException) {
                return null;
            }

            throw new AppUnknownException(
                err,
                'Failed to get workspace join rejected template'
            );
        }
    }

    async emailDeleteWorkspaceJoinRejected(): Promise<void> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });
        } catch (err: unknown) {
            throw new AppUnknownException(
                err,
                'Failed to delete workspace join rejected template'
            );
        }
    }
}
