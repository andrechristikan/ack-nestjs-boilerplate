import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationTemplateWorkspaceDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateWorkspaceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationTemplateWorkspaceDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateWorkspaceDomain);
    });

    describe('emailImportWorkspaceInvite', () => {
        it('creates the workspace invite template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportWorkspaceInvite()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceInvite,
                subject: 'Workspace Invitation',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportWorkspaceInvite()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWorkspaceInvite', () => {
        it('returns the workspace invite template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'workspaceInvite' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWorkspaceInvite();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceInvite,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(domain.emailGetWorkspaceInvite()).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetWorkspaceInvite()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteWorkspaceInvite', () => {
        it('deletes the workspace invite template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteWorkspaceInvite()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceInvite,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteWorkspaceInvite()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportWorkspaceJoinRequest', () => {
        it('creates the workspace join request template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportWorkspaceJoinRequest()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRequest,
                subject: 'New Workspace Join Request',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportWorkspaceJoinRequest()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWorkspaceJoinRequest', () => {
        it('returns the workspace join request template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'workspaceJoinRequest' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWorkspaceJoinRequest();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetWorkspaceJoinRequest()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetWorkspaceJoinRequest()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteWorkspaceJoinRequest', () => {
        it('deletes the workspace join request template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteWorkspaceJoinRequest()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteWorkspaceJoinRequest()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportWorkspaceJoinAccepted', () => {
        it('creates the workspace join accepted template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportWorkspaceJoinAccepted()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinAccepted,
                subject: 'Workspace Join Request Accepted',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportWorkspaceJoinAccepted()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWorkspaceJoinAccepted', () => {
        it('returns the workspace join accepted template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'workspaceJoinAccepted' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWorkspaceJoinAccepted();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetWorkspaceJoinAccepted()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetWorkspaceJoinAccepted()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteWorkspaceJoinAccepted', () => {
        it('deletes the workspace join accepted template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteWorkspaceJoinAccepted()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteWorkspaceJoinAccepted()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailImportWorkspaceJoinRejected', () => {
        it('creates the workspace join rejected template', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportWorkspaceJoinRejected()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRejected,
                subject: 'Workspace Join Request Rejected',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportWorkspaceJoinRejected()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailGetWorkspaceJoinRejected', () => {
        it('returns the workspace join rejected template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'workspaceJoinRejected' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetWorkspaceJoinRejected();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });
        });

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetWorkspaceJoinRejected()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetWorkspaceJoinRejected()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeleteWorkspaceJoinRejected', () => {
        it('deletes the workspace join rejected template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeleteWorkspaceJoinRejected()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeleteWorkspaceJoinRejected()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });
});
