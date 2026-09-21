import { readFileSync } from 'fs';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { NotificationTemplateTermPolicyDomain } from '@modules/notification/domains/notification.template.term-policy.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';

describe('NotificationTemplateTermPolicyDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const service = new NotificationTemplateTermPolicyDomain(awsSESService);

    beforeEach(() => vi.resetAllMocks());

    it('imports, gets, and deletes the publish-term-policy template', async () => {
        const template =
            mock<Awaited<ReturnType<AwsSESService['getTemplate']>>>();
        awsSESService.getTemplate.mockResolvedValue(template);
        await expect(service.emailImportPublishTermPolicy()).resolves.toBe(
            true
        );
        expect(awsSESService.createTemplate).toHaveBeenCalledWith({
            name: EnumNotificationProcess.publishTermPolicy,
            subject: 'Publish Term Policy',
            htmlBody: readFileSync(
                join(
                    process.cwd(),
                    'src/modules/notification/templates/notification.publish-term-policy.template.hbs'
                ),
                'utf8'
            ),
        });
        await expect(service.emailGetPublishTermPolicy()).resolves.toBe(
            template
        );
        await expect(service.emailDeletePublishTermPolicy()).resolves.toBe(
            true
        );
    });

    it('maps provider failures to false or null', async () => {
        awsSESService.createTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service.emailImportPublishTermPolicy()).resolves.toBe(
            false
        );
        awsSESService.getTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service.emailGetPublishTermPolicy()).resolves.toBeNull();
        awsSESService.deleteTemplate.mockRejectedValue(new Error('SES down'));
        await expect(service.emailDeletePublishTermPolicy()).resolves.toBe(
            false
        );
    });
});
