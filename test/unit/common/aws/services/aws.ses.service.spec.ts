import { HttpStatus } from '@nestjs/common';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import type {
    IAwsSESSend,
    IAwsSESSendBulk,
    IAwsSESTemplate,
} from '@common/aws/interfaces/aws.ses.interface';
import {
    createAwsSesService,
    createInitializedAwsSesService,
} from '@test/unit/helpers/test.unit.aws.helper';

vi.mock('@aws-sdk/client-ses', async importOriginal => {
    const actual = await importOriginal<typeof import('@aws-sdk/client-ses')>();

    return { ...actual, SESClient: vi.fn() };
});

describe('AwsSESService', () => {
    const send = vi.fn();

    let SESClient: typeof import('@aws-sdk/client-ses').SESClient;

    const configValues: Record<string, unknown> = {
        'aws.ses.iam.key': 'ses-key',
        'aws.ses.iam.secret': 'ses-secret',
        'aws.ses.identityArn': null,
        'aws.ses.region': 'us-east-1',
        'aws.ses.endpoint': null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ SESClient } = await import('@aws-sdk/client-ses'));

        send.mockReset();
        vi.mocked(SESClient).mockImplementation(function AwsSesClientDouble() {
            return { send } as unknown as InstanceType<typeof SESClient>;
        });
    });

    describe('onModuleInit', () => {
        it('does not create a client when the key is missing', async () => {
            const service = await createAwsSesService(configValues, {
                'aws.ses.iam.key': null,
            });

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(SESClient).not.toHaveBeenCalled();
        });

        it('does not create a client when the secret is missing', async () => {
            const service = await createAwsSesService(configValues, {
                'aws.ses.iam.secret': null,
            });

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(SESClient).not.toHaveBeenCalled();
        });

        it('does not create a client when the region is missing', async () => {
            const service = await createAwsSesService(configValues, {
                'aws.ses.region': null,
            });

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(SESClient).not.toHaveBeenCalled();
        });

        it('creates a client when every credential is present', async () => {
            const service = await createAwsSesService(configValues, {});

            service.onModuleInit();

            expect(service.isInitialized()).toBe(true);
            expect(SESClient).toHaveBeenCalledWith({
                credentials: {
                    accessKeyId: 'ses-key',
                    secretAccessKey: 'ses-secret',
                },
                region: 'us-east-1',
            });
        });

        it('builds the client with endpoint when aws.ses.endpoint is set', async () => {
            const service = await createAwsSesService(configValues, {
                'aws.ses.endpoint': 'http://localhost:4566',
            });

            service.onModuleInit();

            expect(SESClient).toHaveBeenCalledWith(
                expect.objectContaining({ endpoint: 'http://localhost:4566' })
            );
        });

        it('builds the client without endpoint when aws.ses.endpoint is null', async () => {
            const service = await createAwsSesService(configValues, {});

            service.onModuleInit();

            expect(SESClient).toHaveBeenCalledWith(
                expect.not.objectContaining({ endpoint: expect.anything() })
            );
        });
    });

    describe('isInitialized', () => {
        it('is false before onModuleInit runs', async () => {
            const service = await createAwsSesService(configValues, {});

            expect(service.isInitialized()).toBe(false);
        });

        it('is true after onModuleInit creates the client', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );

            expect(service.isInitialized()).toBe(true);
        });
    });

    describe('checkConnection', () => {
        it('returns false when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.checkConnection()).resolves.toBe(false);
        });

        it('returns true when the client answers', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({});

            await expect(service.checkConnection()).resolves.toBe(true);
        });

        it('returns false when the client throws', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(new Error('down'));

            await expect(service.checkConnection()).resolves.toBe(false);
        });
    });

    describe('listTemplates', () => {
        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.listTemplates()).resolves.toEqual({
                TemplatesMetadata: [],
                $metadata: {},
            });
        });

        it('lists templates from the client', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({
                TemplatesMetadata: [{ Name: 'welcome' }],
                $metadata: {},
            });

            await expect(service.listTemplates('next-token')).resolves.toEqual({
                TemplatesMetadata: [{ Name: 'welcome' }],
                $metadata: {},
            });
        });
    });

    describe('getTemplate', () => {
        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(
                service.getTemplate({ name: 'welcome' })
            ).resolves.toEqual({ $metadata: {}, Template: undefined });
        });

        it('gets the template from the client', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({
                $metadata: {},
                Template: { TemplateName: 'welcome' },
            });

            await expect(
                service.getTemplate({ name: 'welcome' })
            ).resolves.toEqual({
                $metadata: {},
                Template: { TemplateName: 'welcome' },
            });
        });
    });

    describe('createTemplate', () => {
        const template: IAwsSESTemplate = {
            name: 'welcome',
            subject: 'Welcome',
            htmlBody: '<p>Welcome</p>',
            plainTextBody: 'Welcome',
        };

        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.createTemplate(template)).resolves.toEqual({
                $metadata: {},
            });
        });

        it('throws when both bodies are missing', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );

            const rejection = service.createTemplate({
                name: 'welcome',
                subject: 'Welcome',
            });

            await expect(rejection).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesTemplateBodyRequired,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.sesTemplateBodyRequired
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.sesTemplateBodyRequired',
            });
        });

        it('creates the template', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ $metadata: {} });

            await expect(service.createTemplate(template)).resolves.toEqual({
                $metadata: {},
            });
        });
    });

    describe('updateTemplate', () => {
        const template: IAwsSESTemplate = {
            name: 'welcome',
            subject: 'Welcome',
            htmlBody: '<p>Welcome</p>',
        };

        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.updateTemplate(template)).resolves.toEqual({
                $metadata: {},
            });
        });

        it('throws when both bodies are missing', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );

            const rejection = service.updateTemplate({
                name: 'welcome',
                subject: 'Welcome',
            });

            await expect(rejection).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesTemplateBodyRequired,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.sesTemplateBodyRequired
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.sesTemplateBodyRequired',
            });
        });

        it('updates the template', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ $metadata: {} });

            await expect(service.updateTemplate(template)).resolves.toEqual({
                $metadata: {},
            });
        });
    });

    describe('deleteTemplate', () => {
        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(
                service.deleteTemplate({ name: 'welcome' })
            ).resolves.toEqual({ $metadata: {} });
        });

        it('deletes the template', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ $metadata: {} });

            await expect(
                service.deleteTemplate({ name: 'welcome' })
            ).resolves.toEqual({ $metadata: {} });
        });
    });

    describe('send', () => {
        const payload: IAwsSESSend = {
            templateName: 'welcome',
            templateData: { name: 'Jane' },
            sender: 'noreply@example.com',
            recipients: ['jane@example.com'],
        };

        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.send(payload)).resolves.toEqual({
                MessageId: undefined,
                $metadata: {},
            });
        });

        it('sends with the given reply-to, cc and bcc', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ MessageId: 'id-1', $metadata: {} });

            await expect(
                service.send({
                    ...payload,
                    replyTo: 'reply@example.com',
                    cc: ['cc@example.com'],
                    bcc: ['bcc@example.com'],
                })
            ).resolves.toEqual({ MessageId: 'id-1', $metadata: {} });
        });

        it('defaults reply-to, cc, bcc and template data when absent', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ MessageId: 'id-2', $metadata: {} });

            await service.send({
                templateName: 'welcome',
                sender: 'noreply@example.com',
                recipients: ['jane@example.com'],
            });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('passes the configured ARN as the sending-authorization source ARN', async () => {
            const service = await createInitializedAwsSesService(configValues, {
                'aws.ses.identityArn': 'arn:aws:ses:us-east-1:1:identity/a.com',
            });
            send.mockResolvedValueOnce({ MessageId: 'id-3', $metadata: {} });

            await service.send(payload);

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        SourceArn: 'arn:aws:ses:us-east-1:1:identity/a.com',
                    }),
                })
            );
        });

        it('omits the source ARN when no ARN is configured', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ MessageId: 'id-4', $metadata: {} });

            await service.send(payload);

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.not.objectContaining({
                        SourceArn: expect.anything(),
                    }),
                })
            );
        });
    });

    describe('sendBulk', () => {
        const payload: IAwsSESSendBulk = {
            templateName: 'welcome',
            defaultTemplateData: { name: 'Team' },
            sender: 'noreply@example.com',
            recipients: [
                {
                    recipient: 'jane@example.com',
                    templateData: { name: 'Jane' },
                },
            ],
        };

        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.sendBulk(payload)).resolves.toEqual({
                Status: [],
                $metadata: {},
            });
        });

        it('sends bulk with the given reply-to, cc and bcc', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({
                Status: [{ Status: 'Success' }],
                $metadata: {},
            });

            await expect(
                service.sendBulk({
                    ...payload,
                    replyTo: 'reply@example.com',
                    cc: ['cc@example.com'],
                    bcc: ['bcc@example.com'],
                })
            ).resolves.toEqual({
                Status: [{ Status: 'Success' }],
                $metadata: {},
            });
        });

        it('defaults reply-to, cc, bcc and recipient template data when absent', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ Status: [], $metadata: {} });

            await service.sendBulk({
                templateName: 'welcome',
                sender: 'noreply@example.com',
                recipients: [{ recipient: 'jane@example.com' }],
            });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('passes the configured ARN as the sending-authorization source ARN', async () => {
            const service = await createInitializedAwsSesService(configValues, {
                'aws.ses.identityArn': 'arn:aws:ses:us-east-1:1:identity/a.com',
            });
            send.mockResolvedValueOnce({ Status: [], $metadata: {} });

            await service.sendBulk(payload);

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        SourceArn: 'arn:aws:ses:us-east-1:1:identity/a.com',
                    }),
                })
            );
        });

        it('omits the source ARN when no ARN is configured', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ Status: [], $metadata: {} });

            await service.sendBulk(payload);

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.not.objectContaining({
                        SourceArn: expect.anything(),
                    }),
                })
            );
        });
    });
});
