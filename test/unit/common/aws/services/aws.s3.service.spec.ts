import { HttpStatus } from '@nestjs/common';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { NotFound } from '@aws-sdk/client-s3';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3MaxPartNumber } from '@common/aws/constants/aws.constant';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import type {
    IAwsS3,
    IAwsS3ConfigBucket,
    IAwsS3ConfigBucketSource,
    IAwsS3Multipart,
    IAwsS3MultipartPart,
} from '@common/aws/interfaces/aws.interface';
import type { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import type { AwsS3PresignPartRequestDto } from '@common/aws/dtos/request/aws.s3-presign-part.request.dto';
import type { FileService } from '@common/file/services/file.service';
import type { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    createAwsS3Service,
    createInitializedAwsS3Service,
    expectAwsS3FileRequired,
    expectAwsS3IterationLimitExceeded,
    expectAwsS3KeyInvalid,
    expectAwsS3MaxPartNumberExceeded,
    expectAwsS3ObjectExist,
    fillPatternStub,
} from '@test/unit/helpers/test.unit.aws.helper';
import type { IAwsS3ServiceDoubles } from '@test/unit/helpers/test.unit.aws.helper';

vi.mock('@aws-sdk/client-s3', async importOriginal => {
    const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();

    return { ...actual, S3Client: vi.fn() };
});
vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn(),
}));

describe('AwsS3Service', () => {
    const send = vi.fn();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let S3Client: typeof import('@aws-sdk/client-s3').S3Client;
    let getSignedUrl: typeof import('@aws-sdk/s3-request-presigner').getSignedUrl;

    const publicSource: IAwsS3ConfigBucketSource = {
        region: 'us-east-1',
        bucket: 'public-bucket',
        arn: 'arn:aws:s3:::public-bucket',
        cdnUrl: 'https://cdn.example.com',
    };
    const privateSource: IAwsS3ConfigBucketSource = {
        region: 'us-east-1',
        bucket: 'private-bucket',
        arn: 'arn:aws:s3:::private-bucket',
        cdnUrl: null,
    };
    const publicConfig: IAwsS3ConfigBucket = {
        ...publicSource,
        baseUrl: 'https://public-bucket.s3.us-east-1.amazonaws.com',
        access: EnumAwsS3Accessibility.public,
    };
    const privateConfig: IAwsS3ConfigBucket = {
        ...privateSource,
        baseUrl: 'https://private-bucket.s3.us-east-1.amazonaws.com',
        access: EnumAwsS3Accessibility.private,
    };
    const amazonawsBaseUrlPattern =
        'https://{bucket}.s3.{region}.amazonaws.com';
    const endpointBaseUrlPattern = '{endpoint}/{bucket}';

    const configValues: Record<string, unknown> = {
        'aws.s3.iam.key': 'access-key',
        'aws.s3.iam.secret': 'secret-key',
        'aws.s3.iam.arn': 'arn:aws:iam::123456789012:role/role',
        'aws.s3.region': 'us-east-1',
        'aws.s3.endpoint': null,
        'aws.s3.maxAttempts': 3,
        'aws.s3.timeoutInMs': 5000,
        'aws.s3.config.public': publicSource,
        'aws.s3.config.private': privateSource,
        'aws.s3.presignExpiredInSeconds': 1800,
        'aws.s3.multipartExpiredInDays': 3,
        'aws.s3.corsMaxAgeLongInSeconds': 86400,
        'aws.s3.corsMaxAgeShortInSeconds': 3600,
        'aws.s3.baseUrlPattern': amazonawsBaseUrlPattern,
        'aws.s3.objectUrlPattern': '{baseUrl}/{key}',
        'aws.s3.cdnUrlPattern': '{cdnUrl}/{key}',
        'request.cors.allowedOrigin': ['https://app.example.com'],
    };

    const s3Doubles: IAwsS3ServiceDoubles = {
        fileService,
        helperStringService,
    };

    const notFoundError = new NotFound({ $metadata: {}, message: 'Not Found' });

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ S3Client } = await import('@aws-sdk/client-s3'));
        ({ getSignedUrl } = await import('@aws-sdk/s3-request-presigner'));

        send.mockReset();
        vi.mocked(S3Client).mockImplementation(function AwsS3ClientDouble() {
            return { send } as unknown as InstanceType<typeof S3Client>;
        });
        vi.mocked(getSignedUrl).mockResolvedValue(
            'https://presigned.example.com'
        );

        fileService.extractExtensionFromFilename.mockImplementation(
            (filename: string) => filename.split('.').pop() ?? ''
        );
        fileService.extractMimeFromFilename.mockReturnValue('image/jpeg');
        helperStringService.fillPattern.mockImplementation(fillPatternStub);
    });

    describe('onModuleInit', () => {
        it('does not create a client when the access key is missing', async () => {
            const service = await createAwsS3Service(
                configValues,
                { 'aws.s3.iam.key': null },
                s3Doubles
            );

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(S3Client).not.toHaveBeenCalled();
        });

        it('does not create a client when the secret key is missing', async () => {
            const service = await createAwsS3Service(
                configValues,
                { 'aws.s3.iam.secret': null },
                s3Doubles
            );

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(S3Client).not.toHaveBeenCalled();
        });

        it('does not create a client when the region is missing', async () => {
            const service = await createAwsS3Service(
                configValues,
                { 'aws.s3.region': null },
                s3Doubles
            );

            service.onModuleInit();

            expect(service.isInitialized()).toBe(false);
            expect(S3Client).not.toHaveBeenCalled();
        });

        it('creates a client when every credential is present', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            service.onModuleInit();

            expect(service.isInitialized()).toBe(true);
            expect(S3Client).toHaveBeenCalledWith({
                credentials: {
                    accessKeyId: 'access-key',
                    secretAccessKey: 'secret-key',
                },
                region: 'us-east-1',
                maxAttempts: 3,
                requestHandler: { requestTimeout: 5000 },
            });
        });

        it('builds the client with endpoint and path style when aws.s3.endpoint is set', async () => {
            const service = await createAwsS3Service(
                configValues,
                { 'aws.s3.endpoint': 'http://localhost:4566' },
                s3Doubles
            );

            service.onModuleInit();

            expect(S3Client).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: 'http://localhost:4566',
                    forcePathStyle: true,
                })
            );
        });

        it('builds the client without endpoint or path style when aws.s3.endpoint is null', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            service.onModuleInit();

            expect(S3Client).toHaveBeenCalledWith(
                expect.not.objectContaining({ endpoint: expect.anything() })
            );
            expect(S3Client).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    forcePathStyle: expect.anything(),
                })
            );
        });
    });

    describe('isInitialized', () => {
        it('is false before onModuleInit runs', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            expect(service.isInitialized()).toBe(false);
        });

        it('is true after onModuleInit creates the client', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            expect(service.isInitialized()).toBe(true);
        });
    });

    describe('checkConnection', () => {
        it('returns false when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(service.checkConnection()).resolves.toBe(false);
        });

        it('returns true when the client answers', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expect(service.checkConnection()).resolves.toBe(true);
        });

        it('returns false when the client throws', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(new Error('down'));

            await expect(service.checkConnection()).resolves.toBe(false);
        });
    });

    describe('checkBucket', () => {
        it('returns false when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.checkBucket({ access: EnumAwsS3Accessibility.public })
            ).resolves.toBe(false);
        });

        it('returns true when the bucket answers', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expect(
                service.checkBucket({ access: EnumAwsS3Accessibility.public })
            ).resolves.toBe(true);
        });
    });

    describe('checkItem', () => {
        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.checkItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.checkItem('/users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('returns the item metadata', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({ ContentLength: 2048 });

            await expect(
                service.checkItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toEqual({
                bucket: 'public-bucket',
                key: 'users/avatar.jpg',
                completedUrl:
                    'https://public-bucket.s3.us-east-1.amazonaws.com/users/avatar.jpg',
                cdnUrl: 'https://cdn.example.com/users/avatar.jpg',
                extension: 'jpg',
                size: 2048,
                mime: 'image/jpeg',
                access: EnumAwsS3Accessibility.public,
            });
        });

        it('defaults size to 0 when ContentLength is absent', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            const result = await service.checkItem('users/avatar.jpg', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(result?.size).toBe(0);
        });
    });

    describe('getItems', () => {
        it('returns an empty array when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.getItems('users/', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toEqual([]);
        });

        it('throws when the path starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.getItems('/users/', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('returns an empty array when a page carries no contents', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expect(
                service.getItems('users/', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toEqual([]);
        });

        it('walks every page and maps each item', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({
                Contents: [{ Key: 'users/one.jpg', Size: 10 }],
                IsTruncated: true,
                NextContinuationToken: 'token-1',
            });
            send.mockResolvedValueOnce({
                Contents: [{ Key: 'users/two.jpg', Size: 20 }],
                IsTruncated: false,
            });

            const result = await service.getItems('users/', {
                access: EnumAwsS3Accessibility.public,
                continuationToken: 'initial-token',
            });

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ key: 'users/one.jpg', size: 10 });
            expect(result[1]).toMatchObject({ key: 'users/two.jpg', size: 20 });
            expect(send).toHaveBeenCalledTimes(2);
        });

        it('defaults an item size to 0 when Size is absent', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({
                Contents: [{ Key: 'users/one.jpg' }],
            });

            const result = await service.getItems('users/', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(result[0]).toMatchObject({ size: 0 });
        });
    });

    describe('getItem', () => {
        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.getItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.getItem('/users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('returns the item with its body', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({ ContentLength: 512, Body: 'stream' });

            await expect(
                service.getItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({ size: 512, data: 'stream' });
        });

        it('defaults size to 0 when ContentLength is absent', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            const result = await service.getItem('users/avatar.jpg', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(result?.size).toBe(0);
        });
    });

    describe('putItem', () => {
        const file = Buffer.from('content');

        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.putItem(
                    { key: 'users/avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.putItem(
                    { key: '/users/avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('throws when the file is missing', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3FileRequired(
                service.putItem(
                    {
                        key: 'users/avatar.jpg',
                        size: 0,
                        file: undefined as unknown as Buffer,
                    },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('throws on a path-traversal key', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.putItem(
                    { key: 'users/../avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('throws on a double-slash key', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.putItem(
                    { key: 'users//avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('skips the existence check when forceUpdate is true', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.putItem(
                { key: 'users/avatar.jpg', size: file.length, file },
                { access: EnumAwsS3Accessibility.public, forceUpdate: true }
            );

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('proceeds when the head check reports the key missing', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);
            send.mockResolvedValueOnce({});

            await expect(
                service.putItem(
                    { key: 'users/avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            ).resolves.toMatchObject({ key: 'users/avatar.jpg' });
            expect(send).toHaveBeenCalledTimes(2);
        });

        it('throws when the key already exists', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expectAwsS3ObjectExist(
                service.putItem(
                    { key: 'users/avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('rethrows an unrelated head-check error', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            const error = new Error('network down');
            send.mockRejectedValueOnce(error);

            await expect(
                service.putItem(
                    { key: 'users/avatar.jpg', size: file.length, file },
                    { access: EnumAwsS3Accessibility.public }
                )
            ).rejects.toBe(error);
        });

        it('defaults size to 0 when the file carries none', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);
            send.mockResolvedValueOnce({});

            const result = await service.putItem(
                {
                    key: 'users/avatar.jpg',
                    size: undefined as unknown as number,
                    file,
                },
                { access: EnumAwsS3Accessibility.public }
            );

            expect(result?.size).toBe(0);
        });
    });

    describe('deleteItem', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.deleteItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.deleteItem('/users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('deletes the item', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.deleteItem('users/avatar.jpg', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteItems', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.deleteItems(['users/avatar.jpg'], {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('throws when a key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.deleteItems(['/users/avatar.jpg'], {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('deletes every key', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.deleteItems(['users/avatar.jpg', 'users/cover.jpg'], {
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteDir', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.deleteDir('users/', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('throws when the path starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.deleteDir('/users/', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('skips the delete call when a page carries no contents', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.deleteDir('users/', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('deletes every listed page until the listing stops', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({
                Contents: [{ Key: 'users/one.jpg' }],
                NextContinuationToken: 'token-1',
            });
            send.mockResolvedValueOnce({});
            send.mockResolvedValueOnce({});

            await service.deleteDir('users/', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(3);
        });

        it('throws after exceeding the max iteration budget', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockImplementation(() =>
                Promise.resolve({
                    Contents: [{ Key: 'users/one.jpg' }],
                    NextContinuationToken: 'token',
                })
            );

            await expectAwsS3IterationLimitExceeded(
                service.deleteDir('users/', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });
    });

    describe('createMultiPart', () => {
        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.createMultiPart(
                    { key: 'users/video.mp4', size: 1000 },
                    10,
                    { access: EnumAwsS3Accessibility.public }
                )
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.createMultiPart(
                    { key: '/users/video.mp4', size: 1000 },
                    10,
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('throws when maxPartNumber exceeds the cap', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3MaxPartNumberExceeded(
                service.createMultiPart(
                    { key: 'users/video.mp4', size: 1000 },
                    AwsS3MaxPartNumber + 1,
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('skips the existence check when forceUpdate is true', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({ UploadId: 'upload-1' });

            const result = await service.createMultiPart(
                { key: 'users/video.mp4', size: 1000 },
                10,
                { access: EnumAwsS3Accessibility.public, forceUpdate: true }
            );

            expect(result).toMatchObject({ uploadId: 'upload-1' });
        });

        it('proceeds when the head check reports the key missing', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);
            send.mockResolvedValueOnce({ UploadId: 'upload-1' });

            await expect(
                service.createMultiPart(
                    { key: 'users/video.mp4', size: 1000 },
                    10,
                    { access: EnumAwsS3Accessibility.public }
                )
            ).resolves.toMatchObject({ uploadId: 'upload-1' });
        });

        it('throws when the key already exists', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expectAwsS3ObjectExist(
                service.createMultiPart(
                    { key: 'users/video.mp4', size: 1000 },
                    10,
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('rethrows an unrelated head-check error', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            const error = new Error('network down');
            send.mockRejectedValueOnce(error);

            await expect(
                service.createMultiPart(
                    { key: 'users/video.mp4', size: 1000 },
                    10,
                    { access: EnumAwsS3Accessibility.public }
                )
            ).rejects.toBe(error);
        });

        it('defaults size to 0 when the file carries none', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);
            send.mockResolvedValueOnce({ UploadId: 'upload-1' });

            const result = await service.createMultiPart(
                {
                    key: 'users/video.mp4',
                    size: undefined as unknown as number,
                },
                10,
                { access: EnumAwsS3Accessibility.public }
            );

            expect(result?.size).toBe(0);
        });
    });

    describe('putItemMultiPart', () => {
        const multipart: IAwsS3Multipart = {
            bucket: 'public-bucket',
            key: 'users/video.mp4',
            completedUrl: 'https://public.example.com/users/video.mp4',
            cdnUrl: null,
            extension: 'mp4',
            mime: 'video/mp4',
            access: EnumAwsS3Accessibility.public,
            size: 1000,
            uploadId: 'upload-1',
            lastPartNumber: 0,
            maxPartNumber: 10,
            parts: [],
        };

        it('returns the multipart unchanged when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            const result = await service.putItemMultiPart(
                { ...multipart, parts: [] },
                1,
                Buffer.from('part'),
                { access: EnumAwsS3Accessibility.public }
            );

            expect(result.parts).toEqual([]);
        });

        it('appends the uploaded part', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({ ETag: 'etag-1' });

            const result = await service.putItemMultiPart(
                { ...multipart, parts: [] },
                1,
                Buffer.from('part'),
                { access: EnumAwsS3Accessibility.public }
            );

            expect(result.parts).toEqual([
                { eTag: 'etag-1', partNumber: 1, size: 4 },
            ]);
            expect(result.lastPartNumber).toBe(1);
        });
    });

    describe('completeMultipart', () => {
        const parts: IAwsS3MultipartPart[] = [
            { eTag: 'etag-1', partNumber: 1, size: 4 },
            { eTag: '"etag-2"', partNumber: 2, size: 4 },
        ];

        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.completeMultipart(
                    'users/video.mp4',
                    'upload-1',
                    parts,
                    { access: EnumAwsS3Accessibility.public }
                )
            ).resolves.toBeUndefined();
        });

        it('quotes every eTag and completes the upload', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.completeMultipart(
                'users/video.mp4',
                'upload-1',
                parts,
                { access: EnumAwsS3Accessibility.public }
            );

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('abortMultipart', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.abortMultipart('users/video.mp4', 'upload-1', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('aborts the upload', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.abortMultipart('users/video.mp4', 'upload-1', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('presignGetItem', () => {
        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.presignGetItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.presignGetItem('/users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('presigns when the head check reports the key missing', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);

            await expect(
                service.presignGetItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({
                key: 'users/avatar.jpg',
                presignUrl: 'https://presigned.example.com',
                expiredInSeconds: 1800,
            });
        });

        it('presigns when the head check succeeds', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expect(
                service.presignGetItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({ key: 'users/avatar.jpg' });
        });

        it('rethrows an unrelated head-check error', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            const error = new Error('network down');
            send.mockRejectedValueOnce(error);

            await expect(
                service.presignGetItem('users/avatar.jpg', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).rejects.toBe(error);
        });

        it('uses the given expiry over the default', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);

            const result = await service.presignGetItem('users/avatar.jpg', {
                access: EnumAwsS3Accessibility.public,
                expiredInSeconds: 60,
            });

            expect(result?.expiredInSeconds).toBe(60);
        });
    });

    describe('presignPutItem', () => {
        const dto: AwsS3PresignRequestDto = {
            key: 'users/avatar.jpg',
            size: 1024,
        };

        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.presignPutItem(dto, {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.presignPutItem(
                    { ...dto, key: '/users/avatar.jpg' },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('skips the existence check when forceUpdate is true', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.presignPutItem(dto, {
                    access: EnumAwsS3Accessibility.public,
                    forceUpdate: true,
                })
            ).resolves.toMatchObject({ key: dto.key });
            expect(send).not.toHaveBeenCalled();
        });

        it('presigns when the head check reports the key missing', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockRejectedValueOnce(notFoundError);

            await expect(
                service.presignPutItem(dto, {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({ key: dto.key });
        });

        it('throws when the key already exists', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expectAwsS3ObjectExist(
                service.presignPutItem(dto, {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('rethrows an unrelated head-check error', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            const error = new Error('network down');
            send.mockRejectedValueOnce(error);

            await expect(
                service.presignPutItem(dto, {
                    access: EnumAwsS3Accessibility.public,
                })
            ).rejects.toBe(error);
        });

        it('uses the given expiry over the default', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            const result = await service.presignPutItem(dto, {
                access: EnumAwsS3Accessibility.public,
                forceUpdate: true,
                expiredInSeconds: 60,
            });

            expect(result?.expiredInSeconds).toBe(60);
        });
    });

    describe('presignPutItemPart', () => {
        const dto: AwsS3PresignPartRequestDto = {
            key: 'users/video.mp4',
            size: 1024,
            partNumber: 1,
            uploadId: 'upload-1',
        };

        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.presignPutItemPart(dto, {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeNull();
        });

        it('throws when the key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.presignPutItemPart(
                    { ...dto, key: '/users/video.mp4' },
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('presigns the part upload', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.presignPutItemPart(dto, {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({
                key: dto.key,
                partNumber: dto.partNumber,
                size: dto.size,
                presignUrl: 'https://presigned.example.com',
                expiredInSeconds: 1800,
            });
        });

        it('uses the given expiry over the default', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            const result = await service.presignPutItemPart(dto, {
                access: EnumAwsS3Accessibility.public,
                expiredInSeconds: 60,
            });

            expect(result?.expiredInSeconds).toBe(60);
        });
    });

    describe('mapPresign', () => {
        const dto: AwsS3PresignRequestDto = {
            key: 'users/avatar.jpg',
            size: 1024,
        };

        it('throws when the key starts with "/"', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            let thrown: unknown;
            try {
                service.mapPresign(
                    { ...dto, key: '/users/avatar.jpg' },
                    { access: EnumAwsS3Accessibility.public }
                );
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3KeyInvalid,
                statusCodeKey:
                    EnumAwsStatusCodeError[EnumAwsStatusCodeError.s3KeyInvalid],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.s3KeyInvalid',
            });
        });

        it('maps a presign request into an S3 item, defaulting a missing mime', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            fileService.extractMimeFromFilename.mockReturnValueOnce(null);

            const result = service.mapPresign(dto, {
                access: EnumAwsS3Accessibility.public,
            });

            expect(result).toEqual({
                bucket: 'public-bucket',
                key: dto.key,
                completedUrl:
                    'https://public-bucket.s3.us-east-1.amazonaws.com/users/avatar.jpg',
                cdnUrl: 'https://cdn.example.com/users/avatar.jpg',
                extension: 'jpg',
                size: dto.size,
                mime: 'application/octet-stream',
                access: EnumAwsS3Accessibility.public,
            });
        });

        it('maps a presign request with no cdn configured', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            const result = service.mapPresign(dto, {
                access: EnumAwsS3Accessibility.private,
            });

            expect(result.cdnUrl).toBeNull();
        });
    });

    describe('copyItem', () => {
        const source: IAwsS3 = {
            bucket: 'private-bucket',
            key: 'users/avatar.jpg',
            completedUrl: 'https://private.example.com/users/avatar.jpg',
            cdnUrl: null,
            extension: 'jpg',
            mime: 'image/jpeg',
            access: EnumAwsS3Accessibility.private,
            size: 1024,
        };

        it('returns null when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.copyItem(source, 'archive', {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeNull();
        });

        it('throws when the source key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.copyItem(
                    { ...source, key: '/users/avatar.jpg' },
                    'archive',
                    {
                        accessFrom: EnumAwsS3Accessibility.private,
                        accessTo: EnumAwsS3Accessibility.public,
                    }
                )
            );
        });

        it('throws when the destination starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.copyItem(source, '/archive', {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('copies the item to the destination bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expect(
                service.copyItem(source, 'archive', {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({
                bucket: 'public-bucket',
                key: 'archive/avatar.jpg',
                access: EnumAwsS3Accessibility.public,
            });
        });
    });

    describe('copyItems', () => {
        const sources: IAwsS3[] = [
            {
                bucket: 'private-bucket',
                key: 'users/one.jpg',
                completedUrl: 'https://private.example.com/users/one.jpg',
                cdnUrl: null,
                extension: 'jpg',
                mime: 'image/jpeg',
                access: EnumAwsS3Accessibility.private,
                size: 1024,
            },
            {
                bucket: 'private-bucket',
                key: 'users/two.jpg',
                completedUrl: 'https://private.example.com/users/two.jpg',
                cdnUrl: null,
                extension: 'jpg',
                mime: 'image/jpeg',
                access: EnumAwsS3Accessibility.private,
                size: 2048,
            },
        ];

        it('returns an empty array when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.copyItems(sources, 'archive', {
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toEqual([]);
        });

        it('throws when a source key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.copyItems(
                    [{ ...sources[0], key: '/users/one.jpg' }],
                    'archive',
                    { access: EnumAwsS3Accessibility.public }
                )
            );
        });

        it('throws when the destination starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service.copyItems(sources, '/archive', {
                    access: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('filters out a copy that fails', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});
            send.mockRejectedValueOnce(new Error('copy failed'));

            const result = await service.copyItems(sources, 'archive', {
                access: EnumAwsS3Accessibility.public,
            });

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ key: 'archive/one.jpg' });
        });
    });

    describe('settingBucketExpiredObjectLifecycle', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.settingBucketExpiredObjectLifecycle({
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('sets the lifecycle configuration', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingBucketExpiredObjectLifecycle({
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('settingBucketPolicy', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.settingBucketPolicy({
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('sets a public read policy for the public bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingBucketPolicy({
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('writes a null IAM principal when no IAM ARN is configured', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                { 'aws.s3.iam.arn': null },
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingBucketPolicy({
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Policy: expect.stringContaining(
                            '"Principal":{"AWS":null}'
                        ),
                    }),
                })
            );
        });

        it('deletes the bucket policy for the private bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingBucketPolicy({
                access: EnumAwsS3Accessibility.private,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('settingCorsConfiguration', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.settingCorsConfiguration({
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('sets the public CORS rules for the public bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingCorsConfiguration({
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('sets the restricted CORS rules for the private bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingCorsConfiguration({
                access: EnumAwsS3Accessibility.private,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('settingDisableAclConfiguration', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.settingDisableAclConfiguration({
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('disables ACLs on the bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingDisableAclConfiguration({
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('settingBlockPublicAccessConfiguration', () => {
        it('returns when not initialized', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expect(
                service.settingBlockPublicAccessConfiguration({
                    access: EnumAwsS3Accessibility.public,
                })
            ).resolves.toBeUndefined();
        });

        it('allows a public policy on the public bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingBlockPublicAccessConfiguration({
                access: EnumAwsS3Accessibility.public,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('blocks every public policy on the private bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await service.settingBlockPublicAccessConfiguration({
                access: EnumAwsS3Accessibility.private,
            });

            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe('getConfig', () => {
        it('returns the public bucket config for the public accessibility', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            expect(service['getConfig'](EnumAwsS3Accessibility.public)).toEqual(
                publicConfig
            );
        });

        it('returns the private bucket config for the private accessibility', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            expect(
                service['getConfig'](EnumAwsS3Accessibility.private)
            ).toEqual(privateConfig);
        });
    });

    describe('baseUrlPattern', () => {
        it('fills the bucket base url from the amazonaws pattern', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            const result = service.mapPresign(
                { key: 'users/avatar.jpg', size: 1024 },
                { access: EnumAwsS3Accessibility.public }
            );

            expect(result.completedUrl).toBe(
                'https://public-bucket.s3.us-east-1.amazonaws.com/users/avatar.jpg'
            );
        });

        it('fills the bucket base url from the endpoint pattern when an endpoint is set', async () => {
            const service = await createAwsS3Service(
                configValues,
                {
                    'aws.s3.endpoint': 'http://localhost:4566',
                    'aws.s3.baseUrlPattern': endpointBaseUrlPattern,
                },
                s3Doubles
            );

            const result = service.mapPresign(
                { key: 'users/avatar.jpg', size: 1024 },
                { access: EnumAwsS3Accessibility.private }
            );

            expect(result.completedUrl).toBe(
                'http://localhost:4566/private-bucket/users/avatar.jpg'
            );
        });

        it('fills the region as an empty string when only the endpoint is set', async () => {
            const service = await createAwsS3Service(
                configValues,
                {
                    'aws.s3.region': null,
                    'aws.s3.endpoint': 'http://localhost:4566',
                    'aws.s3.baseUrlPattern': '{endpoint}/{bucket}/{region}',
                },
                s3Doubles
            );

            expect(
                service['getConfig'](EnumAwsS3Accessibility.private).baseUrl
            ).toBe('http://localhost:4566/private-bucket/');
        });

        it('keeps a null base url when the bucket is missing', async () => {
            const service = await createAwsS3Service(
                configValues,
                { 'aws.s3.config.public': { ...publicSource, bucket: null } },
                s3Doubles
            );

            expect(
                service['getConfig'](EnumAwsS3Accessibility.public).baseUrl
            ).toBeNull();
        });

        it('keeps a null base url when the region and the endpoint are missing', async () => {
            const service = await createAwsS3Service(
                configValues,
                { 'aws.s3.region': null },
                s3Doubles
            );

            expect(
                service['getConfig'](EnumAwsS3Accessibility.private).baseUrl
            ).toBeNull();
        });
    });

    describe('getFileInfoFromKey', () => {
        it('extracts the path, filename, extension, and mime from a key', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            fileService.extractExtensionFromFilename.mockReturnValueOnce('jpg');
            fileService.extractMimeFromFilename.mockReturnValueOnce(
                'image/jpeg'
            );

            expect(service['getFileInfoFromKey']('users/avatar.jpg')).toEqual({
                pathWithFilename: '/users/avatar.jpg',
                filename: 'avatar.jpg',
                extension: 'jpg',
                mime: 'image/jpeg',
            });
        });

        it('defaults the mime to application/octet-stream when none is found', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            fileService.extractExtensionFromFilename.mockReturnValueOnce('');
            fileService.extractMimeFromFilename.mockReturnValueOnce(null);

            const info = service['getFileInfoFromKey']('avatar');

            expect(info.mime).toBe('application/octet-stream');
        });
    });

    describe('buildUrls', () => {
        it('builds the completed and cdn urls when the config carries a cdn url', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            helperStringService.fillPattern
                .mockReturnValueOnce('https://public.example.com/avatar.jpg')
                .mockReturnValueOnce('https://cdn.example.com/avatar.jpg');

            expect(service['buildUrls'](publicConfig, 'avatar.jpg')).toEqual({
                completedUrl: 'https://public.example.com/avatar.jpg',
                cdnUrl: 'https://cdn.example.com/avatar.jpg',
            });
        });

        it('fills the base url as an empty string when the config carries none', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            expect(
                service['buildUrls'](
                    { ...privateConfig, baseUrl: null },
                    'avatar.jpg'
                )
            ).toEqual({ completedUrl: '/avatar.jpg', cdnUrl: null });
        });

        it('returns a null cdn url when the config carries none', async () => {
            const service = await createAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            helperStringService.fillPattern.mockReturnValueOnce(
                'https://private.example.com/avatar.jpg'
            );

            expect(service['buildUrls'](privateConfig, 'avatar.jpg')).toEqual({
                completedUrl: 'https://private.example.com/avatar.jpg',
                cdnUrl: null,
            });
        });
    });

    describe('copyItemInitialized', () => {
        const source: IAwsS3 = {
            bucket: 'private-bucket',
            key: 'users/avatar.jpg',
            completedUrl: 'https://private.example.com/users/avatar.jpg',
            cdnUrl: null,
            extension: 'jpg',
            mime: 'image/jpeg',
            access: EnumAwsS3Accessibility.private,
            size: 1024,
        };

        it('throws when the source key starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service['copyItemInitialized'](
                    { ...source, key: '/users/avatar.jpg' },
                    'archive',
                    {
                        accessFrom: EnumAwsS3Accessibility.private,
                        accessTo: EnumAwsS3Accessibility.public,
                    }
                )
            );
        });

        it('throws when the destination starts with "/"', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );

            await expectAwsS3KeyInvalid(
                service['copyItemInitialized'](source, '/archive', {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                })
            );
        });

        it('copies the item to the destination bucket', async () => {
            const service = await createInitializedAwsS3Service(
                configValues,
                {},
                s3Doubles
            );
            send.mockResolvedValueOnce({});

            await expect(
                service['copyItemInitialized'](source, 'archive', {
                    accessFrom: EnumAwsS3Accessibility.private,
                    accessTo: EnumAwsS3Accessibility.public,
                })
            ).resolves.toMatchObject({
                bucket: 'public-bucket',
                key: 'archive/avatar.jpg',
                access: EnumAwsS3Accessibility.public,
            });
        });
    });
});
