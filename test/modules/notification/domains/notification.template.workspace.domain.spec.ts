import { readFileSync } from 'fs';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { NotificationTemplateWorkspaceDomain } from '@modules/notification/domains/notification.template.workspace.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';

describe('NotificationTemplateWorkspaceDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const service = new NotificationTemplateWorkspaceDomain(awsSESService);
    const cases = [
        [
            'WorkspaceInvite',
            EnumNotificationProcess.workspaceInvite,
            'Workspace Invitation',
            'notification.workspace-invite.template.hbs',
        ],
        [
            'WorkspaceJoinRequest',
            EnumNotificationProcess.workspaceJoinRequest,
            'New Workspace Join Request',
            'notification.workspace-join-request.template.hbs',
        ],
        [
            'WorkspaceJoinAccepted',
            EnumNotificationProcess.workspaceJoinAccepted,
            'Workspace Join Request Accepted',
            'notification.workspace-join-accepted.template.hbs',
        ],
        [
            'WorkspaceJoinRejected',
            EnumNotificationProcess.workspaceJoinRejected,
            'Workspace Join Request Rejected',
            'notification.workspace-join-rejected.template.hbs',
        ],
    ] as const;

    beforeEach(() => vi.resetAllMocks());

    it.each(cases)(
        'imports, gets, and deletes %s',
        async (suffix, name, subject, filename) => {
            const template =
                mock<Awaited<ReturnType<AwsSESService['getTemplate']>>>();
            awsSESService.getTemplate.mockResolvedValue(template);
            await expect(service[`emailImport${suffix}`]()).resolves.toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name,
                subject,
                htmlBody: readFileSync(
                    join(
                        process.cwd(),
                        'src/modules/notification/templates',
                        filename
                    ),
                    'utf8'
                ),
            });
            await expect(service[`emailGet${suffix}`]()).resolves.toBe(
                template
            );
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({ name });
            await expect(service[`emailDelete${suffix}`]()).resolves.toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({ name });
        }
    );

    it.each(cases)('maps provider failures for %s', async suffix => {
        awsSESService.createTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service[`emailImport${suffix}`]()).resolves.toBe(false);
        awsSESService.getTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service[`emailGet${suffix}`]()).resolves.toBeNull();
        awsSESService.deleteTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service[`emailDelete${suffix}`]()).resolves.toBe(false);
    });
});
