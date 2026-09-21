import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    ListBucketsCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    UploadPartCommand,
    NotFound,
} from '@aws-sdk/client-s3';

import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type {
    IAwsS3,
    IAwsS3Multipart,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { FileService } from '@common/file/services/file.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

const presignerMocks = vi.hoisted(() => ({ getSignedUrl: vi.fn() }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: presignerMocks.getSignedUrl,
}));

describe('AwsS3Service', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const send = vi.fn();
    const publicOptions = { access: EnumAwsS3Accessibility.public };
    const source: IAwsS3 = {
        bucket: 'private-bucket',
        key: 'source/file.txt',
        completedUrl: 'source-url',
        cdnUrl: null,
        extension: 'txt',
        mime: 'text/plain',
        access: EnumAwsS3Accessibility.private,
        size: 4,
    };

    const createService = (credentials = true): AwsS3Service => {
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'aws.s3.iam.key': credentials ? 'key' : null,
                        'aws.s3.iam.secret': credentials ? 'secret' : null,
                        'aws.s3.region': credentials ? 'eu-west-1' : null,
                        'aws.s3.maxAttempts': 2,
                        'aws.s3.timeoutInMs': 1_000,
                        'aws.s3.config.public': {
                            bucket: 'public-bucket',
                            baseUrl: 'https://s3.example.com',
                            cdnUrl: 'https://cdn.example.com',
                            arn: 'public-arn',
                            region: 'eu-west-1',
                        },
                        'aws.s3.config.private': {
                            bucket: 'private-bucket',
                            baseUrl: 'https://private.example.com',
                            cdnUrl: null,
                            arn: 'private-arn',
                            region: 'eu-west-1',
                        },
                        'aws.s3.presignExpiredInSeconds': 900,
                        'aws.s3.multipartExpiredInDays': 1,
                        'aws.s3.corsMaxAgeLongInSeconds': 3600,
                        'aws.s3.corsMaxAgeShortInSeconds': 60,
                        'aws.s3.objectUrlPattern': '{baseUrl}/{key}',
                        'aws.s3.cdnUrlPattern': '{cdnUrl}/{key}',
                        'aws.s3.iam.arn': 'iam-arn',
                        'request.cors.allowedOrigin': ['https://example.com'],
                    })[String(key)]
            )
        );
        fileService.extractExtensionFromFilename.mockReturnValue('txt');
        fileService.extractMimeFromFilename.mockReturnValue('text/plain');
        helperStringService.fillPattern.mockImplementation((pattern, values) =>
            pattern
                .replace('{baseUrl}', String(values.baseUrl))
                .replace('{cdnUrl}', String(values.cdnUrl))
                .replace('{key}', String(values.key))
        );
        return new AwsS3Service(
            configService,
            fileService,
            helperStringService
        );
    };

    const initialized = (): AwsS3Service => {
        const service = createService();
        Reflect.set(service, 's3Client', { send });
        return service;
    };

    beforeEach(() => {
        vi.resetAllMocks();
        presignerMocks.getSignedUrl.mockResolvedValue(
            'https://signed.example.com'
        );
    });

    it('stays disabled without credentials and initializes with complete credentials', () => {
        const disabled = createService(false);
        disabled.onModuleInit();
        expect(disabled.isInitialized()).toBe(false);
        const enabled = createService();
        enabled.onModuleInit();
        expect(enabled.isInitialized()).toBe(true);
    });

    it('checks connectivity and buckets at the SDK boundary', async () => {
        await expect(createService(false).checkConnection()).resolves.toBe(
            false
        );
        const service = initialized();
        send.mockResolvedValue({});
        await expect(service.checkConnection()).resolves.toBe(true);
        expect(send).toHaveBeenNthCalledWith(1, expect.any(ListBucketsCommand));
        send.mockRejectedValueOnce(new Error('offline'));
        await expect(service.checkConnection()).resolves.toBe(false);
        send.mockResolvedValueOnce({});
        await expect(service.checkBucket(publicOptions)).resolves.toBe(true);
        expect(send).toHaveBeenNthCalledWith(3, expect.any(HeadBucketCommand));
    });

    it('looks up, lists, and gets objects with project URL and file metadata', async () => {
        const service = initialized();
        send.mockImplementation(command => {
            if (command instanceof HeadObjectCommand)
                return { ContentLength: 4 };
            if (command instanceof GetObjectCommand)
                return { Body: 'body', ContentLength: 4 };
            if (command instanceof ListObjectsV2Command)
                return {
                    Contents: [{ Key: 'dir/file.txt', Size: 4 }],
                    IsTruncated: false,
                };
            return {};
        });
        await expect(
            service.checkItem('dir/file.txt', publicOptions)
        ).resolves.toEqual(
            expect.objectContaining({
                key: 'dir/file.txt',
                size: 4,
                cdnUrl: 'https://cdn.example.com/dir/file.txt',
            })
        );
        await expect(service.getItems('dir/', publicOptions)).resolves.toEqual([
            expect.objectContaining({ key: 'dir/file.txt', size: 4 }),
        ]);
        await expect(
            service.getItem('dir/file.txt', publicOptions)
        ).resolves.toEqual(
            expect.objectContaining({ data: 'body', mime: 'text/plain' })
        );
    });

    it('puts and deletes single and multiple objects', async () => {
        const service = initialized();
        send.mockResolvedValue({});
        await expect(
            service.putItem(
                { key: 'dir/file.txt', file: Buffer.from('data'), size: 4 },
                { ...publicOptions, forceUpdate: true }
            )
        ).resolves.toEqual(
            expect.objectContaining({ key: 'dir/file.txt', size: 4 })
        );
        await service.deleteItem('dir/file.txt', publicOptions);
        await service.deleteItems(['dir/a.txt', 'dir/b.txt'], publicOptions);
        expect(send).toHaveBeenNthCalledWith(1, expect.any(PutObjectCommand));
        expect(send).toHaveBeenNthCalledWith(
            2,
            expect.any(DeleteObjectCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            3,
            expect.any(DeleteObjectsCommand)
        );
    });

    it('enforces object creation requirements and existing-key protection', async () => {
        const service = initialized();
        await expect(
            Reflect.apply(service.putItem, service, [
                { key: 'dir/file.txt', size: 1 },
                publicOptions,
            ])
        ).rejects.toThrow(Error);
        send.mockResolvedValueOnce({});
        await expect(
            service.putItem(
                { key: 'dir/file.txt', file: Buffer.from('x'), size: 1 },
                publicOptions
            )
        ).rejects.toThrow(Error);
        send.mockRejectedValueOnce(
            new NotFound({ $metadata: {}, message: 'missing' })
        ).mockResolvedValueOnce({});
        await expect(
            service.putItem(
                { key: 'dir/file.txt', file: Buffer.from('x'), size: 1 },
                publicOptions
            )
        ).resolves.toEqual(expect.objectContaining({ key: 'dir/file.txt' }));
    });

    it('deletes directory pages until the continuation token is exhausted', async () => {
        const service = initialized();
        send.mockResolvedValueOnce({
            Contents: [{ Key: 'dir/a.txt' }],
            NextContinuationToken: 'next',
        })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                Contents: [],
                NextContinuationToken: null,
            });
        await service.deleteDir('dir/', publicOptions);
        expect(send).toHaveBeenNthCalledWith(
            1,
            expect.any(ListObjectsV2Command)
        );
        expect(send).toHaveBeenNthCalledWith(
            2,
            expect.any(DeleteObjectsCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            3,
            expect.any(ListObjectsV2Command)
        );
    });

    it('creates, uploads, completes, and aborts multipart uploads', async () => {
        const service = initialized();
        send.mockResolvedValueOnce({ UploadId: 'upload-id' })
            .mockResolvedValueOnce({ ETag: 'etag' })
            .mockResolvedValue({});
        const multipart = await service.createMultiPart(
            { key: 'dir/file.txt', size: 4 },
            2,
            { ...publicOptions, forceUpdate: true }
        );
        expect(send).toHaveBeenNthCalledWith(
            1,
            expect.any(CreateMultipartUploadCommand)
        );
        const uploaded = await service.putItemMultiPart(
            multipart!,
            1,
            Buffer.from('data'),
            publicOptions
        );
        expect(uploaded.parts).toEqual([
            { eTag: 'etag', partNumber: 1, size: 4 },
        ]);
        expect(send).toHaveBeenNthCalledWith(2, expect.any(UploadPartCommand));
        await service.completeMultipart(
            'dir/file.txt',
            'upload-id',
            [
                { eTag: 'etag', partNumber: 1, size: 4 },
                { eTag: '"quoted"', partNumber: 2, size: 4 },
            ],
            publicOptions
        );
        await service.abortMultipart(
            'dir/file.txt',
            'upload-id',
            publicOptions
        );
        expect(send).toHaveBeenNthCalledWith(
            3,
            expect.any(CompleteMultipartUploadCommand)
        );
        expect(send).toHaveBeenNthCalledWith(
            4,
            expect.any(AbortMultipartUploadCommand)
        );
    });

    it('validates multipart limits and permits a missing destination object', async () => {
        const service = initialized();
        await expect(
            service.createMultiPart(
                { key: '/file.txt', size: 1 },
                1,
                publicOptions
            )
        ).rejects.toThrow(Error);
        await expect(
            service.createMultiPart(
                { key: 'file.txt', size: 1 },
                Number.MAX_SAFE_INTEGER,
                publicOptions
            )
        ).rejects.toThrow(Error);
        send.mockResolvedValueOnce({});
        await expect(
            service.createMultiPart(
                { key: 'file.txt', size: 1 },
                1,
                publicOptions
            )
        ).rejects.toThrow(Error);
        send.mockRejectedValueOnce(
            new NotFound({ $metadata: {}, message: 'missing' })
        ).mockResolvedValueOnce({ UploadId: 'id' });
        await expect(
            service.createMultiPart(
                { key: 'file.txt', size: 1 },
                1,
                publicOptions
            )
        ).resolves.toEqual(expect.objectContaining({ uploadId: 'id' }));
    });

    it('creates presigned read, write, and multipart URLs with default and explicit expiry', async () => {
        const service = initialized();
        send.mockResolvedValue({});
        await expect(
            service.presignGetItem('dir/file.txt', publicOptions)
        ).resolves.toEqual(
            expect.objectContaining({
                presignUrl: 'https://signed.example.com',
                expiredInSeconds: 900,
            })
        );
        await expect(
            service.presignPutItem(
                { key: 'dir/file.txt', size: 4 },
                { ...publicOptions, forceUpdate: true, expiredInSeconds: 60 }
            )
        ).resolves.toEqual(expect.objectContaining({ expiredInSeconds: 60 }));
        await expect(
            service.presignPutItemPart(
                {
                    key: 'dir/file.txt',
                    size: 4,
                    uploadId: 'upload-id',
                    partNumber: 1,
                },
                publicOptions
            )
        ).resolves.toEqual(expect.objectContaining({ partNumber: 1 }));
        expect(presignerMocks.getSignedUrl).toHaveBeenCalledTimes(3);
    });

    it('creates a presigned URL when an object is absent and rejects unexpected lookup failures', async () => {
        const service = initialized();
        send.mockRejectedValueOnce(
            new NotFound({ $metadata: {}, message: 'missing' })
        );
        await expect(
            service.presignGetItem('file.txt', publicOptions)
        ).resolves.toEqual(expect.objectContaining({ key: 'file.txt' }));
        send.mockRejectedValueOnce(new Error('provider failure'));
        await expect(
            service.presignGetItem('file.txt', publicOptions)
        ).rejects.toThrow(Error);
        send.mockResolvedValueOnce({});
        await expect(
            service.presignPutItem({ key: 'file.txt', size: 1 }, publicOptions)
        ).rejects.toThrow(Error);
        send.mockRejectedValueOnce(
            new NotFound({ $metadata: {}, message: 'missing' })
        );
        await expect(
            service.presignPutItem({ key: 'file.txt', size: 1 }, publicOptions)
        ).resolves.toEqual(expect.objectContaining({ key: 'file.txt' }));
    });

    it('maps presigned objects and copies single and multiple objects', async () => {
        const service = initialized();
        send.mockResolvedValue({});
        expect(
            service.mapPresign({ key: 'dir/file.txt', size: 4 }, publicOptions)
        ).toEqual(expect.objectContaining({ key: 'dir/file.txt', size: 4 }));
        await expect(
            service.copyItem(source, 'destination', {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            })
        ).resolves.toEqual(
            expect.objectContaining({ key: 'destination/file.txt' })
        );
        expect(send).toHaveBeenNthCalledWith(1, expect.any(CopyObjectCommand));
        await expect(
            service.copyItems([source], 'destination', publicOptions)
        ).resolves.toEqual([
            expect.objectContaining({ key: 'destination/file.txt' }),
        ]);
        expect(
            service.mapPresign(
                { key: 'private/file.txt', size: 4 },
                { access: EnumAwsS3Accessibility.private }
            )
        ).toEqual(expect.objectContaining({ cdnUrl: null }));
    });

    it('rejects an access level whose bucket configuration is missing', () => {
        const service = initialized();
        const config = Reflect.get(service, 'config') as Map<
            EnumAwsS3Accessibility,
            unknown
        >;
        config.delete(EnumAwsS3Accessibility.public);
        expect(() =>
            service.mapPresign({ key: 'file.txt', size: 1 }, publicOptions)
        ).toThrow(Error);
    });

    it('stops directory deletion after the bounded number of pages', async () => {
        const service = initialized();
        send.mockResolvedValue({ Contents: [], NextContinuationToken: 'next' });
        await expect(service.deleteDir('dir/', publicOptions)).rejects.toThrow(
            Error
        );
        expect(send).toHaveBeenCalledTimes(100);
    });

    it('rejects leading slashes and malformed put keys at every object boundary', async () => {
        const service = initialized();
        await expect(
            service.checkItem('/file.txt', publicOptions)
        ).rejects.toThrow(Error);
        await expect(service.getItems('/dir', publicOptions)).rejects.toThrow(
            Error
        );
        await expect(
            service.getItem('/file.txt', publicOptions)
        ).rejects.toThrow(Error);
        await expect(
            service.putItem(
                { key: '/file.txt', file: Buffer.from('x'), size: 1 },
                publicOptions
            )
        ).rejects.toThrow(Error);
        await expect(
            service.putItem(
                { key: '../file.txt', file: Buffer.from('x'), size: 1 },
                publicOptions
            )
        ).rejects.toThrow(Error);
        await expect(
            service.deleteItem('/file.txt', publicOptions)
        ).rejects.toThrow(Error);
        await expect(
            service.deleteItems(['/file.txt'], publicOptions)
        ).rejects.toThrow(Error);
        await expect(service.deleteDir('/dir', publicOptions)).rejects.toThrow(
            Error
        );
        await expect(
            service.presignGetItem('/file.txt', publicOptions)
        ).rejects.toThrow(Error);
        await expect(
            service.presignPutItem({ key: '/file.txt', size: 1 }, publicOptions)
        ).rejects.toThrow(Error);
        await expect(
            service.presignPutItemPart(
                { key: '/file.txt', size: 1, uploadId: 'id', partNumber: 1 },
                publicOptions
            )
        ).rejects.toThrow(Error);
        expect(() =>
            service.mapPresign({ key: '/file.txt', size: 1 }, publicOptions)
        ).toThrow(Error);
        await expect(
            service.copyItem({ ...source, key: '/file.txt' }, 'destination', {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            })
        ).rejects.toThrow(Error);
        await expect(
            service.copyItem(source, '/destination', {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            })
        ).rejects.toThrow(Error);
        await expect(
            service.copyItems(
                [{ ...source, key: '/file.txt' }],
                'destination',
                publicOptions
            )
        ).rejects.toThrow(Error);
        await expect(
            service.copyItems([source], '/destination', publicOptions)
        ).rejects.toThrow(Error);
    });

    it('returns inert values for selected operations while disabled', async () => {
        const service = createService(false);
        await expect(service.checkBucket(publicOptions)).resolves.toBe(false);
        await expect(
            service.checkItem('file.txt', publicOptions)
        ).resolves.toBeNull();
        await expect(service.getItems('', publicOptions)).resolves.toEqual([]);
        await expect(
            service.getItem('file.txt', publicOptions)
        ).resolves.toBeNull();
        await expect(
            service.putItem(
                { key: 'file.txt', file: Buffer.from('x'), size: 1 },
                publicOptions
            )
        ).resolves.toBeNull();
        await expect(
            service.deleteItem('file.txt', publicOptions)
        ).resolves.toBeUndefined();
        await expect(
            service.deleteItems(['file.txt'], publicOptions)
        ).resolves.toBeUndefined();
        await expect(
            service.deleteDir('dir', publicOptions)
        ).resolves.toBeUndefined();
        await expect(
            service.createMultiPart(
                { key: 'file.txt', size: 1 },
                1,
                publicOptions
            )
        ).resolves.toBeNull();
        const multipart = mock<IAwsS3Multipart>();
        await expect(
            service.putItemMultiPart(
                multipart,
                1,
                Buffer.from('x'),
                publicOptions
            )
        ).resolves.toBe(multipart);
        await expect(
            service.completeMultipart('file.txt', 'id', [], publicOptions)
        ).resolves.toBeUndefined();
        await expect(
            service.abortMultipart('file.txt', 'id', publicOptions)
        ).resolves.toBeUndefined();
        await expect(
            service.presignGetItem('file.txt', publicOptions)
        ).resolves.toBeNull();
        await expect(
            service.presignPutItem({ key: 'file.txt', size: 1 }, publicOptions)
        ).resolves.toBeNull();
        await expect(
            service.presignPutItemPart(
                { key: 'file.txt', size: 1, uploadId: 'id', partNumber: 1 },
                publicOptions
            )
        ).resolves.toBeNull();
        await expect(
            service.copyItem(source, 'destination', {
                accessFrom: EnumAwsS3Accessibility.private,
                accessTo: EnumAwsS3Accessibility.public,
            })
        ).resolves.toBeNull();
        await expect(
            service.copyItems([source], 'destination', publicOptions)
        ).resolves.toEqual([]);
    });
});
