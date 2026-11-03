import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { NotificationTemplateTermPolicyDomain } from '@modules/notification/domains/notification.template.term-policy.domain';
import { MessageService } from '@common/message/services/message.service';

describe('NotificationTemplateTermPolicyDomain', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    let domain: NotificationTemplateTermPolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        const module = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                NotificationTemplateTermPolicyDomain,
                { provide: AwsSESService, useValue: awsSESService },
            ],
        }).compile();
        domain = module.get(NotificationTemplateTermPolicyDomain);
    });

    describe('emailImportPublishTermPolicy', () => {
        it('creates the template from the on-disk hbs file', async () => {
            awsSESService.createTemplate.mockResolvedValue({
                $metadata: {},
            });

            await expect(
                domain.emailImportPublishTermPolicy()
            ).resolves.toBeUndefined();
            expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.publishTermPolicy,
                subject: 'Publish Term Policy',
                htmlBody: expect.any(String),
            });
        });

        it('throws an AppUnknownException chaining the rejection when the create call rejects', async () => {
            const error = new Error('ses down');
            awsSESService.createTemplate.mockRejectedValue(error);

            await expect(
                domain.emailImportPublishTermPolicy()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
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

        it('returns null for the template-not-found answer', async () => {
            awsSESService.getTemplate.mockRejectedValue(
                new TemplateDoesNotExistException({
                    message: 'missing',
                    $metadata: {},
                })
            );

            await expect(
                domain.emailGetPublishTermPolicy()
            ).resolves.toBeNull();
        });

        it('throws an AppUnknownException chaining the rejection for any other error', async () => {
            const error = new Error('ses down');
            awsSESService.getTemplate.mockRejectedValue(error);

            await expect(
                domain.emailGetPublishTermPolicy()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });

    describe('emailDeletePublishTermPolicy', () => {
        it('deletes the template', async () => {
            awsSESService.deleteTemplate.mockResolvedValue({ $metadata: {} });

            await expect(
                domain.emailDeletePublishTermPolicy()
            ).resolves.toBeUndefined();
            expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                name: EnumNotificationProcess.publishTermPolicy,
            });
        });

        it('throws an AppUnknownException chaining the rejection when the delete call rejects', async () => {
            const error = new Error('ses down');
            awsSESService.deleteTemplate.mockRejectedValue(error);

            await expect(
                domain.emailDeletePublishTermPolicy()
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
            });
        });
    });
});
