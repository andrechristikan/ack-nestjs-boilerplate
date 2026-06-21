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
import {
    IAwsS3,
    IAwsS3ConfigBucket,
    IAwsS3CreateMultiplePart,
    IAwsS3DeleteDirOptions,
    IAwsS3FileInfo,
    IAwsS3GetItemsOptions,
    IAwsS3MoveItemOptions,
    IAwsS3Multipart,
    IAwsS3MultipartPart,
    IAwsS3Options,
    IAwsS3Presign,
    IAwsS3PresignGetItemOptions,
    IAwsS3PresignPart,
    IAwsS3PresignPutItemOptions,
    IAwsS3PresignPutItemPartOptions,
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
} from '@common/aws/interfaces/aws.interface';
import {
    AwsS3MaxFetchItems,
    AwsS3MaxPartNumber,
} from '@common/aws/constants/aws.constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import {
    AwsS3PresignPartRequestDto,
    AwsS3PresignRequestDto,
} from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { FileService } from '@common/file/services/file.service';

@Injectable()
export class AwsS3Service implements IAwsS3Service, OnModuleInit {
    private readonly logger: Logger = new Logger(AwsS3Service.name);

    private readonly accessKeyId: string | null;
    private readonly secretAccessKey: string | null;
    private readonly region: string | null;
    private readonly maxAttempts: number;
    private readonly timeoutInMs: number;

    private readonly presignExpiredInSeconds: number;
    private readonly multipartExpiredInDay: number;

    private readonly iamArn: string | null;
    private readonly corsAllowedOrigin: string[];

    private readonly config: Map<EnumAwsS3Accessibility, IAwsS3ConfigBucket> =
        new Map<EnumAwsS3Accessibility, IAwsS3ConfigBucket>();

    private s3Client: S3Client;

    constructor(
        private readonly configService: ConfigService,
        private readonly fileService: FileService
    ) {
        this.accessKeyId = this.configService.get<string | null>(
            'aws.s3.iam.key'
        )!;
        this.secretAccessKey = this.configService.get<string | null>(
            'aws.s3.iam.secret'
        )!;
        this.region = this.configService.get<string | null>('aws.s3.region')!;
        this.maxAttempts =
            this.configService.get<number>('aws.s3.maxAttempts')!;
        this.timeoutInMs =
            this.configService.get<number>('aws.s3.timeoutInMs')!;

        this.config.set(EnumAwsS3Accessibility.public, {
            ...this.configService.get<IAwsS3ConfigBucket>(
                'aws.s3.config.public'
            )!,
            access: EnumAwsS3Accessibility.public,
        } as IAwsS3ConfigBucket);

        this.config.set(EnumAwsS3Accessibility.private, {
            ...this.configService.get<IAwsS3ConfigBucket>(
                'aws.s3.config.private'
            )!,
            access: EnumAwsS3Accessibility.private,
        } as IAwsS3ConfigBucket);

        this.presignExpiredInSeconds = this.configService.get<number>(
            'aws.s3.presignExpiredInSeconds'
        )!;
        this.multipartExpiredInDay = this.configService.get<number>(
            'aws.s3.multipartExpiredInDay'
        )!;

        this.iamArn = this.configService.get<string | null>('aws.s3.iam.arn')!;
        this.corsAllowedOrigin = this.configService.get<string[]>(
            'request.cors.allowedOrigin'
        )!;
    }

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

    isInitialized(): boolean {
        return !!this.s3Client;
    }

    private getFileInfoFromKey(key: string): IAwsS3FileInfo {
        const pathWithFilename: string = `/${key}`;
        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );

        const extension: string =
            this.fileService.extractExtensionFromFilename(filename);
        const mime =
            this.fileService.extractMimeFromFilename(filename) ??
            'application/octet-stream';

        return { pathWithFilename, filename, extension, mime };
    }

    private getConfig(access?: EnumAwsS3Accessibility): IAwsS3ConfigBucket {
        const config = this.config.get(access ?? EnumAwsS3Accessibility.public);

        if (!config) {
            throw new Error(
                `AWS S3 configuration for access level ${access} is missing.`
            );
        }

        return config;
    }

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

    async checkBucket(options?: IAwsS3Options): Promise<boolean> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return false;
        }

        const config = this.getConfig(options?.access)!;

        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: config.bucket,
        });

        await this.s3Client.send<
            HeadBucketCommandInput,
            HeadBucketCommandOutput
        >(command);
        return true;
    }

    async checkItem(
        key: string,
        options?: IAwsS3Options
    ): Promise<IAwsS3 | null> {
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
        const config = this.getConfig(accessibility);

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
                    : null,
            extension,
            size: item.ContentLength ?? 0,
            mime,
            access: accessibility,
        };
    }

    async getItems(
        path: string,
        options?: IAwsS3GetItemsOptions
    ): Promise<IAwsS3[]> {
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
        const config = this.getConfig(accessibility);

        const allItems: IAwsS3[] = [];
        let continuationToken: string | null =
            options?.continuationToken ?? null;

        do {
            const command: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: path,
                MaxKeys: AwsS3MaxFetchItems,
                ContinuationToken: continuationToken ?? undefined,
            });

            const listItems: ListObjectsV2Output = await this.s3Client.send<
                ListObjectsV2CommandInput,
                ListObjectsV2CommandOutput
            >(command);

            if (listItems.Contents) {
                const mappedItems = listItems.Contents.map((item: _Object) => {
                    const { pathWithFilename, extension, mime } =
                        this.getFileInfoFromKey(item.Key!);

                    return {
                        bucket: config.bucket,
                        key: item.Key!,
                        completedUrl: `${config.baseUrl}${pathWithFilename}`,
                        cdnUrl: config.cdnUrl
                            ? `${config.cdnUrl}${pathWithFilename}`
                            : null,
                        baseUrl: config.baseUrl,
                        extension,
                        size: item.Size ?? 0,
                        mime,
                        access: accessibility,
                    };
                });

                allItems.push(...mappedItems);
            }

            continuationToken =
                listItems.IsTruncated && listItems.NextContinuationToken
                    ? listItems.NextContinuationToken
                    : null;
        } while (continuationToken);

        return allItems;
    }

    async getItem(
        key: string,
        options?: IAwsS3Options
    ): Promise<IAwsS3 | null> {
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
        const config = this.getConfig(accessibility);
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
                    : null,
            extension,
            data: item.Body,
            size: item.ContentLength ?? 0,
            mime,
            access: accessibility,
        };
    }

    async putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3 | null> {
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
        const config = this.getConfig(accessibility);

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
                    : null,
            extension,
            size: file?.size ?? 0,
            mime,
            access: accessibility,
        };
    }

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

        const config = this.getConfig(options?.access);
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        await this.s3Client.send<
            DeleteObjectCommandInput,
            DeleteObjectCommandOutput
        >(command);
    }

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

        const config = this.getConfig(options?.access);
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

        const config = this.getConfig(options?.access);
        let continuationToken: string | null = null;

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
                ContinuationToken: continuationToken ?? undefined,
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

            continuationToken = listItems.NextContinuationToken ?? null;
            iterations++;
        } while (continuationToken);
    }

    async createMultiPart(
        file: IAwsS3CreateMultiplePart,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3Multipart | null> {
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
        const config = this.getConfig(accessibility);

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
            uploadId: response.UploadId!,
            key: file.key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : null,
            extension,
            size: file?.size ?? 0,
            lastPartNumber: 0,
            maxPartNumber: maxPartNumber,
            parts: [],
            mime,
            access: accessibility,
        };
    }

    async putItemMultiPart(
        multipart: IAwsS3Multipart,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<IAwsS3Multipart> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return multipart;
        }

        const config = this.getConfig(options?.access);

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

        const part: IAwsS3MultipartPart = {
            eTag: ETag!,
            partNumber: partNumber,
            size: file.length,
        };

        multipart.parts.push(part);
        multipart.lastPartNumber = part.partNumber;

        return multipart;
    }

    async completeMultipart(
        key: string,
        uploadId: string,
        parts: IAwsS3MultipartPart[],
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.getConfig(options?.access);

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

        const config = this.getConfig(options?.access);

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

    async presignGetItem(
        key: string,
        options?: IAwsS3PresignGetItemOptions
    ): Promise<IAwsS3Presign | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.getConfig(options?.access);

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
        const expiresIn =
            options?.expiredInSeconds ?? this.presignExpiredInSeconds;

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

    async presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignPutItemOptions
    ): Promise<IAwsS3Presign | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.getConfig(options?.access);

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
        const expiresIn =
            options?.expiredInSeconds ?? this.presignExpiredInSeconds;

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

    async presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignPutItemPartOptions
    ): Promise<IAwsS3PresignPart | null> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config = this.getConfig(options?.access);

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
        });

        const { extension, mime } = this.getFileInfoFromKey(key);
        const expiresIn =
            options?.expiredInSeconds ?? this.presignExpiredInSeconds;
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

    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): IAwsS3 {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.getConfig(accessibility)!;
        const { pathWithFilename, extension, mime } =
            this.getFileInfoFromKey(key);

        return {
            bucket: config.bucket,
            key,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl:
                config.cdnUrl && config.cdnUrl !== ''
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : null,
            extension,
            size,
            mime,
            access: accessibility,
        };
    }

    async moveItem(
        source: IAwsS3,
        destination: string,
        options?: IAwsS3MoveItemOptions
    ): Promise<IAwsS3 | null> {
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

        const configTo = this.getConfig(options?.accessTo)!;
        const configFrom = this.getConfig(options?.accessFrom)!;

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
                    : null,
            extension,
            size: source.size,
            mime,
            access: configTo.access,
        };
    }

    async moveItems(
        sources: IAwsS3[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<IAwsS3[]> {
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

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        for (const source of sources) {
            promises.push(
                this.moveItem(source, destination, {
                    accessTo: accessibility,
                    accessFrom: source.access,
                })
            );
        }

        const movedItems = await Promise.allSettled(promises);
        return movedItems
            .filter(item => item.status === 'fulfilled' && item.value !== null)
            .map(item => (item as PromiseFulfilledResult<IAwsS3>).value!);
    }

    async settingBucketExpiredObjectLifecycle(
        options?: IAwsS3Options
    ): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.getConfig(options?.access);

        const command: PutBucketLifecycleConfigurationCommand =
            new PutBucketLifecycleConfigurationCommand({
                Bucket: config.bucket,
                LifecycleConfiguration: {
                    Rules: [
                        {
                            ID: 'delete-incomplete-multipart',
                            Status: ExpirationStatus.Enabled,
                            Filter: {
                                Prefix: '',
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

    async settingBucketPolicy(options?: IAwsS3Options): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.getConfig(accessibility)!;

        if (accessibility === EnumAwsS3Accessibility.public) {
            const resourceObject: string = `${config.arn}/*`;
            const resources: string[] = [config.arn, resourceObject];

            const bucketPolicy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'PublicReadForSpecificFolder',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: 's3:GetObject',
                        Resource: resources,
                    },
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

    async settingCorsConfiguration(options?: IAwsS3Options): Promise<void> {
        if (!this.isInitialized()) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options?.access ?? EnumAwsS3Accessibility.public;
        const config = this.getConfig(accessibility)!;

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
        const config = this.getConfig(accessibility)!;

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
        const config = this.getConfig(accessibility)!;

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
