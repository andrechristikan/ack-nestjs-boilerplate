import { ConfigService } from '@nestjs/config';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import type { FileService } from '@common/file/services/file.service';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { IAwsS3ConfigBucket } from '@common/aws/interfaces/aws.interface';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/client-s3', () => {
    const actual = jest.requireActual('@aws-sdk/client-s3');

    return {
        ...actual,
        S3Client: jest.fn().mockImplementation(() => ({
            send: jest.fn().mockResolvedValue({}),
        })),
    };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://example.com/presigned'),
}));

jest.mock('mime', () => ({
    __esModule: true,
    default: { getType: jest.fn() },
}));

jest.mock('papaparse', () => ({
    __esModule: true,
    default: { unparse: jest.fn(), parse: jest.fn() },
}));

describe('AwsS3Service', () => {
    let service: AwsS3Service;
    let configService: jest.Mocked<ConfigService>;
    let fileService: jest.Mocked<FileService>;

    const bucketConfig: IAwsS3ConfigBucket = {
        region: 'us-east-1',
        bucket: 'my-bucket',
        baseUrl: 'https://my-bucket.s3.amazonaws.com',
        access: EnumAwsS3Accessibility.public,
        arn: 'arn:aws:s3:::my-bucket',
        cdnUrl: null,
    };

    const buildConfigService = (
        overrides: Record<string, unknown>
    ): jest.Mocked<ConfigService> =>
        ({
            get: jest.fn((key: string) => overrides[key]),
        }) as unknown as jest.Mocked<ConfigService>;

    beforeEach(() => {
        jest.clearAllMocks();

        fileService = {
            extractExtensionFromFilename: jest.fn().mockReturnValue('png'),
            extractMimeFromFilename: jest.fn().mockReturnValue('image/png'),
        } as unknown as jest.Mocked<FileService>;
    });

    describe('presignPutItem', () => {
        it('should pass presign expiry as seconds derived from presignExpiredInMs', async () => {
            configService = buildConfigService({
                'aws.s3.iam.key': 'key',
                'aws.s3.iam.secret': 'secret',
                'aws.s3.region': 'us-east-1',
                'aws.s3.maxAttempts': 3,
                'aws.s3.timeoutInMs': 30000,
                'aws.s3.config.public': bucketConfig,
                'aws.s3.config.private': bucketConfig,
                'aws.s3.presignExpiredInMs': 1_800_000,
                'aws.s3.multipartExpiredInMs': 259_200_000,
                'aws.s3.iam.arn': 'arn:aws:iam::123:role/role',
                'request.cors.allowedOrigin': ['https://example.com'],
            });

            service = new AwsS3Service(configService, fileService);
            service.onModuleInit();

            await service.presignPutItem(
                { key: 'uploads/file.png', size: 100 },
                { forceUpdate: true }
            );

            expect(getSignedUrl).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                { expiresIn: 1800 }
            );
        });
    });

    describe('settingBucketExpiredObjectLifecycle', () => {
        it('should set DaysAfterInitiation from multipartExpiredInMs', async () => {
            configService = buildConfigService({
                'aws.s3.iam.key': 'key',
                'aws.s3.iam.secret': 'secret',
                'aws.s3.region': 'us-east-1',
                'aws.s3.maxAttempts': 3,
                'aws.s3.timeoutInMs': 30000,
                'aws.s3.config.public': bucketConfig,
                'aws.s3.config.private': bucketConfig,
                'aws.s3.presignExpiredInMs': 1_800_000,
                'aws.s3.multipartExpiredInMs': 259_200_000,
                'aws.s3.iam.arn': 'arn:aws:iam::123:role/role',
                'request.cors.allowedOrigin': ['https://example.com'],
            });

            service = new AwsS3Service(configService, fileService);
            service.onModuleInit();

            const sendMock = (
                service as unknown as {
                    s3Client: { send: jest.Mock };
                }
            ).s3Client.send;

            await service.settingBucketExpiredObjectLifecycle();

            const command = sendMock.mock.calls[0][0] as {
                input: {
                    LifecycleConfiguration: {
                        Rules: {
                            AbortIncompleteMultipartUpload: {
                                DaysAfterInitiation: number;
                            };
                        }[];
                    };
                };
            };

            expect(
                command.input.LifecycleConfiguration.Rules[0]
                    .AbortIncompleteMultipartUpload.DaysAfterInitiation
            ).toBe(3);
        });
    });

    describe('settingCorsConfiguration', () => {
        it('should set CORS MaxAgeSeconds from corsMaxAge config in seconds', async () => {
            configService = buildConfigService({
                'aws.s3.iam.key': 'key',
                'aws.s3.iam.secret': 'secret',
                'aws.s3.region': 'us-east-1',
                'aws.s3.maxAttempts': 3,
                'aws.s3.timeoutInMs': 30000,
                'aws.s3.config.public': bucketConfig,
                'aws.s3.config.private': bucketConfig,
                'aws.s3.presignExpiredInMs': 1_800_000,
                'aws.s3.multipartExpiredInMs': 259_200_000,
                'aws.s3.corsMaxAgeLongInMs': 7_200_000,
                'aws.s3.corsMaxAgeShortInMs': 1_800_000,
                'aws.s3.iam.arn': 'arn:aws:iam::123:role/role',
                'request.cors.allowedOrigin': ['https://example.com'],
            });

            service = new AwsS3Service(configService, fileService);
            service.onModuleInit();

            const sendMock = (
                service as unknown as {
                    s3Client: { send: jest.Mock };
                }
            ).s3Client.send;

            await service.settingCorsConfiguration({
                access: EnumAwsS3Accessibility.public,
            });

            const command = sendMock.mock.calls[0][0] as {
                input: {
                    CORSConfiguration: {
                        CORSRules: { MaxAgeSeconds: number }[];
                    };
                };
            };

            const rules = command.input.CORSConfiguration.CORSRules;

            expect(rules[0].MaxAgeSeconds).toBe(7200);
            expect(rules[1].MaxAgeSeconds).toBe(1800);
        });

        it('should set CORS MaxAgeSeconds for the private CORS rule from corsMaxAgeShortInMs', async () => {
            configService = buildConfigService({
                'aws.s3.iam.key': 'key',
                'aws.s3.iam.secret': 'secret',
                'aws.s3.region': 'us-east-1',
                'aws.s3.maxAttempts': 3,
                'aws.s3.timeoutInMs': 30000,
                'aws.s3.config.public': bucketConfig,
                'aws.s3.config.private': bucketConfig,
                'aws.s3.presignExpiredInMs': 1_800_000,
                'aws.s3.multipartExpiredInMs': 259_200_000,
                'aws.s3.corsMaxAgeLongInMs': 7_200_000,
                'aws.s3.corsMaxAgeShortInMs': 1_800_000,
                'aws.s3.iam.arn': 'arn:aws:iam::123:role/role',
                'request.cors.allowedOrigin': ['https://example.com'],
            });

            service = new AwsS3Service(configService, fileService);
            service.onModuleInit();

            const sendMock = (
                service as unknown as {
                    s3Client: { send: jest.Mock };
                }
            ).s3Client.send;

            await service.settingCorsConfiguration({
                access: EnumAwsS3Accessibility.private,
            });

            const command = sendMock.mock.calls[0][0] as {
                input: {
                    CORSConfiguration: {
                        CORSRules: { MaxAgeSeconds: number }[];
                    };
                };
            };

            expect(
                command.input.CORSConfiguration.CORSRules[0].MaxAgeSeconds
            ).toBe(1800);
        });
    });
});
