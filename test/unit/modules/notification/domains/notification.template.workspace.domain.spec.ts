import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';

describe('NotificationTemplateWorkspaceDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateWorkspaceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateWorkspaceDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateWorkspaceDomain);
    });

    describe('emailImportWorkspaceInvite', () => {
        it('creates the workspace invite template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWorkspaceInvite();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceInvite,
                subject: 'Workspace Invitation',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWorkspaceInvite();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWorkspaceInvite();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWorkspaceInvite', () => {
        it('deletes the workspace invite template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWorkspaceInvite();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceInvite,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWorkspaceInvite();

            expect(result).toBe(false);
        });
    });

    describe('emailImportWorkspaceJoinRequest', () => {
        it('creates the workspace join request template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWorkspaceJoinRequest();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRequest,
                subject: 'New Workspace Join Request',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWorkspaceJoinRequest();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWorkspaceJoinRequest();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWorkspaceJoinRequest', () => {
        it('deletes the workspace join request template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWorkspaceJoinRequest();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRequest,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWorkspaceJoinRequest();

            expect(result).toBe(false);
        });
    });

    describe('emailImportWorkspaceJoinAccepted', () => {
        it('creates the workspace join accepted template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWorkspaceJoinAccepted();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinAccepted,
                subject: 'Workspace Join Request Accepted',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWorkspaceJoinAccepted();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWorkspaceJoinAccepted();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWorkspaceJoinAccepted', () => {
        it('deletes the workspace join accepted template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWorkspaceJoinAccepted();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinAccepted,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWorkspaceJoinAccepted();

            expect(result).toBe(false);
        });
    });

    describe('emailImportWorkspaceJoinRejected', () => {
        it('creates the workspace join rejected template and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportWorkspaceJoinRejected();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRejected,
                subject: 'Workspace Join Request Rejected',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailImportWorkspaceJoinRejected();

            expect(result).toBe(false);
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

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('missing'));

            const result = await domain.emailGetWorkspaceJoinRejected();

            expect(result).toBeNull();
        });
    });

    describe('emailDeleteWorkspaceJoinRejected', () => {
        it('deletes the workspace join rejected template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeleteWorkspaceJoinRejected();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.workspaceJoinRejected,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(new Error('down'));

            const result = await domain.emailDeleteWorkspaceJoinRejected();

            expect(result).toBe(false);
        });
    });
});
