import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AbortMultipartUploadCommand,
    AbortMultipartUploadCommandInput,
    AbortMultipartUploadCommandOutput,
    CompleteMultipartUploadCommand,
    CompleteMultipartUploadCommandInput,
    CompleteMultipartUploadCommandOutput,
    CopyObjectCommand,
    CopyObjectCommandInput,
    CopyObjectCommandOutput,
    CreateMultipartUploadCommand,
    CreateMultipartUploadCommandInput,
    CreateMultipartUploadCommandOutput,
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    DeleteObjectCommandOutput,
    DeleteObjectsCommand,
    DeleteObjectsCommandInput,
    DeleteObjectsCommandOutput,
    GetObjectCommand,
    GetObjectCommandInput,
    GetObjectCommandOutput,
    GetObjectOutput,
    HeadBucketCommand,
    HeadBucketCommandInput,
    HeadBucketCommandOutput,
    HeadObjectCommand,
    HeadObjectCommandInput,
    HeadObjectCommandOutput,
    ListBucketsCommand,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    ListObjectsV2CommandOutput,
    ListObjectsV2Output,
    NotFound,
    ObjectCannedACL,
    ObjectIdentifier,
    PutObjectCommand,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    S3Client,
    UploadPartCommand,
    UploadPartCommandInput,
    UploadPartCommandOutput,
    _Object,
} from '@aws-sdk/client-s3';
import { IAwsS3Service } from '@common/aws/interfaces/aws.s3-service.interface';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import {
    IAwsS3ConfigBucket,
    IAwsS3CreateMultiplePart,
    IAwsS3DeleteDirOptions,
    IAwsS3FileInfo,
    IAwsS3GetItemsOptions,
    IAwsS3MultipartOptions,
    IAwsS3Options,
    IAwsS3PresignOptions,
    IAwsS3PutItem,
    IAwsS3PutItemWithAclOptions,
} from '@common/aws/interfaces/aws.interface';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from '@common/aws/dtos/aws.s3-multipart.dto';
import { AWS_S3_MAX_PART_NUMBER } from '@common/aws/constants/aws.constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@common/aws/enums/aws.enum';
import {
    AwsS3PresignDto,
    AwsS3PresignPartDto,
} from '@common/aws/dtos/aws.s3-presign.dto';
import {
    AwsS3PresignPartRequestDto,
    AwsS3PresignRequestDto,
} from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { FileService } from '@common/file/services/file.service';

/**
 * AWS S3 service for managing file operations in Amazon S3 buckets.
 * Provides comprehensive functionality for uploading, downloading, deleting,
 * and managing files in both public and private S3 buckets. Supports both
 * simple uploads and multipart uploads for large files, as well as presigned
 * URLs for client-side uploads.
 */
@Injectable()
export class AwsS3Service implements IAwsS3Service {
    private readonly presignExpired: number;
    private readonly client: S3Client;

    private readonly config: Map<
        ENUM_AWS_S3_ACCESSIBILITY,
        IAwsS3ConfigBucket
    > = new Map<ENUM_AWS_S3_ACCESSIBILITY, IAwsS3ConfigBucket>();

    constructor(
        private readonly configService: ConfigService,
        private readonly fileService: FileService
    ) {
        this.presignExpired = this.configService.get<number>(
            'aws.s3.presignExpired'
        );

        this.client = new S3Client({
            credentials: {
                accessKeyId: this.configService.get<string>(
                    'aws.s3.credential.key'
                ),
                secretAccessKey: this.configService.get<string>(
                    'aws.s3.credential.secret'
                ),
            },
            region: this.configService.get<string>('aws.s3.region'),
        });

        this.config.set(ENUM_AWS_S3_ACCESSIBILITY.PUBLIC, {
            ...this.configService.get<IAwsS3ConfigBucket>('aws.s3.public'),
            access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        });

        this.config.set(ENUM_AWS_S3_ACCESSIBILITY.PRIVATE, {
            ...this.configService.get<IAwsS3ConfigBucket>('aws.s3.private'),
            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
        });
    }

    private getFileInfoFromKey(key: string): IAwsS3FileInfo {
        const pathWithFilename: string = `/${key}`;
        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );

        const extension: string =
            this.fileService.extractExtensionFromFilename(filename);
        const mime = this.fileService.extractMimeFromFilename(filename);

        return { pathWithFilename, filename, extension, mime };
    }

    /**
     * Checks the connection to AWS S3 by listing buckets.
     * @returns {Promise<boolean>} Promise that resolves to true if connection is successful, false otherwise
     */
    async checkConnection(): Promise<boolean> {
        try {
            await this.client.send(new ListBucketsCommand({}));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Checks if the specified S3 bucket exists and is accessible.
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<boolean>} Promise that resolves to true if bucket exists and is accessible
     */
    async checkBucket(options?: IAwsS3Options): Promise<boolean> {
        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: config.bucket,
        });

        await this.client.send<HeadBucketCommandInput, HeadBucketCommandOutput>(
            command
        );
        return true;
    }

    /**
     * Checks if an item exists in S3 and retrieves its metadata.
     * @param {string} key - The S3 object key to check
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto>} Promise that resolves to an AwsS3Dto with item information
     */
    async checkItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const item = await this.client.send<
            HeadObjectCommandInput,
            HeadObjectCommandOutput
        >(headCommand);
        const { pathWithFilename, extension, mime } =
            this.getFileInfoFromKey(key);

        return {
            bucket: config.bucket,
            key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: item.ContentLength,
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Retrieves a list of items from S3 with a specified path prefix.
     * @param {string} path - The path prefix to search for items
     * @param {IAwsS3GetItemsOptions} [options] - Optional configuration including access level and continuation token
     * @returns {Promise<AwsS3Dto[]>} Promise that resolves to an array of AwsS3Dto objects
     */
    async getItems(
        path: string,
        options?: IAwsS3GetItemsOptions
    ): Promise<AwsS3Dto[]> {
        if (path.startsWith('/')) {
            throw new Error('Path should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: path,
            MaxKeys: 1000,
            ContinuationToken: options?.continuationToken,
        });

        const listItems: ListObjectsV2Output = await this.client.send<
            ListObjectsV2CommandInput,
            ListObjectsV2CommandOutput
        >(command);
        const mapList: AwsS3Dto[] = listItems.Contents.map((item: _Object) => {
            const { pathWithFilename, extension, mime } =
                this.getFileInfoFromKey(item.Key);
            return {
                bucket: config.bucket,
                key: item.Key,
                completedUrl: `${config.baseUrl}${pathWithFilename}`,
                cdnUrl:
                    config.cdnUrl && config.cdnUrl !== ''
                        ? `${config.cdnUrl}${pathWithFilename}`
                        : undefined,
                baseUrl: config.baseUrl,
                extension,
                size: item.Size,
                mime,
                access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
            };
        });

        if (listItems.IsTruncated) {
            const nextItems: AwsS3Dto[] = await this.getItems(path, {
                ...options,
                continuationToken: listItems.NextContinuationToken,
            });
            mapList.push(...nextItems);
        }

        if (listItems.CommonPrefixes) {
            for (const dir of listItems.CommonPrefixes) {
                const dirItems = await this.getItems(dir.Prefix, {
                    access: options?.access,
                });
                mapList.push(...dirItems);
            }
        }

        return mapList;
    }

    /**
     * Retrieves a single item from S3 including its content data.
     * @param {string} key - The S3 object key to retrieve
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto>} Promise that resolves to an AwsS3Dto with item data
     */
    async getItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const item: GetObjectOutput = await this.client.send<
            GetObjectCommandInput,
            GetObjectCommandOutput
        >(command);
        const { pathWithFilename, extension, mime } =
            this.getFileInfoFromKey(key);

        return {
            bucket: config.bucket,
            key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            data: item.Body,
            size: item.ContentLength,
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Uploads a file to S3 using a simple PUT operation.
     * @param {IAwsS3PutItem} file - The file object containing key, file data, and optional size
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto>} Promise that resolves to an AwsS3Dto with upload information
     */
    async putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (!file.file) {
            throw new Error('File is required');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const { pathWithFilename, extension, mime } = this.getFileInfoFromKey(
            file.key
        );
        const content: Buffer = file.file;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: file.key,
            Body: content,
        });

        await this.client.send<PutObjectCommandInput, PutObjectCommandOutput>(
            command
        );

        return {
            bucket: config.bucket,
            key: file.key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: file?.size,
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Uploads a file to S3 with specified Access Control List (ACL) permissions.
     * @param {IAwsS3PutItem} file - The file object containing key, file data, and optional size
     * @param {IAwsS3PutItemWithAclOptions} [options] - Optional configuration including ACL settings and access level
     * @returns {Promise<AwsS3Dto>} Promise that resolves to an AwsS3Dto with upload information
     */
    async putItemWithAcl(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3Dto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (!file.file) {
            throw new Error('File is required');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const { pathWithFilename, extension, mime } = this.getFileInfoFromKey(
            file.key
        );
        const content: Buffer = file.file;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: file.key,
            Body: content,
            ACL: options?.acl ?? ObjectCannedACL.public_read,
        });

        await this.client.send<PutObjectCommandInput, PutObjectCommandOutput>(
            command
        );

        return {
            bucket: config.bucket,
            key: file.key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: file?.size,
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Deletes a single item from S3.
     * @param {string} key - The S3 object key to delete
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async deleteItem(key: string, options?: IAwsS3Options): Promise<void> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        await this.client.send<
            DeleteObjectCommandInput,
            DeleteObjectCommandOutput
        >(command);
    }

    /**
     * Deletes multiple items from S3 in a batch operation.
     * @param {string[]} keys - Array of S3 object keys to delete
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async deleteItems(keys: string[], options?: IAwsS3Options): Promise<void> {
        if (keys.some(e => e.startsWith('/'))) {
            throw new Error('Keys should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const obj: ObjectIdentifier[] = keys.map((val: string) => ({
            Key: val,
        }));
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: { Objects: obj },
        });

        await this.client.send<
            DeleteObjectsCommandInput,
            DeleteObjectsCommandOutput
        >(command);
    }

    /**
     * Deletes all items in a directory (path prefix) from S3.
     * @param {string} path - The directory path prefix to delete
     * @param {IAwsS3DeleteDirOptions} [options] - Optional configuration for bucket access level
     * @returns {Promise<void | _Object[]>}
     */
    async deleteDir(
        path: string,
        options?: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]> {
        if (path.startsWith('/')) {
            throw new Error('Path should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        let continuationToken: string | undefined = undefined;

        do {
            const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: path,
                MaxKeys: 1000,
                ContinuationToken: continuationToken,
            });

            const listItems: ListObjectsV2Output = await this.client.send<
                ListObjectsV2CommandInput,
                ListObjectsV2CommandOutput
            >(listCommand);

            if (listItems.Contents && listItems.Contents.length > 0) {
                const deleteObjectsCommand: DeleteObjectsCommand =
                    new DeleteObjectsCommand({
                        Bucket: config.bucket,
                        Delete: {
                            Objects: listItems.Contents.map(item => ({
                                Key: item.Key,
                            })),
                        },
                    });

                await this.client.send<
                    DeleteObjectsCommandInput,
                    DeleteObjectsCommandOutput
                >(deleteObjectsCommand);
            }

            continuationToken = listItems.NextContinuationToken;
        } while (continuationToken);
    }

    /**
     * Initiates a multipart upload for large files in S3.
     * @param {IAwsS3CreateMultiplePart} file - The file object containing key, and optional size
     * @param {number} maxPartNumber - The maximum number of parts for the multipart upload
     * @param {IAwsS3MultipartOptions} [options] - Optional configuration including force update and access level
     * @returns {Promise<AwsS3MultipartDto>} Promise that resolves to an AwsS3MultipartDto with upload information
     */
    async createMultiPart(
        file: IAwsS3CreateMultiplePart,
        maxPartNumber: number,
        options?: IAwsS3MultipartOptions
    ): Promise<AwsS3MultipartDto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (maxPartNumber > AWS_S3_MAX_PART_NUMBER) {
            throw new Error(
                `Max part number is greater than ${AWS_S3_MAX_PART_NUMBER}`
            );
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: file.key,
        });

        if (!options?.forceUpdate) {
            try {
                await this.client.send<
                    HeadObjectCommandInput,
                    HeadObjectCommandOutput
                >(headCommand);

                throw new Error(`Key ${file.key} is already exist.`);
            } catch (error: unknown) {
                if (!(error instanceof NotFound)) {
                    throw error;
                }
            }
        }

        const { pathWithFilename, extension, mime } = this.getFileInfoFromKey(
            file.key
        );

        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: config.bucket,
                Key: file.key,
                ContentType: mime,
                ContentDisposition: 'inline',
            });

        const response = await this.client.send<
            CreateMultipartUploadCommandInput,
            CreateMultipartUploadCommandOutput
        >(multiPartCommand);

        return {
            bucket: config.bucket,
            uploadId: response.UploadId,
            key: file.key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: file?.size,
            lastPartNumber: 0,
            maxPartNumber: maxPartNumber,
            parts: [],
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Initiates a multipart upload with Access Control List (ACL) permissions for large files in S3.
     * @param {IAwsS3CreateMultiplePart} file - The file object containing key, and optional size
     * @param {number} maxPartNumber - The maximum number of parts for the multipart upload
     * @param {IAwsS3PutItemWithAclOptions} [options] - Optional configuration including ACL settings, force update, and access level
     * @returns {Promise<AwsS3MultipartDto>} Promise that resolves to an AwsS3MultipartDto with upload information
     */
    async createMultiPartWithAcl(
        file: IAwsS3CreateMultiplePart,
        maxPartNumber: number,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3MultipartDto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (maxPartNumber > AWS_S3_MAX_PART_NUMBER) {
            throw new Error(
                `Max part number is greater than ${AWS_S3_MAX_PART_NUMBER}`
            );
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const { pathWithFilename, extension, mime } = this.getFileInfoFromKey(
            file.key
        );

        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: config.bucket,
                Key: file.key,
                ACL: options?.acl ?? ObjectCannedACL.public_read,
                ContentType: mime,
                ContentDisposition: 'inline',
            });

        const response = await this.client.send<
            CreateMultipartUploadCommandInput,
            CreateMultipartUploadCommandOutput
        >(multiPartCommand);

        return {
            bucket: config.bucket,
            uploadId: response.UploadId,
            key: file.key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: file?.size,
            lastPartNumber: 0,
            maxPartNumber: maxPartNumber,
            parts: [],
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Uploads a single part of a multipart upload to S3.
     * @param {AwsS3MultipartDto} multipart - The multipart upload object containing upload metadata
     * @param {number} partNumber - The part number for this upload (1-based)
     * @param {Buffer} file - The file buffer data for this part
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3MultipartDto>} Promise that resolves to the updated multipart object with the new part information
     */
    async putItemMultiPart(
        multipart: AwsS3MultipartDto,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<AwsS3MultipartDto> {
        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: multipart.key,
            Body: file,
            PartNumber: partNumber,
            UploadId: multipart.uploadId,
        });

        const { ETag } = await this.client.send<
            UploadPartCommandInput,
            UploadPartCommandOutput
        >(uploadPartCommand);

        const part: AwsS3MultipartPartDto = {
            eTag: ETag,
            partNumber: partNumber,
            size: file.length,
        };

        multipart.parts.push(part);
        multipart.lastPartNumber = part.partNumber;

        return multipart;
    }

    /**
     * Completes a multipart upload by combining all uploaded parts into a single object.
     * @param {string} key - The S3 object key for the multipart upload
     * @param {string} uploadId - The unique upload ID for the multipart upload
     * @param {AwsS3MultipartPartDto[]} parts - Array of part information including part numbers and ETags
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async completeMultipart(
        key: string,
        uploadId: string,
        parts: AwsS3MultipartPartDto[],
        options?: IAwsS3Options
    ): Promise<void> {
        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const completeMultipartCommand: CompleteMultipartUploadCommand =
            new CompleteMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts.map(part => ({
                        PartNumber: part.partNumber,
                        ETag: `"${part.eTag}"`,
                    })),
                },
            });

        await this.client.send<
            CompleteMultipartUploadCommandInput,
            CompleteMultipartUploadCommandOutput
        >(completeMultipartCommand);

        return;
    }

    /**
     * Aborts a multipart upload and removes all uploaded parts.
     * @param {string} key - The S3 object key for the multipart upload
     * @param {string} uploadId - The unique upload ID for the multipart upload to abort
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async abortMultipart(
        key: string,
        uploadId: string,
        options?: IAwsS3Options
    ): Promise<void> {
        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const abortMultipartCommand: AbortMultipartUploadCommand =
            new AbortMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
            });

        await this.client.send<
            AbortMultipartUploadCommandInput,
            AbortMultipartUploadCommandOutput
        >(abortMultipartCommand);

        return;
    }

    /**
     * Generates a presigned URL for uploading an object to S3.
     * @param {AwsS3PresignRequestDto} request - Object containing key and size information for the upload
     * @param {IAwsS3PresignOptions} [options] - Optional configuration including expiration time, force update, and access level
     * @returns {Promise<AwsS3PresignDto>} Promise that resolves to a presigned URL and metadata
     */
    async presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignDto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        if (!options?.forceUpdate) {
            const headCommand = new HeadObjectCommand({
                Bucket: config.bucket,
                Key: key,
            });

            try {
                await this.client.send<
                    HeadObjectCommandInput,
                    HeadObjectCommandOutput
                >(headCommand);

                throw new Error(`Key ${key} is already exists.`);
            } catch (error: unknown) {
                if (!(error instanceof NotFound)) {
                    throw error;
                }
            }
        }

        const { extension, mime } = this.getFileInfoFromKey(key);
        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            ContentType: mime,
            ContentLength: size,
            ChecksumAlgorithm: 'SHA256',
            ContentDisposition: 'inline',
        });
        const expiresIn = options?.expired ?? this.presignExpired;

        const presignUrl = await getSignedUrl(this.client, command, {
            expiresIn,
        });

        return {
            expiredIn: expiresIn,
            presignUrl: presignUrl,
            key,
            mime,
            extension,
        };
    }

    /**
     * Generates a presigned URL for uploading a part of a multipart upload to S3.
     * @param {AwsS3PresignPartRequestDto} request - Object containing key, size, uploadId, and partNumber information
     * @param {IAwsS3PresignOptions} [options] - Optional configuration including expiration time, force update, and access level
     * @returns {Promise<AwsS3PresignPartDto>} Promise that resolves to a presigned URL and part metadata
     */
    async presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignPartDto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        if (!options?.forceUpdate) {
            try {
                await this.client.send<
                    HeadObjectCommandInput,
                    HeadObjectCommandOutput
                >(headCommand);

                throw new Error(`Key ${key} is already exist.`);
            } catch (error: unknown) {
                if (!(error instanceof NotFound)) {
                    throw error;
                }
            }
        }

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
        });

        const { extension, mime } = this.getFileInfoFromKey(key);
        const expiresIn = options?.expired ?? this.presignExpired;
        const presignUrl = await getSignedUrl(this.client, uploadPartCommand, {
            expiresIn,
        });

        return {
            expiredIn: expiresIn,
            presignUrl: presignUrl,
            key,
            partNumber,
            mime,
            extension,
            size,
        };
    }

    /**
     * Maps presign request data to an AwsS3Dto object without actually creating a presigned URL.
     * @param {AwsS3PresignRequestDto} request - Object containing key and size information
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {AwsS3Dto} AwsS3Dto object with file information and URLs
     */
    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): AwsS3Dto {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );
        const { pathWithFilename, extension, mime } =
            this.getFileInfoFromKey(key);

        return {
            bucket: config.bucket,
            key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size,
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Moves an S3 object from its current location to a new destination path.
     * @param {AwsS3Dto} source - The source AwsS3Dto object containing the current file information
     * @param {string} destination - The destination path where the file should be moved
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto>} Promise that resolves to an AwsS3Dto with the new file location
     */
    async moveItem(
        source: AwsS3Dto,
        destination: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto> {
        if (source.key.startsWith('/')) {
            throw new Error('Source key should not start with "/"');
        }

        if (destination.startsWith('/')) {
            throw new Error('Destination should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC
        );

        const destinationKey = `${destination}/${source.key.split('/').pop()}`;
        const copyCommand = new CopyObjectCommand({
            Bucket: config.bucket,
            Key: destinationKey,
            CopySource: `${source.bucket}/${source.key}`,
            MetadataDirective: 'COPY',
        });

        await this.client.send<CopyObjectCommandInput, CopyObjectCommandOutput>(
            copyCommand
        );

        await this.deleteItem(source.key, { access: source.access });

        const { pathWithFilename, extension, mime } =
            this.getFileInfoFromKey(destinationKey);

        return {
            bucket: config.bucket,
            key: destinationKey,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: source.size,
            mime,
            access: options?.access ?? ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        };
    }

    /**
     * Moves multiple S3 objects from their current locations to a new destination path.
     * @param {AwsS3Dto[]} sources - Array of source AwsS3Dto objects containing the current file information
     * @param {string} destination - The destination path where the files should be moved
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto[]>} Promise that resolves to an array of AwsS3Dto objects with the new file locations
     */
    async moveItems(
        sources: AwsS3Dto[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto[]> {
        if (sources.some(e => e.key.startsWith('/'))) {
            throw new Error('Source keys should not start with "/"');
        }

        if (destination.startsWith('/')) {
            throw new Error('Destination should not start with "/"');
        }

        const promises = [];

        for (const source of sources) {
            promises.push(this.moveItem(source, destination, options));
        }

        const movedItems: AwsS3Dto[] = await Promise.all(promises);
        return movedItems;
    }
}
