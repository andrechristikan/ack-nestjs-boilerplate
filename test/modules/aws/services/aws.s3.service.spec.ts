import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    ListBucketsCommandOutput,
    ListObjectsV2CommandOutput,
    PutObjectCommandOutput,
    ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { AWS_S3_MAX_PART_NUMBER } from 'src/modules/aws/constants/aws.constant';
import {
    IAwsS3PutPresignUrlFile,
    IAwsS3PutPresignUrlOptions,
} from 'src/modules/aws/interfaces/aws.interface';
import presign from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockReturnValue('https://example.com/aws-presign'),
}));

const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
            case 'aws.s3.credential.key':
                return 'mockAccessKeyId';
            case 'aws.s3.credential.secret':
                return 'mockSecretAccessKey';
            case 'aws.s3.region':
                return 'mockRegion';
            case 'aws.s3.bucket':
                return 'mockBucket';
            case 'aws.s3.baseUrl':
                return 'mockBaseUrl';
            default:
                return 10000;
        }
    }),
};

const mockS3Client = {
    send: jest.fn(),
};

describe('AwsS3Service', () => {
    let service: AwsS3Service;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AwsS3Service,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: S3Client, useValue: mockS3Client },
            ],
        }).compile();

        service = module.get<AwsS3Service>(AwsS3Service);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('checkBucketExistence', () => {
        it('should return the bucket existence details', async () => {
            const mockOutput = { $metadata: { httpStatusCode: 200 } };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const result = await service.checkBucketExistence();
            expect(result).toEqual(mockOutput);
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(service.checkBucketExistence()).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('listBucket', () => {
        it('should return a list of bucket names', async () => {
            const mockOutput: ListBucketsCommandOutput = {
                Buckets: [{ Name: 'mockBucket' }],
                $metadata: { httpStatusCode: 200 },
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const result = await service.listBucket();
            expect(result).toEqual(['mockBucket']);
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(service.listBucket()).rejects.toThrow('Mock Error');
        });
    });

    describe('listItemInBucket', () => {
        it('should return a list of items in the bucket', async () => {
            const mockOutput: ListObjectsV2CommandOutput = {
                Contents: [{ Key: '/mock/path/file.txt', Size: 1234 }],
                $metadata: { httpStatusCode: 200 },
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const result = await service.listItemInBucket('mock/path');
            expect(result).toEqual([
                {
                    bucket: 'mockBucket',
                    path: '/mock/path',
                    pathWithFilename: '/mock/path/file.txt',
                    filename: 'file.txt',
                    completedUrl: 'mockBaseUrl/mock/path/file.txt',
                    baseUrl: 'mockBaseUrl',
                    mime: 'txt',
                    size: 1234,
                },
            ]);
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(service.listItemInBucket('mock/path')).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('getItemInBucket', () => {
        it('should return the item from the bucket', async () => {
            const mockOutput = {
                Body: 'mockBody',
                $metadata: { httpStatusCode: 200 },
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const result = await service.getItemInBucket('mock/path/file.txt');
            expect(result).toEqual('mockBody');
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(
                service.getItemInBucket('mock/path/file.txt')
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('putItemInBucket', () => {
        it('should upload an item to the bucket', async () => {
            const mockOutput: PutObjectCommandOutput = {
                $metadata: { httpStatusCode: 200 },
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = {
                path: '/mock/path',
                customFilename: 'customFilename',
            };

            const result = await service.putItemInBucket(file, options);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/mock/path',
                pathWithFilename: '/mock/path/customFilename.txt',
                filename: 'customFilename.txt',
                completedUrl: 'mockBaseUrl/mock/path/customFilename.txt',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 1024,
            });
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };

            await expect(service.putItemInBucket(file)).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('putItemInBucketWithAcl', () => {
        it('should upload an item to the bucket with acl', async () => {
            const mockOutput: PutObjectCommandOutput = {
                $metadata: { httpStatusCode: 200 },
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = {
                path: '/mock/path',
                acl: ObjectCannedACL.public_read,
                customFilename: 'customFilename',
            };

            const result = await service.putItemInBucketWithAcl(file, options);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/mock/path',
                pathWithFilename: '/mock/path/customFilename.txt',
                filename: 'customFilename.txt',
                completedUrl: 'mockBaseUrl/mock/path/customFilename.txt',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 1024,
            });
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };

            await expect(service.putItemInBucketWithAcl(file)).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('deleteItemInBucket', () => {
        it('should delete an item in bucket', async () => {
            jest.spyOn(service['s3Client'], 'send').mockReturnThis();

            expect(
                await service.deleteItemInBucket('path/filename.txt')
            ).toEqual(undefined);
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(
                service.deleteItemInBucket('path/filename.txt')
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('deleteItemsInBucket', () => {
        it('should delete an items in bucket', async () => {
            jest.spyOn(service['s3Client'], 'send').mockReturnThis();

            expect(
                await service.deleteItemsInBucket(['path/filename.txt'])
            ).toEqual(undefined);
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(
                service.deleteItemsInBucket(['path/filename.txt'])
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('deleteFolder', () => {
        it('should delete a folder', async () => {
            const mockOutput = {
                Contents: [
                    {
                        Key: 'key',
                    },
                ],
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            expect(await service.deleteFolder('/dir')).toEqual(undefined);
        });

        it('should throw an error if S3Client send fails', async () => {
            const mockOutput = {
                Contents: [
                    {
                        Key: 'key',
                    },
                ],
            };
            jest.spyOn(service['s3Client'], 'send')
                .mockReturnValueOnce(mockOutput as any)
                .mockRejectedValue(new Error('Mock Error') as never);

            await expect(service.deleteFolder('/dir')).rejects.toThrow(
                'Mock Error'
            );
        });
    });

    describe('createMultiPart', () => {
        it('should create multi part', async () => {
            const mockOutput = { UploadId: 1 };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = {
                path: 'mock/path',
                customFilename: 'customFilename',
            };

            const result = await service.createMultiPart(file, 1, options);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/mock/path',
                pathWithFilename: '/mock/path/customFilename.txt',
                filename: 'customFilename.txt',
                completedUrl: 'mockBaseUrl/mock/path/customFilename.txt',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 0,
                uploadId: 1,
                lastPartNumber: 0,
                maxPartNumber: 1,
                parts: [],
            });
        });

        it('should create multi part with no options', async () => {
            const mockOutput = { UploadId: 1 };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };

            const result = await service.createMultiPart(file, 1);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/',
                pathWithFilename: '/file.txt',
                filename: 'file.txt',
                completedUrl: 'mockBaseUrl/file.txt',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 0,
                uploadId: 1,
                lastPartNumber: 0,
                maxPartNumber: 1,
                parts: [],
            });
        });

        it('should throw an error max part number', async () => {
            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = { path: 'mock/path' };

            await expect(
                service.createMultiPart(file, 100001, options)
            ).rejects.toThrow(
                `Max part number is greater than ${AWS_S3_MAX_PART_NUMBER}`
            );
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = { path: 'mock/path' };

            await expect(
                service.createMultiPart(file, options as any)
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('createMultiPartWIthAcl', () => {
        it('should create multi part with acl', async () => {
            const mockOutput = { UploadId: 1 };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = {
                path: 'mock/path',
                customFilename: 'customFilename',
                acl: ObjectCannedACL.public_read,
            };

            const result = await service.createMultiPartWithAcl(
                file,
                1,
                options
            );
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/mock/path',
                pathWithFilename: '/mock/path/customFilename.txt',
                filename: 'customFilename.txt',
                completedUrl: 'mockBaseUrl/mock/path/customFilename.txt',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 0,
                uploadId: 1,
                lastPartNumber: 0,
                maxPartNumber: 1,
                parts: [],
            });
        });

        it('should create multi part with acl no options', async () => {
            const mockOutput = { UploadId: 1 };
            jest.spyOn(service['s3Client'], 'send').mockReturnValue(
                mockOutput as any
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };

            const result = await service.createMultiPartWithAcl(file, 1);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/',
                pathWithFilename: '/file.txt',
                filename: 'file.txt',
                completedUrl: 'mockBaseUrl/file.txt',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 0,
                uploadId: 1,
                lastPartNumber: 0,
                maxPartNumber: 1,
                parts: [],
            });
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const file = {
                originalname: 'file.txt',
                buffer: Buffer.from('file content'),
                size: 1024,
            };
            const options = { path: 'mock/path' };

            await expect(
                service.createMultiPartWithAcl(file, options as any)
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('uploadPart', () => {
        it('should upload a part', async () => {
            const mockOutput = {
                ETag: 'etag',
            };
            jest.spyOn(service['s3Client'], 'send').mockReturnValueOnce(
                mockOutput as any
            );

            const multipart = {
                path: 'path',
                uploadId: 1,
            };
            expect(
                await service.uploadPart(multipart as any, 1, 'content')
            ).toEqual({
                eTag: 'etag',
                partNumber: 1,
                size: 7,
            });
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            const multipart = {
                path: 'path',
                uploadId: 1,
            };
            await expect(
                service.uploadPart(multipart as any, 1, 'content')
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('updateMultiPart', () => {
        it('should update multi part', async () => {
            expect(
                await service.updateMultiPart(
                    {
                        size: 1,
                        parts: [],
                    } as any,
                    { size: 1, partNumber: 1, eTag: 'etag' } as any
                )
            ).toEqual({
                size: 2,
                lastPartNumber: 1,
                parts: [{ eTag: 'etag', size: 1, partNumber: 1 }],
            });
        });
    });

    describe('completeMultipart', () => {
        it('should complete multipart', async () => {
            const mockOutput = {};
            jest.spyOn(service['s3Client'], 'send').mockReturnValueOnce(
                mockOutput as any
            );
            expect(
                await service.completeMultipart({
                    path: 'path',
                    uploadId: 1,
                    parts: [],
                } as any)
            );
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(
                service.completeMultipart({
                    path: 'path',
                    uploadId: 1,
                    parts: [],
                } as any)
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('abortMultipart', () => {
        it('should abort multipart', async () => {
            const mockOutput = {};
            jest.spyOn(service['s3Client'], 'send').mockReturnValueOnce(
                mockOutput as any
            );
            expect(
                await service.abortMultipart({
                    path: 'path',
                    uploadId: 1,
                } as any)
            );
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                new Error('Mock Error') as never
            );

            await expect(
                service.abortMultipart({
                    path: 'path',
                    uploadId: 1,
                } as any)
            ).rejects.toThrow('Mock Error');
        });
    });

    describe('setPresignUrl', () => {
        it('should return presign url', async () => {
            const file: IAwsS3PutPresignUrlFile = {
                filename: 'file.txt',
                size: 1024,
                duration: 1,
            };

            const result = await service.setPresignUrl(file);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/',
                pathWithFilename: '/file.txt',
                filename: 'file.txt',
                completedUrl: 'https://example.com/aws-presign',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 1024,
                duration: 1,
                expiredIn: 10000,
            });
        });

        it('should return presign url with options', async () => {
            const file: IAwsS3PutPresignUrlFile = {
                filename: 'file.txt',
                size: 1024,
                duration: 1,
            };

            const options: IAwsS3PutPresignUrlOptions = {
                path: '/path/new',
            };

            const result = await service.setPresignUrl(file, options);
            expect(result).toEqual({
                bucket: 'mockBucket',
                path: '/path/new',
                pathWithFilename: '/path/new/file.txt',
                filename: 'file.txt',
                completedUrl: 'https://example.com/aws-presign',
                baseUrl: 'mockBaseUrl',
                mime: 'txt',
                size: 1024,
                duration: 1,
                expiredIn: 10000,
            });
        });

        it('should throw an error if S3Client send fails', async () => {
            jest.spyOn(presign, 'getSignedUrl').mockRejectedValue(
                new Error('presign error')
            );

            const file: IAwsS3PutPresignUrlFile = {
                filename: 'file.txt',
                size: 1024,
                duration: 1,
            };

            await expect(service.setPresignUrl(file)).rejects.toThrow(
                new Error('presign error')
            );
        });
    });
});
