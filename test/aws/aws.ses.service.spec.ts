import {
    DeleteTemplateCommandOutput,
    GetTemplateCommandOutput,
    ListTemplatesCommandOutput,
    SendBulkTemplatedEmailCommandOutput,
    SendTemplatedEmailCommandOutput,
    UpdateTemplateCommandOutput,
} from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AwsSESService } from 'src/common/aws/services/aws.ses.service';

describe('AwsSESService', () => {
    let service: AwsSESService;

    beforeEach(async () => {
        const moduleRefRef: TestingModule = await Test.createTestingModule({
            providers: [
                AwsSESService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            switch (key) {
                                case 'aws.ses.credential.key':
                                    return 'test-access-key';
                                case 'aws.ses.credential.secret':
                                    return 'test-secret-access-key';
                                case 'aws.ses.region':
                                    return 'us-west-2';
                                case 'aws.ses.fromEmail':
                                default:
                                    return 'mail@mail.com';
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<AwsSESService>(AwsSESService);

        jest.spyOn(service['sesClient'], 'send').mockImplementation(jest.fn());
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('listTemplates', () => {
        it('should return ListTemplatesCommandOutput', async () => {
            const data: ListTemplatesCommandOutput = { $metadata: {} };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: ListTemplatesCommandOutput =
                await service.listTemplates();
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.listTemplates();

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('getTemplate', () => {
        it('should return GetTemplateCommandOutput', async () => {
            const data: GetTemplateCommandOutput = { $metadata: {} };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: GetTemplateCommandOutput = await service.getTemplate({
                name: 'template',
            });
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.getTemplate({ name: 'template' });

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('createTemplate', () => {
        it('should return GetTemplateCommandOutput', async () => {
            const data: GetTemplateCommandOutput = { $metadata: {} };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: GetTemplateCommandOutput =
                await service.createTemplate({
                    name: 'template',
                    subject: 'subject',
                    plainTextBody: 'test',
                });
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error null of body', async () => {
            const error = new Error('body is null');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.createTemplate({
                name: 'template',
                subject: 'subject',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(result).rejects.toThrow(error);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.createTemplate({
                name: 'template',
                subject: 'subject',
                plainTextBody: 'test',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('updateTemplate', () => {
        it('should return UpdateTemplateCommandOutput', async () => {
            const data: UpdateTemplateCommandOutput = { $metadata: {} };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: UpdateTemplateCommandOutput =
                await service.updateTemplate({
                    name: 'template',
                    subject: 'subject',
                    plainTextBody: 'test',
                });
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error null of body', async () => {
            const error = new Error('body is null');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.updateTemplate({
                name: 'template',
                subject: 'subject',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(result).rejects.toThrow(error);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.updateTemplate({
                name: 'template',
                subject: 'subject',
                plainTextBody: 'test',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('deleteTemplate', () => {
        it('should return DeleteTemplateCommandOutput', async () => {
            const data: DeleteTemplateCommandOutput = { $metadata: {} };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: DeleteTemplateCommandOutput =
                await service.deleteTemplate({
                    name: 'template',
                });
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.deleteTemplate({
                name: 'template',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('send', () => {
        it('should return SendTemplatedEmailCommandOutput', async () => {
            const data: SendTemplatedEmailCommandOutput = {
                MessageId: '',
                $metadata: {},
            };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: SendTemplatedEmailCommandOutput = await service.send({
                recipients: ['mail@mail.com'],
                templateName: 'template',
                sender: 'sender@mail.com',
            });
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.send({
                recipients: ['mail@mail.com'],
                templateName: 'template',
                sender: 'sender@mail.com',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('sendBulk', () => {
        it('should return SendBulkTemplatedEmailCommandOutput', async () => {
            const data: SendBulkTemplatedEmailCommandOutput = {
                $metadata: {},
                Status: [],
            };
            jest.spyOn(service['sesClient'], 'send').mockResolvedValue(
                data as never
            );

            const result: SendBulkTemplatedEmailCommandOutput =
                await service.sendBulk({
                    recipients: [
                        {
                            recipient: 'mail@mail.com',
                        },
                    ],
                    templateName: 'template',
                    sender: 'sender@mail.com',
                });
            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error', async () => {
            const error = new Error('error');
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.sendBulk({
                recipients: [
                    {
                        recipient: 'mail@mail.com',
                    },
                ],
                templateName: 'template',
                sender: 'sender@mail.com',
            });

            try {
                await result;
            } catch (err: any) {}

            expect(service['sesClient'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });
});
