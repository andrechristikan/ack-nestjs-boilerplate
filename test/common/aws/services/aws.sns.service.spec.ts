import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

vi.mock('@aws-sdk/client-sns', async importOriginal => {
    const actual = await importOriginal<typeof import('@aws-sdk/client-sns')>();

    return { ...actual, SNSClient: vi.fn() };
});

describe('AwsSNSService', () => {
    const send = vi.fn();

    let SNSClient: typeof import('@aws-sdk/client-sns').SNSClient;
    let AwsSNSService: typeof import('@common/aws/services/aws.sns.service').AwsSNSService;

    const configValues: Record<string, unknown> = {
        'aws.sns.iam.key': 'sns-key',
        'aws.sns.iam.secret': 'sns-secret',
        'aws.sns.region': 'us-east-1',
        'aws.sns.senderId': 'ACK',
        'aws.sns.maxAttempts': 1,
    };

    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const buildService = async (
        overrides: Record<string, unknown> = {}
    ): Promise<InstanceType<typeof AwsSNSService>> => {
        configGet.mockImplementation((key: string) =>
            Object.hasOwn(overrides, key) ? overrides[key] : configValues[key]
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AwsSNSService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        const service = module.get(AwsSNSService);
        service.onModuleInit();

        return service;
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ SNSClient } = await import('@aws-sdk/client-sns'));
        ({ AwsSNSService } =
            await import('@common/aws/services/aws.sns.service'));

        send.mockReset();
        vi.mocked(SNSClient).mockImplementation(function AwsSnsClientDouble() {
            return { send } as unknown as InstanceType<typeof SNSClient>;
        });
    });

    describe('onModuleInit', () => {
        it('creates the client with the configured maxAttempts', async () => {
            await buildService();

            expect(SNSClient).toHaveBeenCalledWith({
                credentials: {
                    accessKeyId: 'sns-key',
                    secretAccessKey: 'sns-secret',
                },
                region: 'us-east-1',
                maxAttempts: 1,
            });
        });

        it('passes a raised maxAttempts to the client', async () => {
            await buildService({ 'aws.sns.maxAttempts': 5 });

            expect(SNSClient).toHaveBeenCalledWith(
                expect.objectContaining({ maxAttempts: 5 })
            );
        });
    });

    describe('checkConnection', () => {
        it('returns false without credentials', async () => {
            const service = await buildService({ 'aws.sns.iam.key': null });
            expect(await service.checkConnection()).toBe(false);
            expect(send).not.toHaveBeenCalled();
        });

        it('checks SMS attributes and returns true on success', async () => {
            const { GetSMSAttributesCommand } =
                await import('@aws-sdk/client-sns');
            send.mockResolvedValue({ $metadata: {} });
            const service = await buildService();
            expect(await service.checkConnection()).toBe(true);
            expect(send).toHaveBeenCalledWith(
                expect.any(GetSMSAttributesCommand)
            );
        });

        it('returns false when the provider rejects the check', async () => {
            send.mockRejectedValue(new Error('denied'));
            const service = await buildService();
            expect(await service.checkConnection()).toBe(false);
        });
    });

    describe('sendSms', () => {
        it('propagates provider errors unchanged', async () => {
            const error = new Error('private number +15550100');
            send.mockRejectedValue(error);
            const service = await buildService();

            await expect(
                service.sendSms({ phoneNumber: '+15550100', message: 'hello' })
            ).rejects.toBe(error);
        });
        it('is a no-op when credentials are missing', async () => {
            const service = await buildService({ 'aws.sns.iam.key': null });

            const result = await service.sendSms({
                phoneNumber: '+15550100',
                message: 'hello',
            });

            expect(service.isInitialized()).toBe(false);
            expect(SNSClient).not.toHaveBeenCalled();
            expect(send).not.toHaveBeenCalled();
            expect(result).toEqual({ $metadata: {} });
        });

        it('publishes with Transactional and the sender id', async () => {
            send.mockResolvedValue({ MessageId: 'm-1', $metadata: {} });
            const service = await buildService();

            const result = await service.sendSms({
                phoneNumber: '+15550100',
                message: 'hello',
            });

            expect(result).toEqual({ MessageId: 'm-1', $metadata: {} });
            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: {
                        PhoneNumber: '+15550100',
                        Message: 'hello',
                        MessageAttributes: {
                            'AWS.SNS.SMS.SMSType': {
                                DataType: 'String',
                                StringValue: 'Transactional',
                            },
                            'AWS.SNS.SMS.SenderID': {
                                DataType: 'String',
                                StringValue: 'ACK',
                            },
                        },
                    },
                })
            );
        });

        it('omits the sender id attribute when none is configured', async () => {
            send.mockResolvedValue({ $metadata: {} });
            const service = await buildService({ 'aws.sns.senderId': null });

            const result = await service.sendSms({
                phoneNumber: '+15550100',
                message: 'hello',
            });

            expect(result).toEqual({ $metadata: {} });
            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: {
                        PhoneNumber: '+15550100',
                        Message: 'hello',
                        MessageAttributes: {
                            'AWS.SNS.SMS.SMSType': {
                                DataType: 'String',
                                StringValue: 'Transactional',
                            },
                        },
                    },
                })
            );
        });
    });
});
