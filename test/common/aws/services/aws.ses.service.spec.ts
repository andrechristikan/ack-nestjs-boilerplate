import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import {
    CreateTemplateCommand,
    DeleteTemplateCommand,
    GetSendQuotaCommand,
    GetTemplateCommand,
    ListTemplatesCommand,
    SendBulkTemplatedEmailCommand,
    SendTemplatedEmailCommand,
    UpdateTemplateCommand,
} from '@aws-sdk/client-ses';

import { AwsSESService } from '@common/aws/services/aws.ses.service';

describe('AwsSESService', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const send = vi.fn();

    const createService = (credentials = true): AwsSESService => {
        Reflect.set(
            configService,
            'get',
            vi.fn((key: string | symbol) =>
                credentials
                    ? {
                          'aws.ses.iam.key': 'key',
                          'aws.ses.iam.secret': 'secret',
                          'aws.ses.region': 'eu-west-1',
                      }[String(key)]
                    : null
            )
        );
        return new AwsSESService(configService);
    };

    const initializeWithMockClient = (): AwsSESService => {
        const service = createService();
        Reflect.set(service, 'sesClient', { send });
        return service;
    };

    beforeEach(() => vi.resetAllMocks());

    it('stays disabled without credentials and initializes with complete credentials', () => {
        const disabled = createService(false);
        disabled.onModuleInit();
        expect(disabled.isInitialized()).toBe(false);

        const enabled = createService();
        enabled.onModuleInit();
        expect(enabled.isInitialized()).toBe(true);
    });

    it('checks connectivity and maps provider failure to false', async () => {
        const disabled = createService(false);
        await expect(disabled.checkConnection()).resolves.toBe(false);

        const service = initializeWithMockClient();
        send.mockResolvedValue({});
        await expect(service.checkConnection()).resolves.toBe(true);
        expect(send).toHaveBeenNthCalledWith(
            1,
            expect.any(GetSendQuotaCommand)
        );
        send.mockRejectedValue(new Error('offline'));
        await expect(service.checkConnection()).resolves.toBe(false);
    });

    it('returns inert results for every operation while disabled', async () => {
        const service = createService(false);
        await expect(service.listTemplates()).resolves.toEqual(
            expect.objectContaining({ TemplatesMetadata: [] })
        );
        await expect(
            service.getTemplate({ name: 'template' })
        ).resolves.toEqual(expect.objectContaining({ Template: undefined }));
        await expect(
            service.createTemplate({
                name: 'template',
                subject: 'Subject',
                htmlBody: '<p>Body</p>',
            })
        ).resolves.toEqual({ $metadata: {} });
        await expect(
            service.updateTemplate({
                name: 'template',
                subject: 'Subject',
                plainTextBody: 'Body',
            })
        ).resolves.toEqual({ $metadata: {} });
        await expect(
            service.deleteTemplate({ name: 'template' })
        ).resolves.toEqual({ $metadata: {} });
        await expect(
            service.send({
                recipients: ['to@example.com'],
                sender: 'from@example.com',
                templateName: 'template',
            })
        ).resolves.toEqual(expect.objectContaining({ MessageId: undefined }));
        await expect(
            service.sendBulk({
                recipients: [],
                sender: 'from@example.com',
                templateName: 'template',
            })
        ).resolves.toEqual(expect.objectContaining({ Status: [] }));
    });

    it('lists and retrieves templates through SES commands', async () => {
        const service = initializeWithMockClient();
        send.mockResolvedValueOnce({
            TemplatesMetadata: [],
        }).mockResolvedValueOnce({ Template: { TemplateName: 'template' } });
        await service.listTemplates('next-token');
        await service.getTemplate({ name: 'template' });
        expect(send).toHaveBeenNthCalledWith(
            1,
            expect.any(ListTemplatesCommand)
        );
        expect(send).toHaveBeenNthCalledWith(2, expect.any(GetTemplateCommand));
    });

    it('creates, updates, and deletes valid templates and rejects empty bodies', async () => {
        const service = initializeWithMockClient();
        send.mockResolvedValue({ $metadata: {} });
        await expect(
            service.createTemplate({
                name: 'template',
                subject: 'Subject',
                htmlBody: '',
                plainTextBody: '',
            })
        ).rejects.toThrow(Error);
        await expect(
            service.updateTemplate({
                name: 'template',
                subject: 'Subject',
                htmlBody: '',
                plainTextBody: '',
            })
        ).rejects.toThrow(Error);
        await service.createTemplate({
            name: 'template',
            subject: 'Subject',
            htmlBody: '<p>Body</p>',
        });
        await service.updateTemplate({
            name: 'template',
            subject: 'Subject',
            plainTextBody: 'Body',
        });
        await service.deleteTemplate({ name: 'template' });
        expect(send).toHaveBeenNthCalledWith(
            1,
            expect.any(CreateTemplateCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            2,
            expect.any(UpdateTemplateCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            3,
            expect.any(DeleteTemplateCommand)
        );
    });

    it('sends single and bulk templates with recipient defaults', async () => {
        const service = initializeWithMockClient();
        send.mockResolvedValue({ MessageId: 'id', Status: [] });
        await service.send({
            recipients: ['to@example.com'],
            sender: 'from@example.com',
            templateName: 'template',
        });
        await service.send({
            recipients: ['to@example.com'],
            sender: 'from@example.com',
            replyTo: 'reply@example.com',
            bcc: ['bcc@example.com'],
            cc: ['cc@example.com'],
            templateName: 'template',
            templateData: { name: 'User' },
        });
        await service.sendBulk({
            recipients: [{ recipient: 'to@example.com' }],
            sender: 'from@example.com',
            templateName: 'template',
        });
        await service.sendBulk({
            recipients: [
                { recipient: 'to@example.com', templateData: { name: 'User' } },
            ],
            sender: 'from@example.com',
            replyTo: 'reply@example.com',
            bcc: ['bcc@example.com'],
            cc: ['cc@example.com'],
            templateName: 'template',
            defaultTemplateData: { app: 'ACK' },
        });
        expect(send).toHaveBeenNthCalledWith(
            1,
            expect.any(SendTemplatedEmailCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            2,
            expect.any(SendTemplatedEmailCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            3,
            expect.any(SendBulkTemplatedEmailCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            4,
            expect.any(SendBulkTemplatedEmailCommand)
        );
    });
});
