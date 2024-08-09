import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SESClient } from '@aws-sdk/client-ses';
import { AwsSESService } from 'src/modules/aws/services/aws.ses.service';
import {
    AwsSESGetTemplateDto,
    AwsSESCreateTemplateDto,
} from 'src/modules/aws/dtos/aws.ses.dto';

const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
            case 'aws.ses.credential.key':
                return 'mockAccessKeyId';
            case 'aws.ses.credential.secret':
                return 'mockSecretAccessKey';
            case 'aws.ses.region':
                return 'mockRegion';
            default:
                return null;
        }
    }),
};

const mockSESClient = {
    send: jest.fn(),
};

describe('AwsSESService', () => {
    let service: AwsSESService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AwsSESService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: SESClient, useValue: mockSESClient },
            ],
        }).compile();

        service = module.get<AwsSESService>(AwsSESService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('listTemplates', () => {
        it('should return a list of templates', async () => {
            const mockOutput = {
                TemplatesMetadata: [],
                NextToken: 'mockToken',
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const result = await service.listTemplates();
            expect(result).toEqual(mockOutput);
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(service.listTemplates()).rejects.toThrow('Mock Error');
        });
    });

    describe('getTemplate', () => {
        it('should return the template details', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto: AwsSESGetTemplateDto = { name: 'mockName' };
            const result = await service.getTemplate(dto);
            expect(result).toEqual(mockOutput);
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const dto: AwsSESGetTemplateDto = { name: 'mockName' };
            await expect(service.getTemplate(dto)).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('createTemplate', () => {
        it('should create the template', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto: AwsSESCreateTemplateDto = {
                name: 'name',
                subject: 'subject',
                htmlBody: 'htmlBody',
                plainTextBody: 'plainTextBody',
            };
            expect(await service.createTemplate(dto)).toEqual(mockOutput);
        });

        it('should throw error body null', async () => {
            const dto: AwsSESCreateTemplateDto = {
                name: 'name',
                subject: 'subject',
            };

            try {
                await service.createTemplate(dto);
            } catch (error) {
                expect(error.message).toEqual('body is null');
            }
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const dto: AwsSESCreateTemplateDto = {
                name: 'name',
                subject: 'subject',
                htmlBody: 'htmlBody',
                plainTextBody: 'plainTextBody',
            };
            await expect(service.createTemplate(dto)).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('updateTemplate', () => {
        it('should update the template', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto: AwsSESCreateTemplateDto = {
                name: 'name',
                subject: 'subject',
                htmlBody: 'htmlBody',
                plainTextBody: 'plainTextBody',
            };
            expect(await service.updateTemplate(dto)).toEqual(mockOutput);
        });

        it('should throw error body null', async () => {
            const dto: AwsSESCreateTemplateDto = {
                name: 'name',
                subject: 'subject',
            };

            try {
                await service.updateTemplate(dto);
            } catch (error) {
                expect(error.message).toEqual('body is null');
            }
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const dto: AwsSESCreateTemplateDto = {
                name: 'name',
                subject: 'subject',
                htmlBody: 'htmlBody',
                plainTextBody: 'plainTextBody',
            };
            await expect(service.updateTemplate(dto)).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('deleteTemplate', () => {
        it('should delete the template', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto = { name: 'name' };
            expect(await service.deleteTemplate(dto)).toEqual(mockOutput);
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const dto = { name: 'name' };
            await expect(service.deleteTemplate(dto)).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('send', () => {
        it('should send', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto = {
                recipients: ['recipients'],
                sender: 'sender',
                replyTo: 'replyTo',
                bcc: ['bcc'],
                cc: ['cc'],
                templateName: 'templateName',
                templateData: {},
            };
            expect(await service.send(dto)).toEqual(mockOutput);
        });

        it('should send without replyTo bcc cc templateData', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto = {
                recipients: ['recipients'],
                sender: 'sender',
                templateName: 'templateName',
            };
            expect(await service.send(dto)).toEqual(mockOutput);
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const dto = {
                recipients: ['recipients'],
                sender: 'sender',
                replyTo: 'replyTo',
                bcc: ['bcc'],
                cc: ['cc'],
                templateName: 'templateName',
                templateData: {},
            };
            await expect(service.send(dto)).rejects.toThrow('Mock Error');
        });
    });

    describe('sendBulk', () => {
        it('should send bulk', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto = {
                recipients: [
                    { recipients: 'recipients', templateData: {} } as any,
                ],
                sender: 'sender',
                replyTo: 'replyTo',
                bcc: ['bcc'],
                cc: ['cc'],
                templateName: 'templateName',
            };
            expect(await service.sendBulk(dto)).toEqual(mockOutput);
        });

        it('should send bulk without bcc cc templateData replyTo', async () => {
            const mockOutput = {
                Template: {
                    TemplateName: 'mockName',
                    HtmlPart: 'mockHtml',
                    SubjectPart: 'mockSubject',
                    TextPart: 'mockText',
                },
            };
            jest.spyOn(service['sesClient'], 'send').mockReturnValue(
                mockOutput as any
            );

            const dto = {
                recipients: [{ recipients: 'recipients' } as any],
                sender: 'sender',
                templateName: 'templateName',
            };
            expect(await service.sendBulk(dto)).toEqual(mockOutput);
        });

        it('should throw an error if SESClient send fails', async () => {
            jest.spyOn(service['sesClient'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const dto = {
                recipients: [
                    { recipients: 'recipients', templateData: {} } as any,
                ],
                sender: 'sender',
                replyTo: 'replyTo',
                bcc: ['bcc'],
                cc: ['cc'],
                templateName: 'templateName',
            };
            await expect(service.sendBulk(dto)).rejects.toThrow('Mock Error');
        });
    });
});
