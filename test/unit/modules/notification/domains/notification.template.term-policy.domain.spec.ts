import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateTermPolicyDomain } from '@modules/notification/domains/notification.template.term-policy.domain';

describe('NotificationTemplateTermPolicyDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateTermPolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateTermPolicyDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateTermPolicyDomain);
    });

    describe('emailImportPublishTermPolicy', () => {
        it('creates the template from the on-disk hbs file and returns true', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            const result = await domain.emailImportPublishTermPolicy();

            expect(result).toBe(true);
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.publishTermPolicy,
                subject: 'Publish Term Policy',
                htmlBody: expect.any(String),
            });
        });

        it('returns false when the create call rejects', async () => {
            awsSESService.createTemplate.mockRejectedValue(
                new Error('ses down')
            );

            const result = await domain.emailImportPublishTermPolicy();

            expect(result).toBe(false);
        });
    });

    describe('emailGetPublishTermPolicy', () => {
        it('returns the template from SES', async () => {
            const template: GetTemplateCommandOutput = {
                $metadata: {},
                Template: { TemplateName: 'publishTermPolicy' },
            };
            awsSESService.getTemplate.mockResolvedValue(template);

            const result = await domain.emailGetPublishTermPolicy();

            expect(result).toBe(template);
            expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.publishTermPolicy,
            });
        });

        it('returns null when the get call rejects', async () => {
            awsSESService.getTemplate.mockRejectedValue(new Error('not found'));

            const result = await domain.emailGetPublishTermPolicy();

            expect(result).toBeNull();
        });
    });

    describe('emailDeletePublishTermPolicy', () => {
        it('deletes the template and returns true', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            const result = await domain.emailDeletePublishTermPolicy();

            expect(result).toBe(true);
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.publishTermPolicy,
            });
        });

        it('returns false when the delete call rejects', async () => {
            awsSESService.deleteTemplate.mockRejectedValue(
                new Error('ses down')
            );

            const result = await domain.emailDeletePublishTermPolicy();

            expect(result).toBe(false);
        });
    });
});
