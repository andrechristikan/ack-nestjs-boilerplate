import {
    CreateTemplateCommand,
    MessageRejected,
    SESClient,
    SESServiceException,
    TemplateDoesNotExistException,
    UpdateTemplateCommand,
} from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsUnavailableException } from '@common/aws/exceptions/aws.unavailable.exception';
import type {
    IAwsSesSend,
    IAwsSesSendBulk,
    IAwsSesTemplate,
} from '@common/aws/interfaces/aws.ses.interface';
import {
    createAwsSesService,
    createInitializedAwsSesService,
} from '@test/unit/helpers/test.unit.aws.helper';

vi.mock('@aws-sdk/client-ses', async importOriginal => {
    const actual = await importOriginal<typeof import('@aws-sdk/client-ses')>();

    return { ...actual, SESClient: vi.fn() };
});

describe('AwsSesService', () => {
    const send = vi.fn();

    const configValues: Record<string, unknown> = {
        'aws.ses.accessKeyId': 'ses-key',
        'aws.ses.secretAccessKey': 'ses-secret',
        'aws.ses.identityArn': null,
        'aws.ses.region': 'us-east-1',
        'aws.ses.endpoint': null,
        'aws.ses.maxAttempts': 1,
        'aws.ses.timeoutInMs': 30000,
    };

    const messageRejectedError = new MessageRejected({
        $metadata: {},
        message: 'Message rejected',
    });
    const serverFaultError = new SESServiceException({
        name: 'ServiceUnavailable',
        $fault: 'server',
        $metadata: {},
        message: 'Service unavailable',
    });
    const networkError = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
    });

    beforeEach(() => {
        vi.mocked(SESClient).mockImplementation(function AwsSesClientDouble() {
            return { send } as unknown as InstanceType<typeof SESClient>;
        });
    });

    describe('onModuleInit', () => {
        it('does not create a client when the key is missing', async () => {
            const service = await createAwsSesService(configValues, {
                'aws.ses.accessKeyId': null,
            });

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(SESClient).not.toHaveBeenCalled();
        });

        it('does not create a client when the secret is missing', async () => {
            const service = await createAwsSesService(configValues, {
                'aws.ses.secretAccessKey': null,
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
                maxAttempts: 1,
                requestHandler: { requestTimeout: 30000 },
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

        it('returns false when the client reports a server fault', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(serverFaultError);

            await expect(service.checkConnection()).resolves.toBe(false);
        });
    });

    describe('listTemplates', () => {
        it('returns an empty result when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(service.listTemplates(null)).resolves.toEqual({
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

        it('sends the command without NextToken when the token is null', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ $metadata: {} });

            await service.listTemplates(null);

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({ input: { MaxItems: 20 } })
            );
        });

        it('sends the command with NextToken when a token is given', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ $metadata: {} });

            await service.listTemplates('token');

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: { MaxItems: 20, NextToken: 'token' },
                })
            );
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

    describe('upsertTemplate', () => {
        const template: IAwsSesTemplate = {
            name: 'welcome',
            subject: 'Welcome',
            htmlBody: '<p>Welcome</p>',
            plainTextBody: 'Welcome',
        };
        const expectedInput = {
            Template: {
                TemplateName: 'welcome',
                SubjectPart: 'Welcome',
                HtmlPart: '<p>Welcome</p>',
                TextPart: 'Welcome',
            },
        };
        const templateMissingError = new TemplateDoesNotExistException({
            $metadata: {},
            message: 'Template does not exist',
        });

        it('sends nothing when not initialized', async () => {
            const service = await createAwsSesService(configValues, {});

            await expect(
                service.upsertTemplate(template)
            ).resolves.toBeUndefined();
            expect(send).not.toHaveBeenCalled();
        });

        it('throws when both bodies are missing', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );

            const rejection = service.upsertTemplate({
                name: 'welcome',
                subject: 'Welcome',
            });

            await expect(rejection).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesTemplateBodyRequired,
            });
            expect(send).not.toHaveBeenCalled();
        });

        it('sends the update and no create when the update succeeds', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockResolvedValueOnce({ $metadata: {} });

            await expect(
                service.upsertTemplate(template)
            ).resolves.toBeUndefined();

            expect(send).toHaveBeenCalledTimes(1);
            expect(send).toHaveBeenCalledWith(
                expect.any(UpdateTemplateCommand)
            );
            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({ input: expectedInput })
            );
            expect(send).not.toHaveBeenCalledWith(
                expect.any(CreateTemplateCommand)
            );
        });

        it('sends the create with the same template when the update finds no template', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(templateMissingError);
            send.mockResolvedValueOnce({ $metadata: {} });

            await expect(
                service.upsertTemplate(template)
            ).resolves.toBeUndefined();

            expect(send).toHaveBeenCalledTimes(2);
            expect(send).toHaveBeenNthCalledWith(
                1,
                expect.any(UpdateTemplateCommand)
            );
            expect(send).toHaveBeenNthCalledWith(
                2,
                expect.any(CreateTemplateCommand)
            );
            expect(send).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ input: expectedInput })
            );
        });

        it('rejects and sends no create when the update fails for another reason', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(messageRejectedError);

            await expect(
                service.upsertTemplate(template)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: messageRejectedError,
            });
            expect(send).toHaveBeenCalledTimes(1);
            expect(send).not.toHaveBeenCalledWith(
                expect.any(CreateTemplateCommand)
            );
        });

        it('rejects with the unavailable exception when the update hits a server fault', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(serverFaultError);

            await expect(
                service.upsertTemplate(template)
            ).rejects.toBeInstanceOf(AwsUnavailableException);
            expect(send).toHaveBeenCalledTimes(1);
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
        const payload: IAwsSesSend = {
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
            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({ TemplateData: '{}' }),
                })
            );
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

        it('rejects with the same instance on a client fault', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(messageRejectedError);

            await expect(service.send(payload)).rejects.toBe(
                messageRejectedError
            );
        });

        it('throws AwsUnavailableException carrying a server fault', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(serverFaultError);

            const promise = service.send(payload);

            await expect(promise).rejects.toBeInstanceOf(
                AwsUnavailableException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.unavailable,
                rawError: serverFaultError,
            });
        });

        it('throws AwsUnavailableException carrying a network error', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(networkError);

            await expect(service.send(payload)).rejects.toMatchObject({
                statusCode: EnumAwsStatusCodeError.unavailable,
                rawError: networkError,
            });
        });
    });

    describe('sendBulk', () => {
        const payload: IAwsSesSendBulk = {
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
            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Destinations: [
                            expect.objectContaining({
                                ReplacementTemplateData: '{}',
                            }),
                        ],
                    }),
                })
            );
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

        it('rejects with the same instance on a client fault', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(messageRejectedError);

            await expect(service.sendBulk(payload)).rejects.toBe(
                messageRejectedError
            );
        });

        it('throws AwsUnavailableException carrying a server fault', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(serverFaultError);

            await expect(service.sendBulk(payload)).rejects.toMatchObject({
                statusCode: EnumAwsStatusCodeError.unavailable,
                rawError: serverFaultError,
            });
        });

        it('throws AwsUnavailableException carrying a network error', async () => {
            const service = await createInitializedAwsSesService(
                configValues,
                {}
            );
            send.mockRejectedValueOnce(networkError);

            await expect(service.sendBulk(payload)).rejects.toMatchObject({
                statusCode: EnumAwsStatusCodeError.unavailable,
                rawError: networkError,
            });
        });
    });
});
