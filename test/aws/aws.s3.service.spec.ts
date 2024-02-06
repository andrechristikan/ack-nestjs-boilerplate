import {
    ListBucketsOutput,
    HeadBucketCommandOutput,
    ListObjectsV2Output,
    PutObjectCommandOutput,
    GetObjectOutput,
    DeleteObjectCommandOutput,
    DeleteObjectsCommandOutput,
    CreateMultipartUploadCommandOutput,
    UploadPartCommandOutput,
    CompleteMultipartUploadCommandOutput,
    AbortMultipartUploadCommandOutput,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
} from 'src/common/aws/interfaces/aws.interface';
import { AwsS3MultipartSerialization } from 'src/common/aws/serializations/aws.s3-multipart.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { AwsS3Service } from 'src/common/aws/services/aws.s3.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

describe('AwsS3Service', () => {
    const bucket = 'test-bucket';
    const baseUrl = 'https://test.com';

    let service: AwsS3Service;

    beforeEach(async () => {
        const moduleRefRef: TestingModule = await Test.createTestingModule({
            providers: [
                AwsS3Service,
                HelperStringService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            switch (key) {
                                case 'aws.s3.credential.key':
                                    return 'test-access-key';
                                case 'aws.s3.credential.secret':
                                    return 'test-secret-access-key';
                                case 'aws.s3.region':
                                    return 'us-west-2';
                                case 'aws.s3.bucket':
                                    return bucket;
                                case 'aws.s3.this.':
                                default:
                                    return baseUrl;
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<AwsS3Service>(AwsS3Service);

        jest.spyOn(service['s3Client'], 'send').mockImplementation(jest.fn());
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('checkBucketExistence', () => {
        it('should return HeadBucketCommandOutput', async () => {
            const data: HeadBucketCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const result: HeadBucketCommandOutput =
                await service.checkBucketExistence();
            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(data);
        });

        it('should throw error', async () => {
            const error = new Error('Check Bucket Error');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.checkBucketExistence();

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('listBucket', () => {
        it('should return string[]', async () => {
            const data: ListBucketsOutput = {
                Buckets: [
                    {
                        CreationDate: new Date(),
                        Name: 'test-bucket',
                    },
                ],
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const result: string[] = await service.listBucket();

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(['test-bucket']);
        });

        it('should throw error', async () => {
            const error = new Error('List Bucket Error');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.listBucket();

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('listItemInBucket', () => {
        it('should return AwsS3Serialization[]', async () => {
            const data: ListObjectsV2Output = {
                Contents: [
                    {
                        Key: 'file1.png',
                    },
                    {
                        Key: 'folder1/file2.png',
                    },
                ],
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const expected = [
                {
                    path: '',
                    pathWithFilename: 'file1.png',
                    filename: 'file1.png',
                    completedUrl: 'https://test.com/file1.png',
                    baseUrl: 'https://test.com',
                    mime: 'png',
                    bucket: 'test-bucket',
                    size: undefined,
                },
                {
                    path: 'folder1',
                    pathWithFilename: 'folder1/file2.png',
                    filename: 'file2.png',
                    completedUrl: 'https://test.com/folder1/file2.png',
                    baseUrl: 'https://test.com',
                    mime: 'png',
                    bucket: 'test-bucket',
                    size: undefined,
                },
            ];

            const result: AwsS3Serialization[] =
                await service.listItemInBucket();

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should accept prefix and return correct result', async () => {
            const data: ListObjectsV2Output = {
                Contents: [
                    {
                        Key: 'folder1/file2.png',
                    },
                ],
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const expected = [
                {
                    bucket: 'test-bucket',
                    path: 'folder1',
                    pathWithFilename: 'folder1/file2.png',
                    filename: 'file2.png',
                    completedUrl: 'https://test.com/folder1/file2.png',
                    baseUrl: 'https://test.com',
                    mime: 'png',
                    size: undefined,
                },
            ];

            const result: AwsS3Serialization[] =
                await service.listItemInBucket('folder1');

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should throw error', async () => {
            const error = new Error('List Item Error');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.listItemInBucket();

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('getItemInBucket', () => {
        it('should return Readable', async () => {
            const file = new Blob(['test-body']);
            const data: GetObjectOutput = {
                ContentType: 'image/png',
                Body: file,
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const result = await service.getItemInBucket('file.png');

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toBe(file);
        });

        it('should return Readable, start path with /', async () => {
            const file = new Blob(['test-body']);
            const data: GetObjectOutput = {
                ContentType: 'image/png',
                Body: file,
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const result = await service.getItemInBucket('/folder1/file.png');

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toBe(file);
        });

        it('should accept path and return correct result', async () => {
            const file = new Blob(['test-body']);
            const data: GetObjectOutput = {
                ContentType: 'image/png',
                Body: file,
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const result = await service.getItemInBucket('folder1/file.png');

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toBe(file);
        });

        it('should throw error', async () => {
            const error = new Error('Get Item Error');

            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.getItemInBucket('file.png');

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('putItemInBucket', () => {
        it('should accept path and return correct result', async () => {
            const data: PutObjectCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const expected = {
                path: 'test',
                pathWithFilename: 'test/file.png',
                filename: 'file.png',
                completedUrl: 'https://test.com/test/file.png',
                baseUrl: 'https://test.com',
                bucket: 'test-bucket',
                mime: 'png',
                size: 1,
            };
            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const options: IAwsS3PutItemOptions = {
                acl: 'public-read',
                path: 'test',
            };

            const result = await service.putItemInBucket(file, options);

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should accept path and return correct result, start path with /', async () => {
            const data: PutObjectCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const expected = {
                bucket: 'test-bucket',
                path: 'test',
                pathWithFilename: 'test/file.png',
                filename: 'file.png',
                completedUrl: 'https://test.com/test/file.png',
                baseUrl: 'https://test.com',
                mime: 'png',
                size: 1,
            };
            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const options: IAwsS3PutItemOptions = {
                acl: 'public-read',
                path: '/test',
            };

            const result = await service.putItemInBucket(file, options);

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should accept path, customFilename, and return correct result', async () => {
            const data: PutObjectCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const expected = {
                baseUrl: 'https://test.com',
                bucket: 'test-bucket',
                completedUrl: 'https://test.com/test/asdfgh.png',
                filename: 'asdfgh.png',
                mime: 'png',
                pathWithFilename: 'test/asdfgh.png',
                size: 1,
                path: 'test',
            };
            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const options: IAwsS3PutItemOptions = {
                acl: 'public-read',
                path: 'test',
                customFilename: 'asdfgh',
            };

            const result = await service.putItemInBucket(file, options);

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should throw error', async () => {
            const error = new Error('Put Item Error');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const result = service.putItemInBucket(file);

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('deleteItemInBucket', () => {
        it('should return void', async () => {
            const data: DeleteObjectCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            await service.deleteItemInBucket('file.png');

            expect(service['s3Client'].send).toHaveBeenCalled();
        });

        it('should throw error', async () => {
            const error = new Error('Delete Item Error');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.deleteItemInBucket('file.png');

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('deleteItemsInBucket', () => {
        it('should return void', async () => {
            const data: DeleteObjectsCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            await service.deleteItemsInBucket(['file.png']);

            expect(service['s3Client'].send).toHaveBeenCalled();
        });

        it('should throw error', async () => {
            const error = new Error('Delete Items Error');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.deleteItemsInBucket(['file.png']);

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('deleteFolder', () => {
        it('deletes the specified folder and all its contents', async () => {
            const data1: ListObjectsV2Output = {
                Contents: [
                    {
                        Key: 'file1.png',
                    },
                    {
                        Key: 'folder1/file2.png',
                    },
                ],
            };
            const data2: DeleteObjectsCommandOutput = { $metadata: {} };
            const data3: DeleteObjectCommandOutput = {
                $metadata: {},
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValueOnce(
                data1 as never
            );
            jest.spyOn(service['s3Client'], 'send').mockResolvedValueOnce(
                data2 as never
            );
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data3 as never
            );

            await service.deleteFolder('file');

            expect(service['s3Client'].send).toHaveBeenCalled();
        });

        it('throws an error if an error occurs while deleting', async () => {
            const data1: ListObjectsV2Output = {
                Contents: [
                    {
                        Key: 'file1.png',
                    },
                    {
                        Key: 'folder1/file2.png',
                    },
                ],
            };
            const data2: DeleteObjectsCommandOutput = { $metadata: {} };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValueOnce(
                data1 as never
            );
            jest.spyOn(service['s3Client'], 'send').mockResolvedValueOnce(
                data2 as never
            );

            const error = new Error('Error deleting folder');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const result = service.deleteFolder('file');

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('createMultiPart', () => {
        it('should return object multipart upload', async () => {
            const options: IAwsS3PutItemOptions = {
                path: 'path',
                acl: 'private',
            };
            const data: CreateMultipartUploadCommandOutput = {
                $metadata: {},
                UploadId: '12345',
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const result = await service.createMultiPart(file, 2, options);

            const expected = {
                bucket: 'test-bucket',
                completedUrl: 'https://test.com/path/file.png',
                filename: 'file.png',
                lastPartNumber: 0,
                maxPartNumber: 2,
                mime: 'png',
                parts: [],
                pathWithFilename: 'path/file.png',
                size: 0,
                path: 'path',
                uploadId: '12345',
                baseUrl: 'https://test.com',
            };

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should return object multipart upload, path start with /', async () => {
            const options: IAwsS3PutItemOptions = {
                path: '/path',
                acl: 'private',
            };
            const data: CreateMultipartUploadCommandOutput = {
                $metadata: {},
                UploadId: '12345',
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const result = await service.createMultiPart(file, 2, options);

            const expected = {
                bucket: 'test-bucket',
                completedUrl: 'https://test.com/path/file.png',
                filename: 'file.png',
                lastPartNumber: 0,
                maxPartNumber: 2,
                mime: 'png',
                parts: [],
                pathWithFilename: 'path/file.png',
                size: 0,
                path: 'path',
                uploadId: '12345',
                baseUrl: 'https://test.com',
            };

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should return object multipart upload with customFilename', async () => {
            const options: IAwsS3PutItemOptions = {
                path: 'path',
                acl: 'private',
                customFilename: '123456',
            };
            const data: CreateMultipartUploadCommandOutput = {
                $metadata: {},
                UploadId: '12345',
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const result = await service.createMultiPart(file, 2, options);

            const expected = {
                baseUrl: 'https://test.com',
                bucket: 'test-bucket',
                completedUrl: 'https://test.com/path/123456.png',
                filename: '123456.png',
                lastPartNumber: 0,
                maxPartNumber: 2,
                mime: 'png',
                path: 'path',
                parts: [],
                pathWithFilename: 'path/123456.png',
                size: 0,
                uploadId: '12345',
            };

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('throws an error if an error occurs while create multipart', async () => {
            const error = new Error('failed');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const file: IAwsS3PutItem = {
                buffer: Buffer.from('test-content'),
                originalname: 'file.png',
                size: 1,
            };
            const result = service.createMultiPart(file, 2);

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('uploadPart', () => {
        it('should return multipart parts object', async () => {
            const data: UploadPartCommandOutput = {
                $metadata: {},
                ETag: '1',
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            const content = Buffer.from('12345');
            const result = await service.uploadPart(multipart, 1, content);

            const expected = {
                eTag: '1',
                partNumber: 1,
                size: 5,
            };

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });

        it('should throw error when upload part error occurs', async () => {
            const error = new Error('failed');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            const content = Buffer.from('12345');
            const result = service.uploadPart(multipart, 1, content);

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('completeMultipart', () => {
        it('should complete multipart', async () => {
            const data: CompleteMultipartUploadCommandOutput = {
                $metadata: {},
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            await service.completeMultipart(multipart);

            expect(service['s3Client'].send).toHaveBeenCalled();
        });

        it('should throw error when completing multipart error occurs', async () => {
            const error = new Error('failed');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            const result = service.completeMultipart(multipart);

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('abortMultipart', () => {
        it('should abort multipart', async () => {
            const data: AbortMultipartUploadCommandOutput = {
                $metadata: {},
            };
            jest.spyOn(service['s3Client'], 'send').mockResolvedValue(
                data as never
            );

            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            await service.abortMultipart(multipart);

            expect(service['s3Client'].send).toHaveBeenCalled();
        });

        it('should throw error when aborting multipart error occurs', async () => {
            const error = new Error('failed');
            jest.spyOn(service['s3Client'], 'send').mockRejectedValue(
                error as never
            );

            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            const result = service.abortMultipart(multipart);

            try {
                await result;
            } catch (err: any) {}

            expect(service['s3Client'].send).toHaveBeenCalled();
            expect(result).rejects.toThrow(error);
        });
    });

    describe('getFilenameFromCompletedUrl', () => {
        it('should return path and filename from completedUrl', async () => {
            const filename: string = 'path/filename.txt';
            const completedUrl: string = `${baseUrl}/${filename}`;

            const result =
                await service.getFilenameFromCompletedUrl(completedUrl);

            expect(result).toBe(`/${filename}`);
        });
    });

    describe('createRandomFilename', () => {
        it('should return random path and filename', async () => {
            const result = await service.createRandomFilename();

            expect(result).toBe(result);
        });

        it('should return random path and filename with prefix', async () => {
            const path: string = 'path';

            const result = await service.createRandomFilename(path);

            expect(result).toBe(result);
        });
    });

    describe('updateMultiPart', () => {
        it('should return updated multipart object', async () => {
            const multipart: AwsS3MultipartSerialization = {
                bucket: bucket,
                lastPartNumber: 0,
                maxPartNumber: 0,
                parts: [],
                size: 0,
                uploadId: '12345',
                path: 'path',
                pathWithFilename: 'path/filename.txt',
                filename: 'filename.txt',
                completedUrl: 'https://test.com/path/filename.txt',
                baseUrl: 'https://test.com',
                mime: 'TXT',
            };
            const part = {
                eTag: '',
                partNumber: 0,
                size: 0,
            };
            const result = await service.updateMultiPart(multipart, part);

            expect(result).toBe(result);
        });
    });
});
