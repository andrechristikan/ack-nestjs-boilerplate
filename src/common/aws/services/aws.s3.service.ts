import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
    DeleteBucketPolicyCommand,
    DeleteBucketPolicyCommandInput,
    DeleteBucketPolicyCommandOutput,
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    DeleteObjectCommandOutput,
    DeleteObjectsCommand,
    DeleteObjectsCommandInput,
    DeleteObjectsCommandOutput,
    ExpirationStatus,
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
    ObjectIdentifier,
    ObjectOwnership,
    PutBucketCorsCommand,
    PutBucketCorsCommandInput,
    PutBucketCorsCommandOutput,
    PutBucketLifecycleConfigurationCommand,
    PutBucketLifecycleConfigurationCommandInput,
    PutBucketLifecycleConfigurationCommandOutput,
    PutBucketOwnershipControlsCommand,
    PutBucketOwnershipControlsCommandInput,
    PutBucketOwnershipControlsCommandOutput,
    PutBucketPolicyCommand,
    PutBucketPolicyCommandInput,
    PutBucketPolicyCommandOutput,
    PutObjectCommand,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    PutPublicAccessBlockCommand,
    PutPublicAccessBlockCommandInput,
    PutPublicAccessBlockCommandOutput,
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
    IAwsS3MoveItemOptions,
    IAwsS3Options,
    IAwsS3PresignGetItemOptions,
    IAwsS3PresignPutItemOptions,
    IAwsS3PresignPutItemPartOptions,
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
} from '@common/aws/interfaces/aws.interface';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from '@common/aws/dtos/aws.s3-multipart.dto';
import {
    AwsS3MaxFetchItems,
    AwsS3MaxPartNumber,
} from '@common/aws/constants/aws.constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
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
 * Service for AWS S3 file operations across public and private S3 buckets.
 *
 * Handles file management (upload, download, delete, move, list), multipart uploads
 * for large files, presigned URL generation, and bucket configuration (policy, CORS, lifecycle).
 *
 * The service is initialized lazily on module init. If IAM credentials or region are not
 * configured, the S3 client will not be created and all methods will return default
 * empty responses instead of throwing errors.
 */
@Injectable()
export class AwsS3Service implements IAwsS3Service, OnModuleInit {
    private readonly logger: Logger = new Logger(AwsS3Service.name);

    private readonly accessKeyId: string | null;
    private readonly secretAccessKey: string | null;
    private readonly region: string | null;
    private readonly maxAttempts: number;
    private readonly timeoutInMs: number;

    private readonly presignExpired: number;
    private readonly multipartExpiredInDay: number;

    private readonly iamArn: string | undefined;
    private readonly corsAllowedOrigin: string[];

    private readonly config: Map<EnumAwsS3Accessibility, IAwsS3ConfigBucket> =
        new Map<EnumAwsS3Accessibility, IAwsS3ConfigBucket>();

    private s3Client: S3Client;

    constructor(
        private readonly configService: ConfigService,
        private readonly fileService: FileService
    ) {
        this.accessKeyId = this.configService.get<string>('aws.s3.iam.key');
        this.secretAccessKey =
            this.configService.get<string>('aws.s3.iam.secret');
        this.region = this.configService.get<string>('aws.s3.region');
        this.maxAttempts = this.configService.get<number>('aws.s3.maxAttempts');
        this.timeoutInMs = this.configService.get<number>('aws.s3.timeoutInMs');

        this.config.set(EnumAwsS3Accessibility.public, {
            ...this.configService.get<IAwsS3ConfigBucket>(
                'aws.s3.config.public'
            ),
            access: EnumAwsS3Accessibility.public,
        });

        this.config.set(EnumAwsS3Accessibility.private, {
            ...this.configService.get<IAwsS3ConfigBucket>(
                'aws.s3.config.private'
            ),
            access: EnumAwsS3Accessibility.private,
        });

        this.presignExpired = this.configService.get<number>(
            'aws.s3.presignExpired'
        );
        this.multipartExpiredInDay = this.configService.get<number>(
            'aws.s3.multipartExpiredInDay'
        );

        this.iamArn = this.configService.get<string>('aws.s3.iam.arn');
        this.corsAllowedOrigin = this.configService.get<string[]>(
            'request.cors.allowedOrigin'
        );
    }

    /**
     * Initializes the S3 client using configured IAM credentials, region, and timeout settings.
     * If any required credential is missing, the client will not be created
     * and the service will operate in a no-op mode.
     */
    onModuleInit(): void {
        if (!this.accessKeyId || !this.secretAccessKey || !this.region) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        this.s3Client = new S3Client({
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
            region: this.region,
            maxAttempts: this.maxAttempts,
            requestHandler: {
                requestTimeout: this.timeoutInMs,
            },
        });
    }

    /**
     * Returns whether the S3 client has been successfully initialized.
     * @returns {boolean} `true` if the S3 client is ready to use, `false` otherwise
     */
    isInitialized(): boolean {
        return !!this.s3Client;
    }

    /**
     * Extracts file information (path, filename, extension, mime) from an S3 key.
     * @param {string} key - The S3 object key
     * @returns {IAwsS3FileInfo} File info object
     */
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
     * Verifies connectivity to AWS S3 by listing buckets.
     * Returns `false` immediately if the service is not initialized.
     * @returns {Promise<boolean>} `true` if connected successfully, `false` if not initialized or request fails
     */
    async checkConnection(): Promise<boolean> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return false;
        }

        try {
            await this.s3Client.send(new ListBucketsCommand({}));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Checks if the configured S3 bucket exists and is accessible.
     * Returns `false` immediately if the service is not initialized.
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<boolean>} `true` if the bucket exists and is reachable, `false` if not initialized
     */
    async checkBucket(options?: IAwsS3Options): Promise<boolean> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return false;
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: config.bucket,
        });

        await this.s3Client.send<
            HeadBucketCommandInput,
            HeadBucketCommandOutput
        >(command);
        return true;
    }

    /**
     * Checks if an object exists in S3 and returns its metadata.
     * Returns `null` immediately if the service is not initialized.
     * @param {string} key - The S3 object key to check (must not start with "/")
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto>} Object metadata, or `null` if not initialized
     * @throws {Error} If the key starts with "/"
     */
    async checkItem(
        key: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const item = await this.s3Client.send<
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
            access: accessibility,
        };
    }

    /**
     * Retrieves all objects from S3 under the given path prefix, paginating automatically.
     * Returns an empty array immediately if the service is not initialized.
     * @param {string} path - The path prefix to search (must not start with "/")
     * @param {IAwsS3GetItemsOptions} [options] - Optional configuration including access level and continuation token
     * @returns {Promise<AwsS3Dto[]>} List of matching objects, or `[]` if not initialized
     * @throws {Error} If the path starts with "/"
     */
    async getItems(
        path: string,
        options?: IAwsS3GetItemsOptions
    ): Promise<AwsS3Dto[]> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return [];
        }

        if (path.startsWith('/')) {
            throw new Error('Path should not start with "/"');
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        const allItems: AwsS3Dto[] = [];
        let continuationToken: string | undefined = options?.continuationToken;

        do {
            const command: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: path,
                MaxKeys: AwsS3MaxFetchItems,
                ContinuationToken: continuationToken,
            });

            const listItems: ListObjectsV2Output = await this.s3Client.send<
                ListObjectsV2CommandInput,
                ListObjectsV2CommandOutput
            >(command);

            if (listItems.Contents) {
                const mappedItems = listItems.Contents.map((item: _Object) => {
                    const { pathWithFilename, extension, mime } =
                        this.getFileInfoFromKey(item.Key);

                    return {
                        bucket: config.bucket,
                        key: item.Key,
                        completedUrl: `${config.baseUrl}${pathWithFilename}`,
                        cdnUrl: config.cdnUrl
                            ? `${config.cdnUrl}${pathWithFilename}`
                            : undefined,
                        baseUrl: config.baseUrl,
                        extension,
                        size: item.Size,
                        mime,
                        access: accessibility,
                    };
                });

                allItems.push(...mappedItems);
            }

            continuationToken = listItems.IsTruncated
                ? listItems.NextContinuationToken
                : undefined;
        } while (continuationToken);

        return allItems;
    }

    /**
     * Retrieves a single object from S3 including its content body.
     * Returns `null` immediately if the service is not initialized.
     * @param {string} key - The S3 object key to retrieve (must not start with "/")
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto>} Object with content data, or `null` if not initialized
     * @throws {Error} If the key starts with "/"
     */
    async getItem(
        key: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const item: GetObjectOutput = await this.s3Client.send<
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
            access: accessibility,
        };
    }

    /**
     * Uploads a file to S3 using a single PUT operation.
     * Returns `null` immediately if the service is not initialized.
     * By default throws if the key already exists; pass `forceUpdate: true` to overwrite.
     * @param {IAwsS3PutItem} file - File object containing the key, buffer, and optional size
     * @param {IAwsS3PutItemOptions} [options] - Optional configuration including force update and access level
     * @returns {Promise<AwsS3Dto>} Uploaded object metadata, or `null` if not initialized
     * @throws {Error} If the key starts with "/", file is missing, path traversal is detected, or key already exists
     */
    async putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Dto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        if (!file.file) {
            throw new Error('File is required');
        }

        if (file.key.includes('..') || file.key.includes('//')) {
            throw new Error('Invalid key: path traversal detected');
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        if (!options?.forceUpdate) {
            const headCommand = new HeadObjectCommand({
                Bucket: config.bucket,
                Key: file.key,
            });

            try {
                await this.s3Client.send<
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

        const content: Buffer = file.file;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: file.key,
            Body: content,
            ServerSideEncryption: 'AES256',
            ChecksumAlgorithm: 'SHA256',
        });

        await this.s3Client.send<PutObjectCommandInput, PutObjectCommandOutput>(
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
            access: accessibility,
        };
    }

    /**
     * Deletes a single object from S3.
     * Returns immediately if the service is not initialized.
     * @param {string} key - The S3 object key to delete (must not start with "/")
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     * @throws {Error} If the key starts with "/"
     */
    async deleteItem(key: string, options?: IAwsS3Options): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        await this.s3Client.send<
            DeleteObjectCommandInput,
            DeleteObjectCommandOutput
        >(command);
    }

    /**
     * Deletes multiple objects from S3 in a single batch request.
     * Returns immediately if the service is not initialized.
     * @param {string[]} keys - Array of S3 object keys to delete (none may start with "/")
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     * @throws {Error} If any key starts with "/"
     */
    async deleteItems(keys: string[], options?: IAwsS3Options): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        if (keys.some(e => e.startsWith('/'))) {
            throw new Error('Keys should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );
        const obj: ObjectIdentifier[] = keys.map((val: string) => ({
            Key: val,
        }));
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: { Objects: obj },
        });

        await this.s3Client.send<
            DeleteObjectsCommandInput,
            DeleteObjectsCommandOutput
        >(command);
    }

    /**
     * Deletes all objects under a directory prefix from S3, paginating automatically.
     * Returns immediately if the service is not initialized.
     * Throws if deletion exceeds 100 pagination iterations (too many objects).
     * @param {string} path - The directory prefix to delete (must not start with "/")
     * @param {IAwsS3DeleteDirOptions} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     * @throws {Error} If the path starts with "/" or max iterations are exceeded
     */
    async deleteDir(
        path: string,
        options?: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        if (path.startsWith('/')) {
            throw new Error('Path should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );
        let continuationToken: string | undefined = undefined;

        const maxIterations = 100;
        let iterations = 0;

        do {
            if (iterations >= maxIterations) {
                throw new Error(
                    `DeleteDir exceeded max iterations (${maxIterations}). Too many objects.`
                );
            }

            const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: path,
                MaxKeys: AwsS3MaxFetchItems,
                ContinuationToken: continuationToken,
            });

            const listItems: ListObjectsV2Output = await this.s3Client.send<
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
                            Quiet: true,
                        },
                    });

                await this.s3Client.send<
                    DeleteObjectsCommandInput,
                    DeleteObjectsCommandOutput
                >(deleteObjectsCommand);
            }

            continuationToken = listItems.NextContinuationToken;
            iterations++;
        } while (continuationToken);
    }

    /**
     * Initiates a multipart upload session for a large file in S3.
     * Returns `null` immediately if the service is not initialized.
     * By default throws if the key already exists; pass `forceUpdate: true` to overwrite.
     * @param {IAwsS3CreateMultiplePart} file - File descriptor containing the key and optional size
     * @param {number} maxPartNumber - Total number of parts planned for this upload (max: `AwsS3MaxPartNumber`)
     * @param {IAwsS3PutItemOptions} [options] - Optional configuration including force update and access level
     * @returns {Promise<AwsS3MultipartDto>} Multipart upload metadata, or `null` if not initialized
     * @throws {Error} If the key starts with "/", max part number is exceeded, or key already exists
     */
    async createMultiPart(
        file: IAwsS3CreateMultiplePart,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3MultipartDto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (maxPartNumber > AwsS3MaxPartNumber) {
            throw new Error(
                `Max part number is greater than ${AwsS3MaxPartNumber}`
            );
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        if (!options?.forceUpdate) {
            const headCommand = new HeadObjectCommand({
                Bucket: config.bucket,
                Key: file.key,
            });

            try {
                await this.s3Client.send<
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
                ServerSideEncryption: 'AES256',
                ChecksumAlgorithm: 'SHA256',
            });

        const response = await this.s3Client.send<
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
            access: accessibility,
        };
    }

    /**
     * Uploads a single part within an active multipart upload session.
     * Returns the unmodified `multipart` object if the service is not initialized.
     * @param {AwsS3MultipartDto} multipart - Active multipart upload metadata
     * @param {number} partNumber - 1-based part number for this chunk
     * @param {Buffer} file - Raw file buffer for this part
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3MultipartDto>} Updated multipart DTO with the new part appended
     */
    async putItemMultiPart(
        multipart: AwsS3MultipartDto,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<AwsS3MultipartDto> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return multipart;
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: multipart.key,
            Body: file,
            PartNumber: partNumber,
            UploadId: multipart.uploadId,
        });

        const { ETag } = await this.s3Client.send<
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
     * Finalizes a multipart upload by assembling all uploaded parts into a single S3 object.
     * Returns immediately if the service is not initialized.
     * @param {string} key - The S3 object key for the multipart upload
     * @param {string} uploadId - The upload session ID returned by `createMultiPart`
     * @param {AwsS3MultipartPartDto[]} parts - Ordered list of uploaded parts with ETags
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async completeMultipart(
        key: string,
        uploadId: string,
        parts: AwsS3MultipartPartDto[],
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const completeMultipartCommand: CompleteMultipartUploadCommand =
            new CompleteMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts.map(part => ({
                        PartNumber: part.partNumber,
                        ETag: part.eTag.startsWith('"')
                            ? part.eTag
                            : `"${part.eTag}"`,
                    })),
                },
            });

        await this.s3Client.send<
            CompleteMultipartUploadCommandInput,
            CompleteMultipartUploadCommandOutput
        >(completeMultipartCommand);

        return;
    }

    /**
     * Aborts an active multipart upload and discards all uploaded parts.
     * Returns immediately if the service is not initialized.
     * @param {string} key - The S3 object key for the multipart upload
     * @param {string} uploadId - The upload session ID to abort
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async abortMultipart(
        key: string,
        uploadId: string,
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const abortMultipartCommand: AbortMultipartUploadCommand =
            new AbortMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
            });

        await this.s3Client.send<
            AbortMultipartUploadCommandInput,
            AbortMultipartUploadCommandOutput
        >(abortMultipartCommand);

        return;
    }

    /**
     * Generates a presigned URL that allows temporary read access to an S3 object.
     * Returns `null` immediately if the service is not initialized.
     * @param {string} key - The S3 object key to generate a download URL for (must not start with "/")
     * @param {IAwsS3PresignGetItemOptions} [options] - Optional expiration time and access level
     * @returns {Promise<AwsS3PresignDto>} Presigned URL with expiry and file metadata, or `null` if not initialized
     * @throws {Error} If the key starts with "/"
     */
    async presignGetItem(
        key: string,
        options?: IAwsS3PresignGetItemOptions
    ): Promise<AwsS3PresignDto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        try {
            await this.s3Client.send<
                HeadObjectCommandInput,
                HeadObjectCommandOutput
            >(headCommand);
        } catch (error: unknown) {
            if (!(error instanceof NotFound)) {
                throw error;
            }
        }

        const { extension, mime } = this.getFileInfoFromKey(key);
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const expiresIn = options?.expired ?? this.presignExpired;

        const presignUrl = await getSignedUrl(this.s3Client, command, {
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
     * Generates a presigned URL that allows temporary write access to upload a file directly to S3.
     * Returns `null` immediately if the service is not initialized.
     * By default throws if the key already exists; pass `forceUpdate: true` to overwrite.
     * @param {AwsS3PresignRequestDto} dto - DTO containing the target key and expected file size
     * @param {IAwsS3PresignPutItemOptions} [options] - Optional expiration time, force update, and access level
     * @returns {Promise<AwsS3PresignDto>} Presigned URL with expiry and file metadata, or `null` if not initialized
     * @throws {Error} If the key starts with "/" or key already exists
     */
    async presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignPutItemOptions
    ): Promise<AwsS3PresignDto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        if (!options?.forceUpdate) {
            const headCommand = new HeadObjectCommand({
                Bucket: config.bucket,
                Key: key,
            });

            try {
                await this.s3Client.send<
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
            ServerSideEncryption: 'AES256',
            ChecksumAlgorithm: 'SHA256',
            ContentDisposition: 'inline',
        });
        const expiresIn = options?.expired ?? this.presignExpired;

        const presignUrl = await getSignedUrl(this.s3Client, command, {
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
     * Generates a presigned URL for uploading a single part within a multipart upload session.
     * Returns `null` immediately if the service is not initialized.
     * @param {AwsS3PresignPartRequestDto} dto - DTO containing the key, size, upload ID, and part number
     * @param {IAwsS3PresignPutItemPartOptions} [options] - Optional expiration time and access level
     * @returns {Promise<AwsS3PresignPartDto>} Presigned URL with part metadata, or `null` if not initialized
     * @throws {Error} If the key starts with "/"
     */
    async presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignPutItemPartOptions
    ): Promise<AwsS3PresignPartDto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
        });

        const { extension, mime } = this.getFileInfoFromKey(key);
        const expiresIn = options?.expired ?? this.presignExpired;
        const presignUrl = await getSignedUrl(
            this.s3Client,
            uploadPartCommand,
            {
                expiresIn,
            }
        );

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
     * Builds an `AwsS3Dto` from a presign request without making any S3 API calls.
     * Useful for constructing object metadata from a known key before the file is actually uploaded.
     * Does not require the S3 client to be initialized.
     * @param {AwsS3PresignRequestDto} dto - DTO containing the target key and optional size
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {AwsS3Dto} Object metadata derived from the key and bucket configuration
     * @throws {Error} If the key starts with "/"
     */
    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): AwsS3Dto {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);
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
            access: accessibility,
        };
    }

    /**
     * Copies an S3 object to a new destination path, then returns the new object's metadata.
     * Supports cross-bucket moves by specifying different source and destination access levels.
     * Returns `null` immediately if the service is not initialized.
     * @param {AwsS3Dto} source - Source object metadata (must have a key not starting with "/")
     * @param {string} destination - Destination path prefix (must not start with "/")
     * @param {IAwsS3MoveItemOptions} [options] - Optional source and destination bucket access levels
     * @returns {Promise<AwsS3Dto>} New object metadata at the destination, or `null` if not initialized
     * @throws {Error} If the source key or destination starts with "/"
     */
    async moveItem(
        source: AwsS3Dto,
        destination: string,
        options?: IAwsS3MoveItemOptions
    ): Promise<AwsS3Dto | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (source.key.startsWith('/')) {
            throw new Error('Source key should not start with "/"');
        }

        if (destination.startsWith('/')) {
            throw new Error('Destination should not start with "/"');
        }

        const configTo = this.config.get(
            options?.accessTo ?? EnumAwsS3Accessibility.public
        );
        const configFrom = this.config.get(
            options?.accessFrom ?? EnumAwsS3Accessibility.public
        );

        const destinationKey = `${destination}/${source.key.split('/').pop()}`;
        const copyCommand = new CopyObjectCommand({
            Bucket: configTo.bucket,
            Key: destinationKey,
            CopySource: `${configFrom.bucket}/${source.key}`,
            MetadataDirective: 'COPY',
            ServerSideEncryption: 'AES256',
        });

        await this.s3Client.send<
            CopyObjectCommandInput,
            CopyObjectCommandOutput
        >(copyCommand);

        const { pathWithFilename, extension, mime } =
            this.getFileInfoFromKey(destinationKey);

        return {
            bucket: configTo.bucket,
            key: destinationKey,
            completedUrl: `${configTo.baseUrl}${pathWithFilename}`,
            cdnUrl:
                configTo.cdnUrl && configTo.cdnUrl !== ''
                    ? `${configTo.cdnUrl}${pathWithFilename}`
                    : undefined,
            extension,
            size: source.size,
            mime,
            access: configTo.access,
        };
    }

    /**
     * Copies multiple S3 objects to a new destination path in parallel.
     * Returns an empty array immediately if the service is not initialized.
     * @param {AwsS3Dto[]} sources - Source objects to move (none may have a key starting with "/")
     * @param {string} destination - Destination path prefix (must not start with "/")
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<AwsS3Dto[]>} New object metadata for all moved files, or `[]` if not initialized
     * @throws {Error} If any source key or the destination starts with "/"
     */
    async moveItems(
        sources: AwsS3Dto[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto[]> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return [];
        }

        if (sources.some(e => e.key.startsWith('/'))) {
            throw new Error('Source keys should not start with "/"');
        }

        if (destination.startsWith('/')) {
            throw new Error('Destination should not start with "/"');
        }

        const promises = [];

        for (const source of sources) {
            promises.push(
                this.moveItem(source, destination, {
                    accessTo: options?.access,
                    accessFrom: source.access,
                })
            );
        }

        const movedItems: AwsS3Dto[] = await Promise.all(promises);
        return movedItems;
    }

    /**
     * Applies a lifecycle rule to the bucket that auto-deletes incomplete multipart uploads
     * after the configured expiry period and removes expired object delete markers.
     * Returns immediately if the service is not initialized.
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async settingBucketExpiredObjectLifecycle(
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.config.get(
            options?.access ?? EnumAwsS3Accessibility.public
        );

        const command: PutBucketLifecycleConfigurationCommand =
            new PutBucketLifecycleConfigurationCommand({
                Bucket: config.bucket,
                LifecycleConfiguration: {
                    Rules: [
                        {
                            ID: 'delete-incomplete-multipart',
                            Status: ExpirationStatus.Enabled,
                            Filter: {
                                Prefix: '', // Apply to all objects
                            },
                            AbortIncompleteMultipartUpload: {
                                DaysAfterInitiation: this.multipartExpiredInDay,
                            },
                            Expiration: {
                                ExpiredObjectDeleteMarker: true,
                            },
                        },
                    ],
                },
            });

        await this.s3Client.send<
            PutBucketLifecycleConfigurationCommandInput,
            PutBucketLifecycleConfigurationCommandOutput
        >(command);
    }

    /**
     * Configures the S3 bucket policy based on accessibility level.
     * For public buckets: grants `s3:GetObject` to everyone and full access to the configured IAM user.
     * For private buckets: removes any existing bucket policy.
     * Returns immediately if the service is not initialized.
     * @param {IAwsS3Options} [options] - Optional configuration to specify the bucket access level (public or private)
     * @returns {Promise<void>}
     */
    async settingBucketPolicy(options?: IAwsS3Options): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        if (accessibility === EnumAwsS3Accessibility.public) {
            const resourceObject: string = `${config.arn}/*`;
            const resources: string[] = [config.arn, resourceObject];

            const bucketPolicy = {
                Version: '2012-10-17',
                Statement: [
                    // Allow public read access to specified folders
                    {
                        Sid: 'PublicReadForSpecificFolder',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: 's3:GetObject',
                        Resource: resources,
                    },
                    // Keep full access for IAM user
                    {
                        Sid: 'IAMUserFullAccess',
                        Effect: 'Allow',
                        Principal: {
                            AWS: this.iamArn,
                        },
                        Action: 's3:*',
                        Resource: resources,
                    },
                ],
            };

            const command: PutBucketPolicyCommand = new PutBucketPolicyCommand({
                Bucket: config.bucket,
                ChecksumAlgorithm: 'SHA256',
                Policy: JSON.stringify(bucketPolicy),
            });

            await this.s3Client.send<
                PutBucketPolicyCommandInput,
                PutBucketPolicyCommandOutput
            >(command);
        } else {
            const command: DeleteBucketPolicyCommand =
                new DeleteBucketPolicyCommand({
                    Bucket: config.bucket,
                });

            await this.s3Client.send<
                DeleteBucketPolicyCommandInput,
                DeleteBucketPolicyCommandOutput
            >(command);
        }
    }

    /**
     * Applies CORS rules to the S3 bucket based on its access level.
     * Public buckets allow GET/HEAD from all origins; private buckets restrict to configured allowed origins.
     * Returns immediately if the service is not initialized.
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async settingCorsConfiguration(options?: IAwsS3Options): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        let command: PutBucketCorsCommand;
        if (accessibility === EnumAwsS3Accessibility.public) {
            command = new PutBucketCorsCommand({
                Bucket: config.bucket,
                CORSConfiguration: {
                    CORSRules: [
                        {
                            AllowedOrigins: ['*'],
                            AllowedMethods: ['GET', 'HEAD'],
                            AllowedHeaders: ['*'],
                            ExposeHeaders: [
                                'ETag',
                                'Content-Length',
                                'Content-Type',
                            ],
                            MaxAgeSeconds: 86400,
                        },
                        {
                            AllowedOrigins: this.corsAllowedOrigin,
                            AllowedMethods: ['PUT', 'POST', 'DELETE'],
                            AllowedHeaders: ['*'],
                            ExposeHeaders: [
                                'ETag',
                                'Content-Length',
                                'x-amz-version-id',
                            ],
                            MaxAgeSeconds: 3600,
                        },
                    ],
                },
            });
        } else {
            command = new PutBucketCorsCommand({
                Bucket: config.bucket,
                CORSConfiguration: {
                    CORSRules: [
                        {
                            AllowedOrigins: this.corsAllowedOrigin,
                            AllowedMethods: [
                                'GET',
                                'HEAD',
                                'PUT',
                                'POST',
                                'DELETE',
                            ],
                            AllowedHeaders: ['*'],
                            ExposeHeaders: [
                                'ETag',
                                'Content-Length',
                                'Content-Type',
                                'Content-Range',
                                'Accept-Ranges',
                                'Last-Modified',
                                'x-amz-server-side-encryption',
                                'x-amz-request-id',
                                'x-amz-id-2',
                                'x-amz-version-id',
                                'x-amz-delete-marker',
                            ],
                            MaxAgeSeconds: 3600,
                        },
                    ],
                },
            });
        }

        await this.s3Client.send<
            PutBucketCorsCommandInput,
            PutBucketCorsCommandOutput
        >(command);
    }

    /**
     * Disables ACLs on the bucket by setting ownership controls to `BucketOwnerEnforced`.
     * Returns immediately if the service is not initialized.
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async settingDisableAclConfiguration(
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        const command: PutBucketOwnershipControlsCommand =
            new PutBucketOwnershipControlsCommand({
                Bucket: config.bucket,
                OwnershipControls: {
                    Rules: [
                        {
                            ObjectOwnership:
                                ObjectOwnership.BucketOwnerEnforced,
                        },
                    ],
                },
            });

        await this.s3Client.send<
            PutBucketOwnershipControlsCommandInput,
            PutBucketOwnershipControlsCommandOutput
        >(command);
    }

    /**
     * Configures public access blocking on the S3 bucket.
     * Public buckets allow policy-based access but block ACLs; private buckets block all public access.
     * Returns immediately if the service is not initialized.
     * @param {IAwsS3Options} [options] - Optional configuration for bucket access level
     * @returns {Promise<void>}
     */
    async settingBlockPublicAccessConfiguration(
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.config.get(accessibility);

        let command: PutPublicAccessBlockCommand;
        if (accessibility === EnumAwsS3Accessibility.public) {
            command = new PutPublicAccessBlockCommand({
                Bucket: config.bucket,
                PublicAccessBlockConfiguration: {
                    BlockPublicAcls: true,
                    IgnorePublicAcls: true,
                    BlockPublicPolicy: false,
                    RestrictPublicBuckets: false,
                },
            });
        } else {
            command = new PutPublicAccessBlockCommand({
                Bucket: config.bucket,
                PublicAccessBlockConfiguration: {
                    BlockPublicAcls: true,
                    BlockPublicPolicy: true,
                    IgnorePublicAcls: true,
                    RestrictPublicBuckets: true,
                },
            });
        }

        await this.s3Client.send<
            PutPublicAccessBlockCommandInput,
            PutPublicAccessBlockCommandOutput
        >(command);
    }
}
