import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteBucketPolicyCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ExpirationStatus,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    ListBucketsCommand,
    ListObjectsV2Command,
    NotFound,
    ObjectOwnership,
    PutBucketCorsCommand,
    PutBucketLifecycleConfigurationCommand,
    PutBucketOwnershipControlsCommand,
    PutBucketPolicyCommand,
    PutObjectCommand,
    PutPublicAccessBlockCommand,
    S3Client,
    S3ServiceException,
    UploadPartCommand,
} from '@aws-sdk/client-s3';
import type {
    AbortMultipartUploadCommandInput,
    AbortMultipartUploadCommandOutput,
    CompleteMultipartUploadCommandInput,
    CompleteMultipartUploadCommandOutput,
    CopyObjectCommandInput,
    CopyObjectCommandOutput,
    CreateMultipartUploadCommandInput,
    CreateMultipartUploadCommandOutput,
    DeleteBucketPolicyCommandInput,
    DeleteBucketPolicyCommandOutput,
    DeleteObjectCommandInput,
    DeleteObjectCommandOutput,
    DeleteObjectsCommandInput,
    DeleteObjectsCommandOutput,
    GetObjectCommandInput,
    GetObjectCommandOutput,
    GetObjectOutput,
    HeadBucketCommandInput,
    HeadBucketCommandOutput,
    HeadObjectCommandInput,
    HeadObjectCommandOutput,
    ListObjectsV2CommandInput,
    ListObjectsV2CommandOutput,
    ListObjectsV2Output,
    ObjectIdentifier,
    PutBucketCorsCommandInput,
    PutBucketCorsCommandOutput,
    PutBucketLifecycleConfigurationCommandInput,
    PutBucketLifecycleConfigurationCommandOutput,
    PutBucketOwnershipControlsCommandInput,
    PutBucketOwnershipControlsCommandOutput,
    PutBucketPolicyCommandInput,
    PutBucketPolicyCommandOutput,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    PutPublicAccessBlockCommandInput,
    PutPublicAccessBlockCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes,
    UploadPartCommandInput,
    UploadPartCommandOutput,
    _Object,
} from '@aws-sdk/client-s3';
import type { Command } from '@smithy/types';
import type {
    IAwsS3,
    IAwsS3ConfigBucket,
    IAwsS3ConfigBucketSource,
    IAwsS3ConfigBuckets,
    IAwsS3CopyItemOptions,
    IAwsS3CreateMultiplePart,
    IAwsS3DeleteDirOptions,
    IAwsS3FileInfo,
    IAwsS3GetItemsOptions,
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
    IAwsS3Urls,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3MaxPartNumber } from '@common/aws/constants/aws.constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import type { AwsS3PresignPartRequestDto } from '@common/aws/dtos/request/aws.s3-presign-part.request.dto';
import type { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { FileService } from '@common/file/services/file.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AwsS3FileRequiredException } from '@common/aws/exceptions/aws.s3-file-required.exception';
import { AwsS3IterationLimitExceededException } from '@common/aws/exceptions/aws.s3-iteration-limit-exceeded.exception';
import { AwsS3KeyInvalidException } from '@common/aws/exceptions/aws.s3-key-invalid.exception';
import { AwsS3MaxPartNumberExceededException } from '@common/aws/exceptions/aws.s3-max-part-number-exceeded.exception';
import { AwsS3ObjectExistException } from '@common/aws/exceptions/aws.s3-object-exist.exception';
import { AwsUnavailableException } from '@common/aws/exceptions/aws.unavailable.exception';

@Injectable()
export class AwsS3Service implements OnModuleInit {
    private readonly logger: Logger = new Logger(AwsS3Service.name);

    private readonly accessKeyId: string | null;
    private readonly secretAccessKey: string | null;
    private readonly region: string | null;
    private readonly endpoint: string | null;
    private readonly maxAttempts: number;
    private readonly timeoutInMs: number;
    private readonly deleteDirMaxIterations: number;
    private readonly listMaxKeys: number;

    private readonly presignExpiresInSeconds: number;
    private readonly multipartExpiresInDays: number;
    private readonly temporaryPath: string;
    private readonly temporaryExpiresInDays: number;
    private readonly corsMaxAgeLongInSeconds: number;
    private readonly corsMaxAgeShortInSeconds: number;

    private readonly baseUrlPattern: string;
    private readonly objectUrlPattern: string;
    private readonly cdnUrlPattern: string;

    private readonly iamPrincipalArn: string | null;
    private readonly allowedOrigins: string[];

    private readonly config: IAwsS3ConfigBuckets;

    private s3Client: S3Client;

    constructor(
        private readonly configService: ConfigService,
        private readonly fileService: FileService,
        private readonly helperStringService: HelperStringService
    ) {
        const accessKeyId = this.configService.get<string | null>(
            'aws.s3.accessKeyId'
        );
        this.accessKeyId = accessKeyId ?? null;
        const secretAccessKey = this.configService.get<string | null>(
            'aws.s3.secretAccessKey'
        );
        this.secretAccessKey = secretAccessKey ?? null;
        const region = this.configService.get<string | null>('aws.s3.region');
        this.region = region ?? null;
        const endpoint = this.configService.get<string | null>(
            'aws.s3.endpoint'
        );
        this.endpoint = endpoint ?? null;
        this.maxAttempts =
            this.configService.get<number>('aws.s3.maxAttempts')!;
        this.timeoutInMs =
            this.configService.get<number>('aws.s3.timeoutInMs')!;
        this.deleteDirMaxIterations = this.configService.get<number>(
            'aws.s3.deleteDirMaxIterations'
        )!;

        this.listMaxKeys =
            this.configService.get<number>('aws.s3.listMaxKeys')!;

        this.baseUrlPattern = this.configService.get<string>(
            'aws.s3.baseUrlPattern'
        )!;

        const s3Public =
            this.configService.get<IAwsS3ConfigBucketSource>('aws.s3.public')!;
        const s3Private =
            this.configService.get<IAwsS3ConfigBucketSource>('aws.s3.private')!;
        const publicBaseUrl = this.buildBaseUrl(s3Public.bucket);
        const privateBaseUrl = this.buildBaseUrl(s3Private.bucket);

        this.config = {
            [EnumAwsS3Accessibility.public]: {
                ...s3Public,
                baseUrl: publicBaseUrl,
                access: EnumAwsS3Accessibility.public,
            },
            [EnumAwsS3Accessibility.private]: {
                ...s3Private,
                baseUrl: privateBaseUrl,
                access: EnumAwsS3Accessibility.private,
            },
        };

        this.presignExpiresInSeconds = this.configService.get<number>(
            'aws.s3.presignExpiresInSeconds'
        )!;
        this.multipartExpiresInDays = this.configService.get<number>(
            'aws.s3.multipartExpiresInDays'
        )!;
        this.temporaryPath = this.configService.get<string>(
            'aws.s3.temporaryPath'
        )!;
        this.temporaryExpiresInDays = this.configService.get<number>(
            'aws.s3.temporaryExpiresInDays'
        )!;
        this.corsMaxAgeLongInSeconds = this.configService.get<number>(
            'aws.s3.corsMaxAgeLongInSeconds'
        )!;
        this.corsMaxAgeShortInSeconds = this.configService.get<number>(
            'aws.s3.corsMaxAgeShortInSeconds'
        )!;

        this.objectUrlPattern = this.configService.get<string>(
            'aws.s3.objectUrlPattern'
        )!;
        this.cdnUrlPattern = this.configService.get<string>(
            'aws.s3.cdnUrlPattern'
        )!;

        const iamPrincipalArn = this.configService.get<string | null>(
            'aws.s3.iamPrincipalArn'
        );
        this.iamPrincipalArn = iamPrincipalArn ?? null;
        this.allowedOrigins = this.configService.get<string[]>(
            'request.cors.allowedOrigins'
        )!;
    }

    private getFileInfoFromKey(key: string): IAwsS3FileInfo {
        const pathWithFilename: string = `/${key}`;
        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );

        const extension: string =
            this.fileService.extractExtensionFromFilename(filename);
        const mimeFromFilename =
            this.fileService.extractMimeFromFilename(filename);
        const mime = mimeFromFilename ?? 'application/octet-stream';

        return { pathWithFilename, filename, extension, mime };
    }

    private buildBaseUrl(bucket: string | null): string | null {
        if (!bucket || (!this.endpoint && !this.region)) {
            return null;
        }

        const baseUrl = this.helperStringService.fillPattern(
            this.baseUrlPattern,
            {
                endpoint: this.endpoint ?? '',
                bucket,
                region: this.region ?? '',
            }
        );

        return baseUrl;
    }

    private getConfig(access: EnumAwsS3Accessibility): IAwsS3ConfigBucket {
        return this.config[access];
    }

    private toException(
        error: unknown
    ): S3ServiceException | AwsUnavailableException {
        const isClientFault =
            error instanceof S3ServiceException && error.$fault === 'client';

        return isClientFault ? error : new AwsUnavailableException(error);
    }

    private async sendCommand<
        TInput extends ServiceInputTypes,
        TOutput extends ServiceOutputTypes,
    >(
        command: Command<
            ServiceInputTypes,
            TInput,
            ServiceOutputTypes,
            TOutput,
            S3ClientResolvedConfig
        >
    ): Promise<TOutput> {
        try {
            return await this.s3Client.send<TInput, TOutput>(command);
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    private async assertObjectAbsent(
        bucket: string,
        key: string
    ): Promise<void> {
        const headCommand = new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        try {
            await this.sendCommand<
                HeadObjectCommandInput,
                HeadObjectCommandOutput
            >(headCommand);

            throw new AwsS3ObjectExistException();
        } catch (error: unknown) {
            if (error instanceof AppBaseException) {
                throw error;
            }

            if (!(error instanceof NotFound)) {
                throw new AppUnknownException(error);
            }
        }
    }

    private buildUrls(config: IAwsS3ConfigBucket, key: string): IAwsS3Urls {
        const { cdnUrl } = config;
        const baseUrl = config.baseUrl ?? '';
        const completedUrl = this.helperStringService.fillPattern(
            this.objectUrlPattern,
            { baseUrl, key }
        );

        if (!cdnUrl) {
            return { completedUrl, cdnUrl: null };
        }

        const cdnObjectUrl = this.helperStringService.fillPattern(
            this.cdnUrlPattern,
            { cdnUrl, key }
        );

        return {
            completedUrl,
            cdnUrl: cdnObjectUrl,
        };
    }

    private async copyItemInitialized(
        source: IAwsS3,
        destination: string,
        options: IAwsS3CopyItemOptions
    ): Promise<IAwsS3> {
        if (source.key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        if (destination.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const configTo = this.getConfig(options.accessTo);
        const configFrom = this.getConfig(options.accessFrom);

        const destinationKey = `${destination}/${source.key.split('/').pop()}`;
        const encodedSourceKey = source.key
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');
        const copyCommand = new CopyObjectCommand({
            Bucket: configTo.bucket,
            Key: destinationKey,
            CopySource: `${configFrom.bucket}/${encodedSourceKey}`,
            MetadataDirective: 'COPY',
            ServerSideEncryption: 'AES256',
        });

        await this.sendCommand<CopyObjectCommandInput, CopyObjectCommandOutput>(
            copyCommand
        );

        const { extension, mime } = this.getFileInfoFromKey(destinationKey);
        const { completedUrl, cdnUrl } = this.buildUrls(
            configTo,
            destinationKey
        );

        return {
            bucket: configTo.bucket,
            key: destinationKey,
            completedUrl,
            cdnUrl,
            extension,
            size: source.size,
            mime,
            access: configTo.access,
        };
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
            requestChecksumCalculation: 'WHEN_REQUIRED',
            requestHandler: {
                requestTimeout: this.timeoutInMs,
            },
            ...(this.endpoint
                ? { endpoint: this.endpoint, forcePathStyle: true }
                : {}),
        });
    }

    isInitialized(): boolean {
        return !!this.s3Client;
    }

    async checkConnection(): Promise<boolean> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return false;
        }

        try {
            await this.sendCommand(new ListBucketsCommand({}));
            return true;
        } catch {
            return false;
        }
    }

    async checkBucket(options: IAwsS3Options): Promise<boolean> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return false;
        }

        const config = this.getConfig(options.access);

        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: config.bucket,
        });

        await this.sendCommand<HeadBucketCommandInput, HeadBucketCommandOutput>(
            command
        );
        return true;
    }

    async checkItem(
        key: string,
        options: IAwsS3Options
    ): Promise<IAwsS3 | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const item = await this.sendCommand<
            HeadObjectCommandInput,
            HeadObjectCommandOutput
        >(headCommand);
        const { extension, mime } = this.getFileInfoFromKey(key);
        const { completedUrl, cdnUrl } = this.buildUrls(config, key);

        return {
            bucket: config.bucket,
            key,
            completedUrl,
            cdnUrl,
            extension,
            size: item.ContentLength ?? 0,
            mime,
            access: accessibility,
        };
    }

    async getItems(
        path: string,
        options: IAwsS3GetItemsOptions
    ): Promise<IAwsS3[]> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return [];
        }

        if (path.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

        const allItems: IAwsS3[] = [];
        let continuationToken: string | null =
            options.continuationToken ?? null;

        do {
            const command: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: path,
                MaxKeys: this.listMaxKeys,
                ...(continuationToken !== null && {
                    ContinuationToken: continuationToken,
                }),
            });

            const listItems: ListObjectsV2Output = await this.sendCommand<
                ListObjectsV2CommandInput,
                ListObjectsV2CommandOutput
            >(command);

            if (listItems.Contents) {
                const mappedItems = listItems.Contents.map((item: _Object) => {
                    const { extension, mime } = this.getFileInfoFromKey(
                        item.Key!
                    );
                    const { completedUrl, cdnUrl } = this.buildUrls(
                        config,
                        item.Key!
                    );

                    return {
                        bucket: config.bucket,
                        key: item.Key!,
                        completedUrl,
                        cdnUrl,
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

    /** Reads the first `length` bytes of an object; `null` when S3 is not configured. */
    async getItemBytes(
        key: string,
        length: number,
        options: IAwsS3Options
    ): Promise<Buffer | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Range: `bytes=0-${length - 1}`,
        });
        const item: GetObjectCommandOutput = await this.sendCommand<
            GetObjectCommandInput,
            GetObjectCommandOutput
        >(command);

        return item.Body
            ? Buffer.from(await item.Body.transformToByteArray())
            : Buffer.alloc(0);
    }

    async getItem(key: string, options: IAwsS3Options): Promise<IAwsS3 | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const item: GetObjectOutput = await this.sendCommand<
            GetObjectCommandInput,
            GetObjectCommandOutput
        >(command);
        const { extension, mime } = this.getFileInfoFromKey(key);
        const { completedUrl, cdnUrl } = this.buildUrls(config, key);
        const body = item.Body ?? null;

        return {
            bucket: config.bucket,
            key,
            completedUrl,
            cdnUrl,
            extension,
            ...(body !== null && { data: body }),
            size: item.ContentLength ?? 0,
            mime,
            access: accessibility,
        };
    }

    async putItem(
        file: IAwsS3PutItem,
        options: IAwsS3PutItemOptions
    ): Promise<IAwsS3 | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (file.key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        if (!file.file) {
            throw new AwsS3FileRequiredException();
        }

        if (file.key.includes('..') || file.key.includes('//')) {
            throw new AwsS3KeyInvalidException();
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

        // Sequential by design: a write after its checks
        if (!options.forceUpdate) {
            await this.assertObjectAbsent(config.bucket, file.key);
        }

        const { extension, mime } = this.getFileInfoFromKey(file.key);
        const { completedUrl, cdnUrl } = this.buildUrls(config, file.key);

        const content: Buffer = file.file;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: file.key,
            Body: content,
            ContentType: mime,
            ServerSideEncryption: 'AES256',
            ChecksumAlgorithm: 'SHA256',
        });

        await this.sendCommand<PutObjectCommandInput, PutObjectCommandOutput>(
            command
        );

        return {
            bucket: config.bucket,
            key: file.key,
            completedUrl,
            cdnUrl,
            extension,
            size: file?.size ?? 0,
            mime,
            access: accessibility,
        };
    }

    async deleteItem(key: string, options: IAwsS3Options): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        await this.sendCommand<
            DeleteObjectCommandInput,
            DeleteObjectCommandOutput
        >(command);
    }

    async deleteItems(keys: string[], options: IAwsS3Options): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        if (keys.some(e => e.startsWith('/'))) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);
        const obj: ObjectIdentifier[] = keys.map((val: string) => ({
            Key: val,
        }));
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: { Objects: obj },
        });

        await this.sendCommand<
            DeleteObjectsCommandInput,
            DeleteObjectsCommandOutput
        >(command);
    }

    async deleteDir(
        path: string,
        options: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        if (path.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);
        const prefix = path.endsWith('/') ? path : `${path}/`;
        let continuationToken: string | null = null;

        let iterations = 0;

        do {
            if (iterations >= this.deleteDirMaxIterations) {
                throw new AwsS3IterationLimitExceededException();
            }

            const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: prefix,
                MaxKeys: this.listMaxKeys,
                ...(continuationToken !== null && {
                    ContinuationToken: continuationToken,
                }),
            });

            const listItems: ListObjectsV2Output = await this.sendCommand<
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

                await this.sendCommand<
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
        options: IAwsS3PutItemOptions
    ): Promise<IAwsS3Multipart | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (file.key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        } else if (maxPartNumber > AwsS3MaxPartNumber) {
            throw new AwsS3MaxPartNumberExceededException();
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

        // Sequential by design: a write after its checks
        if (!options.forceUpdate) {
            await this.assertObjectAbsent(config.bucket, file.key);
        }

        const { extension, mime } = this.getFileInfoFromKey(file.key);
        const { completedUrl, cdnUrl } = this.buildUrls(config, file.key);

        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: config.bucket,
                Key: file.key,
                ContentType: mime,
                ContentDisposition: 'inline',
                ServerSideEncryption: 'AES256',
            });

        const response = await this.sendCommand<
            CreateMultipartUploadCommandInput,
            CreateMultipartUploadCommandOutput
        >(multiPartCommand);

        return {
            bucket: config.bucket,
            uploadId: response.UploadId!,
            key: file.key,
            completedUrl,
            cdnUrl,
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
        options: IAwsS3Options
    ): Promise<IAwsS3Multipart> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return multipart;
        }

        const config = this.getConfig(options.access);

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: multipart.key,
            Body: file,
            PartNumber: partNumber,
            UploadId: multipart.uploadId,
        });

        const { ETag } = await this.sendCommand<
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
        options: IAwsS3Options
    ): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.getConfig(options.access);

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

        await this.sendCommand<
            CompleteMultipartUploadCommandInput,
            CompleteMultipartUploadCommandOutput
        >(completeMultipartCommand);

        return;
    }

    async abortMultipart(
        key: string,
        uploadId: string,
        options: IAwsS3Options
    ): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.getConfig(options.access);

        const abortMultipartCommand: AbortMultipartUploadCommand =
            new AbortMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
            });

        await this.sendCommand<
            AbortMultipartUploadCommandInput,
            AbortMultipartUploadCommandOutput
        >(abortMultipartCommand);

        return;
    }

    async presignGetItem(
        key: string,
        options: IAwsS3PresignGetItemOptions
    ): Promise<IAwsS3Presign | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);

        const { extension, mime } = this.getFileInfoFromKey(key);
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });
        const expiresIn =
            options.expiredInSeconds ?? this.presignExpiresInSeconds;

        const presignUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn,
        });

        return {
            expiredInSeconds: expiresIn,
            presignUrl: presignUrl,
            key,
            mime,
            extension,
        };
    }

    async presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options: IAwsS3PresignPutItemOptions
    ): Promise<IAwsS3Presign | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);

        // Sequential by design: a write after its checks
        if (!options.forceUpdate) {
            await this.assertObjectAbsent(config.bucket, key);
        }

        const { extension, mime } = this.getFileInfoFromKey(key);
        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            ContentType: mime,
            ContentLength: size,
        });
        const expiresIn =
            options.expiredInSeconds ?? this.presignExpiresInSeconds;

        const presignUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn,
            signableHeaders: new Set(['content-type']),
        });

        return {
            expiredInSeconds: expiresIn,
            presignUrl: presignUrl,
            key,
            mime,
            extension,
        };
    }

    async presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options: IAwsS3PresignPutItemPartOptions
    ): Promise<IAwsS3PresignPart | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const config = this.getConfig(options.access);

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
        });

        const { extension, mime } = this.getFileInfoFromKey(key);
        const expiresIn =
            options.expiredInSeconds ?? this.presignExpiresInSeconds;
        const presignUrl = await getSignedUrl(
            this.s3Client,
            uploadPartCommand,
            {
                expiresIn,
            }
        );

        return {
            expiredInSeconds: expiresIn,
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
        options: IAwsS3Options
    ): IAwsS3 {
        if (key.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);
        const { extension, mime } = this.getFileInfoFromKey(key);
        const { completedUrl, cdnUrl } = this.buildUrls(config, key);

        return {
            bucket: config.bucket,
            key,
            completedUrl,
            cdnUrl,
            extension,
            size,
            mime,
            access: accessibility,
        };
    }

    async copyItem(
        source: IAwsS3,
        destination: string,
        options: IAwsS3CopyItemOptions
    ): Promise<IAwsS3 | null> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return null;
        }

        const copiedItem = this.copyItemInitialized(
            source,
            destination,
            options
        );

        return copiedItem;
    }

    async copyItems(
        sources: IAwsS3[],
        destination: string,
        options: IAwsS3Options
    ): Promise<IAwsS3[]> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return [];
        }

        if (sources.some(e => e.key.startsWith('/'))) {
            throw new AwsS3KeyInvalidException();
        }

        if (destination.startsWith('/')) {
            throw new AwsS3KeyInvalidException();
        }

        return Promise.all(
            sources.map(source =>
                this.copyItemInitialized(source, destination, {
                    accessTo: options.access,
                    accessFrom: source.access,
                })
            )
        );
    }

    async settingBucketExpiredObjectLifecycle(
        options: IAwsS3Options
    ): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const config = this.getConfig(options.access);

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
                                DaysAfterInitiation:
                                    this.multipartExpiresInDays,
                            },
                            Expiration: {
                                ExpiredObjectDeleteMarker: true,
                            },
                        },
                        {
                            ID: 'delete-temporary',
                            Status: ExpirationStatus.Enabled,
                            Filter: {
                                Prefix: `${this.temporaryPath}/`,
                            },
                            Expiration: {
                                Days: this.temporaryExpiresInDays,
                            },
                        },
                    ],
                },
            });

        await this.sendCommand<
            PutBucketLifecycleConfigurationCommandInput,
            PutBucketLifecycleConfigurationCommandOutput
        >(command);
    }

    async settingBucketPolicy(options: IAwsS3Options): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

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
                            AWS: this.iamPrincipalArn,
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

            await this.sendCommand<
                PutBucketPolicyCommandInput,
                PutBucketPolicyCommandOutput
            >(command);
        } else {
            const command: DeleteBucketPolicyCommand =
                new DeleteBucketPolicyCommand({
                    Bucket: config.bucket,
                });

            await this.sendCommand<
                DeleteBucketPolicyCommandInput,
                DeleteBucketPolicyCommandOutput
            >(command);
        }
    }

    async settingCorsConfiguration(options: IAwsS3Options): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

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
                            MaxAgeSeconds: this.corsMaxAgeLongInSeconds,
                        },
                        {
                            AllowedOrigins: this.allowedOrigins,
                            AllowedMethods: ['PUT', 'POST', 'DELETE'],
                            AllowedHeaders: ['*'],
                            ExposeHeaders: ['ETag', 'Content-Length'],
                            MaxAgeSeconds: this.corsMaxAgeShortInSeconds,
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
                            AllowedOrigins: this.allowedOrigins,
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
                            ],
                            MaxAgeSeconds: this.corsMaxAgeShortInSeconds,
                        },
                    ],
                },
            });
        }

        await this.sendCommand<
            PutBucketCorsCommandInput,
            PutBucketCorsCommandOutput
        >(command);
    }

    async settingDisableAclConfiguration(
        options: IAwsS3Options
    ): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

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

        await this.sendCommand<
            PutBucketOwnershipControlsCommandInput,
            PutBucketOwnershipControlsCommandOutput
        >(command);
    }

    async settingBlockPublicAccessConfiguration(
        options: IAwsS3Options
    ): Promise<void> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn(
                'AWS S3 credentials not configured. S3 functionalities will be disabled.'
            );

            return;
        }

        const accessibility = options.access;
        const config = this.getConfig(accessibility);

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

        await this.sendCommand<
            PutPublicAccessBlockCommandInput,
            PutPublicAccessBlockCommandOutput
        >(command);
    }
}
