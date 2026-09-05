import { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationTemplateWorkspaceService } from '@modules/notification/interfaces/notification.template.workspace.service.interface';
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Manages the SES templates for the workspace invite and join-request emails. */
@Injectable()
export class NotificationTemplateWorkspaceService implements INotificationTemplateWorkspaceService {
    private readonly logger = new Logger(
        NotificationTemplateWorkspaceService.name
    );
    private readonly templatesDir = join(
        process.cwd(),
        'src/modules/notification/templates'
    );

    constructor(private readonly awsSESService: AwsSESService) {}

    async emailImportWorkspaceInvite(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.workspace-invite.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceInvite,
                subject: `Workspace Invitation`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to import workspace invite template'
            );

            return false;
        }
    }

    async emailGetWorkspaceInvite(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceInvite,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(err, 'Failed to get workspace invite template');

            return null;
        }
    }

    async emailDeleteWorkspaceInvite(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceInvite,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to delete workspace invite template'
            );

            return false;
        }
    }

    async emailImportWorkspaceJoinRequest(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.workspace-join-request.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceJoinRequest,
                subject: `New Workspace Join Request`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to import workspace join request template'
            );

            return false;
        }
    }

    async emailGetWorkspaceJoinRequest(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(
                err,
                'Failed to get workspace join request template'
            );

            return null;
        }
    }

    async emailDeleteWorkspaceJoinRequest(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to delete workspace join request template'
            );

            return false;
        }
    }

    async emailImportWorkspaceJoinAccepted(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.workspace-join-accepted.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceJoinAccepted,
                subject: `Workspace Join Request Accepted`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to import workspace join accepted template'
            );

            return false;
        }
    }

    async emailGetWorkspaceJoinAccepted(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(
                err,
                'Failed to get workspace join accepted template'
            );

            return null;
        }
    }

    async emailDeleteWorkspaceJoinAccepted(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to delete workspace join accepted template'
            );

            return false;
        }
    }

    async emailImportWorkspaceJoinRejected(): Promise<boolean> {
        try {
            const templatePath = join(
                this.templatesDir,
                'notification.workspace-join-rejected.template.hbs'
            );

            await this.awsSESService.createTemplate({
                name: EnumNotificationProcess.workspaceJoinRejected,
                subject: `Workspace Join Request Rejected`,
                htmlBody: readFileSync(templatePath, 'utf8'),
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to import workspace join rejected template'
            );

            return false;
        }
    }

    async emailGetWorkspaceJoinRejected(): Promise<GetTemplateCommandOutput | null> {
        try {
            const template = await this.awsSESService.getTemplate({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });
            return template;
        } catch (err: unknown) {
            this.logger.warn(
                err,
                'Failed to get workspace join rejected template'
            );

            return null;
        }
    }

    async emailDeleteWorkspaceJoinRejected(): Promise<boolean> {
        try {
            await this.awsSESService.deleteTemplate({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });

            return true;
        } catch (err: unknown) {
            this.logger.error(
                err,
                'Failed to delete workspace join rejected template'
            );

            return false;
        }
    }
}
