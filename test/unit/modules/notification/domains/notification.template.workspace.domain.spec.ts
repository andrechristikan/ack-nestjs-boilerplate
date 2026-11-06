import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationTemplateWorkspaceProcess } from '@modules/notification/interfaces/notification.interface';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

describe('NotificationTemplateWorkspaceDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const templateDir = join(
        import.meta.dirname,
        '../../../../../src/modules/notification/templates'
    );
    const templates: {
        process: INotificationTemplateWorkspaceProcess;
        file: string;
        subject: string;
        label: string;
    }[] = [
        {
            process: EnumNotificationProcess.workspaceInvite,
            file: 'notification.workspace-invite.template.hbs',
            subject: 'Workspace Invitation',
            label: 'workspace invite',
        },
        {
            process: EnumNotificationProcess.workspaceJoinRequest,
            file: 'notification.workspace-join-request.template.hbs',
            subject: 'New Workspace Join Request',
            label: 'workspace join request',
        },
        {
            process: EnumNotificationProcess.workspaceJoinAccepted,
            file: 'notification.workspace-join-accepted.template.hbs',
            subject: 'Workspace Join Request Accepted',
            label: 'workspace join accepted',
        },
        {
            process: EnumNotificationProcess.workspaceJoinRejected,
            file: 'notification.workspace-join-rejected.template.hbs',
            subject: 'Workspace Join Request Rejected',
            label: 'workspace join rejected',
        },
    ];
    let domain: NotificationTemplateWorkspaceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateWorkspaceDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        domain = module.get(NotificationTemplateWorkspaceDomain);
    });

    describe('emailImport', () => {
        it.each(templates)(
            'creates the $process template from $file',
            async ({ process, file, subject }) => {
                awsSESService.createTemplate.mockResolvedValue({
                    $metadata: {},
                });

                await expect(
                    domain.emailImport(process)
                ).resolves.toBeUndefined();
                expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                    name: process,
                    subject,
                    htmlBody: readFileSync(join(templateDir, file), 'utf8'),
                });
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process import when the create call rejects',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.createTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(domain.emailImport(process)).rejects.toMatchObject(
                    {
                        constructor: AppUnknownException,
                        rawError: error,
                        description: `Failed to import ${label} template`,
                    }
                );
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });

    describe('emailGet', () => {
        it.each(templates)(
            'returns the $process template from SES',
            async ({ process }) => {
                const template: GetTemplateCommandOutput = {
                    $metadata: {},
                    Template: { TemplateName: process },
                };
                awsSESService.getTemplate.mockResolvedValue(template);

                const result = await domain.emailGet(process);

                expect(result).toBe(template);
                expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                    name: process,
                });
            }
        );

        it.each(templates)(
            'returns null for the $process template-not-found answer',
            async ({ process }) => {
                awsSESService.getTemplate.mockRejectedValue(
                    new TemplateDoesNotExistException({
                        message: 'missing',
                        $metadata: {},
                    })
                );

                await expect(domain.emailGet(process)).resolves.toBeNull();
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process get for any other error',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.getTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(domain.emailGet(process)).rejects.toMatchObject({
                    constructor: AppUnknownException,
                    rawError: error,
                    description: `Failed to get ${label} template`,
                });
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });

    describe('emailDelete', () => {
        it.each(templates)(
            'deletes the $process template',
            async ({ process }) => {
                awsSESService.deleteTemplate.mockResolvedValue({
                    $metadata: {},
                });

                await expect(
                    domain.emailDelete(process)
                ).resolves.toBeUndefined();
                expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                    name: process,
                });
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process delete when the delete call rejects',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.deleteTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(domain.emailDelete(process)).rejects.toMatchObject(
                    {
                        constructor: AppUnknownException,
                        rawError: error,
                        description: `Failed to delete ${label} template`,
                    }
                );
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });
});
