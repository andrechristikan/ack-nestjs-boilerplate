import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ObjectIdentifier,
    CreateMultipartUploadCommand,
    CreateMultipartUploadCommandInput,
    UploadPartCommandInput,
    UploadPartCommand,
    CompleteMultipartUploadCommandInput,
    CompleteMultipartUploadCommand,
    GetObjectCommandInput,
    AbortMultipartUploadCommand,
    AbortMultipartUploadCommandInput,
    ListObjectsV2Output,
    GetObjectOutput,
    DeleteObjectsCommandInput,
    ListObjectsV2CommandInput,
    ListObjectsV2CommandOutput,
    DeleteObjectsCommandOutput,
    DeleteObjectCommandInput,
    DeleteObjectCommandOutput,
    GetObjectCommandOutput,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    CreateMultipartUploadCommandOutput,
    UploadPartCommandOutput,
    CompleteMultipartUploadCommandOutput,
    AbortMultipartUploadCommandOutput,
    _Object,
    ObjectCannedACL,
    HeadObjectCommand,
    HeadObjectCommandInput,
    HeadObjectCommandOutput,
    NoSuchKey,
    HeadBucketCommandOutput,
    HeadBucketCommand,
    HeadBucketCommandInput,
    ListBucketsCommand,
} from '@aws-sdk/client-s3';
import { IAwsS3Service } from 'src/modules/aws/interfaces/aws.s3-service.interface';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import {
    IAwsS3Config,
    IAwsS3DeleteDirOptions,
    IAwsS3GetItemsOptions,
    IAwsS3Options,
    IAwsS3PresignOptions,
    IAwsS3PutItem,
    IAwsS3PutItemWithAclOptions,
} from 'src/modules/aws/interfaces/aws.interface';
import { AWS_S3_MAX_PART_NUMBER } from 'src/modules/aws/constants/aws.constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import { FILE_SIZE_IN_BYTES } from 'src/common/file/constants/file.constant';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';
import { AwsS3PresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-presign.request.dto';
import { AwsS3ResponseDto } from 'src/modules/aws/dtos/response/aws.s3-response.dto';
import { plainToInstance } from 'class-transformer';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from 'src/modules/aws/dtos/aws.s3-multipart.dto';
import { AwsS3PresignMultiPartResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign-multipart.response.dto';

@Injectable()
export class AwsS3Service implements OnModuleInit, IAwsS3Service {
    private readonly presignExpired: number;
    private config: IAwsS3Config;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService
    ) {
        this.presignExpired = this.configService.get<number>(
            'aws.s3.presignExpired'
        );
        this.config = this.configService.get<IAwsS3Config>('aws.s3.config');
    }

    onModuleInit(): void {
        this.config.public.client = new S3Client({
            credentials: {
                accessKeyId: this.config.public.credential.key,
                secretAccessKey: this.config.public.credential.secret,
            },
            region: this.config.public.region,
        });

        this.config.private.client = new S3Client({
            credentials: {
                accessKeyId: this.config.private.credential.key,
                secretAccessKey: this.config.private.credential.secret,
            },
            region: this.config.private.region,
        });
    }

    async checkConnection(options?: IAwsS3Options): Promise<boolean> {
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        try {
            await config.client.send(new ListBucketsCommand({}));

            return true;
        } catch {
            return false;
        }
    }

    async checkBucket(options?: IAwsS3Options): Promise<boolean> {
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: config.bucket,
        });

        await config.client.send<
            HeadBucketCommandInput,
            HeadBucketCommandOutput
        >(command);

        return true;
    }

    async checkItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        const item = await config.client.send<
            HeadObjectCommandInput,
            HeadObjectCommandOutput
        >(headCommand);

        const path: string = `/${key.substring(0, key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${key}`;
        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        return {
            bucket: config.bucket,
            key,
            path,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            size: item.ContentLength?.toString(),
        };
    }

    async getItems(
        path: string,
        options?: IAwsS3GetItemsOptions
    ): Promise<AwsS3Dto[]> {
        if (path.startsWith('/')) {
            throw new Error('Path should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: path,
            MaxKeys: 1000,
            ContinuationToken: options?.continuationToken,
        });

        const listItems: ListObjectsV2Output = await config.client.send<
            ListObjectsV2CommandInput,
            ListObjectsV2CommandOutput
        >(command);

        const mapList: AwsS3Dto[] = listItems.Contents.map((item: _Object) => {
            const path: string = `/${item.Key.substring(0, item.Key.lastIndexOf('/'))}`;
            const pathWithFilename: string = `/${item.Key}`;
            const filename: string = item.Key.substring(
                item.Key.lastIndexOf('/') + 1,
                item.Key.length
            );
            const mime: string = filename.substring(
                filename.lastIndexOf('.') + 1,
                filename.length
            );

            return {
                bucket: config.bucket,
                key: item.Key,
                path,
                pathWithFilename: pathWithFilename,
                filename: filename,
                completedUrl: `${config.baseUrl}${pathWithFilename}`,
                cdnUrl: config.cdnUrl
                    ? `${config.cdnUrl}${pathWithFilename}`
                    : undefined,
                baseUrl: config.baseUrl,
                mime,
                size: item.Size?.toString(),
            };
        });

        if (listItems.IsTruncated) {
            const nextItems: AwsS3Dto[] = await this.getItems(path, {
                ...options,
                continuationToken: listItems.ContinuationToken,
            });

            mapList.push(...nextItems);
        }

        for (const dir of listItems.CommonPrefixes) {
            const dirItems = await this.getItems(dir.Prefix, {
                access: options?.access,
            });

            mapList.push(...dirItems);
        }

        return mapList;
    }

    async getItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        const item: GetObjectOutput = await config.client.send<
            GetObjectCommandInput,
            GetObjectCommandOutput
        >(command);

        const path: string = `/${key.substring(0, key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${key}`;
        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        return {
            bucket: config.bucket,
            key,
            path,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            data: item.Body as any,
            size: item.ContentLength?.toString(),
        };
    }

    async putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (!file.file) {
            throw new Error('File is required');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const path: string = `/${file.key.substring(0, file.key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${file.key}`;
        const filename: string = file.key.substring(
            file.key.lastIndexOf('/') + 1,
            file.key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        const content: Buffer = file.file;
        const key: string =
            path === '/' ? `${path}${filename}` : `${path}/${filename}`;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: content,
        });

        await config.client.send<PutObjectCommandInput, PutObjectCommandOutput>(
            command
        );

        return {
            bucket: config.bucket,
            key,
            path,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            size: file?.size?.toString(),
            duration: file?.duration,
        };
    }

    async putItemWithAcl(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3Dto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (!file.file) {
            throw new Error('File is required');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const path: string = `/${file.key.substring(0, file.key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${file.key}`;
        const filename: string = file.key.substring(
            file.key.lastIndexOf('/') + 1,
            file.key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        const content: Buffer = file.file;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: config.bucket,
            Key: file.key,
            Body: content,
            ACL: options?.acl ?? ObjectCannedACL.public_read,
        });

        await config.client.send<PutObjectCommandInput, PutObjectCommandOutput>(
            command
        );

        return {
            bucket: config.bucket,
            key: file.key,
            path,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            size: file?.size?.toString(),
            duration: file?.duration,
        };
    }

    async deleteItem(key: string, options?: IAwsS3Options): Promise<void> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        await config.client.send<
            DeleteObjectCommandInput,
            DeleteObjectCommandOutput
        >(command);

        return;
    }

    async deleteItems(keys: string[], options?: IAwsS3Options): Promise<void> {
        if (keys.some(e => e.startsWith('/'))) {
            throw new Error('Keys should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const obj: ObjectIdentifier[] = keys.map((val: string) => ({
            Key: val,
        }));
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: {
                Objects: obj,
            },
        });

        await config.client.send<
            DeleteObjectsCommandInput,
            DeleteObjectsCommandOutput
        >(command);

        return;
    }

    async deleteDir(
        path: string,
        options?: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]> {
        if (path.startsWith('/')) {
            throw new Error('Path should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const items: AwsS3Dto[] = await this.getItems(path, options);

        if (items.length > 0) {
            const chunkItems = this.helperArrayService
                .chunk(items, 1000)
                .map((itms: AwsS3Dto[]) => {
                    const commandDeleteItems: DeleteObjectsCommand =
                        new DeleteObjectsCommand({
                            Bucket: config.bucket,
                            Delete: {
                                Objects: itms.map(e => ({
                                    Key: e.pathWithFilename,
                                })),
                            },
                        });

                    return config.client.send<
                        DeleteObjectsCommandInput,
                        DeleteObjectsCommandOutput
                    >(commandDeleteItems);
                });

            await Promise.all(chunkItems);
        }

        const commandDelete: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: path,
        });
        await config.client.send<
            DeleteObjectCommandInput,
            DeleteObjectCommandOutput
        >(commandDelete);

        return;
    }

    async createMultiPart(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3Options
    ): Promise<AwsS3MultipartDto> {
        if (file.key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        } else if (maxPartNumber > AWS_S3_MAX_PART_NUMBER) {
            throw new Error(
                `Max part number is greater than ${AWS_S3_MAX_PART_NUMBER}`
            );
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const path: string = `/${file.key.substring(0, file.key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${file.key}`;
        const filename: string = file.key.substring(
            file.key.lastIndexOf('/') + 1,
            file.key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: config.bucket,
                Key: file.key,
            });

        const response = await config.client.send<
            CreateMultipartUploadCommandInput,
            CreateMultipartUploadCommandOutput
        >(multiPartCommand);

        return {
            bucket: config.bucket,
            uploadId: response.UploadId,
            key: file.key,
            path,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            duration: file?.duration,
            size: file?.size?.toString(),
            lastPartNumber: 0,
            exactSize: '0',
            maxPartNumber: maxPartNumber,
            parts: [],
        };
    }

    async createMultiPartWithAcl(
        file: IAwsS3PutItem,
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

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const path: string = `/${file.key.substring(0, file.key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${file.key}`;
        const filename: string = file.key.substring(
            file.key.lastIndexOf('/') + 1,
            file.key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: config.bucket,
                Key: file.key,
                ACL: options?.acl ?? ObjectCannedACL.public_read,
            });

        const response = await config.client.send<
            CreateMultipartUploadCommandInput,
            CreateMultipartUploadCommandOutput
        >(multiPartCommand);

        return {
            bucket: config.bucket,
            uploadId: response.UploadId,
            path,
            key: file.key,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            size: file?.size?.toString(),
            lastPartNumber: 0,
            exactSize: '0',
            maxPartNumber: maxPartNumber,
            duration: file?.duration,
            parts: [],
        };
    }

    async putItemMultiPart(
        multipart: AwsS3MultipartDto,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<AwsS3MultipartDto> {
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: multipart.path,
            Body: file,
            PartNumber: partNumber,
            UploadId: multipart.uploadId,
        });

        const { ETag } = await config.client.send<
            UploadPartCommandInput,
            UploadPartCommandOutput
        >(uploadPartCommand);

        const part: AwsS3MultipartPartDto = {
            eTag: ETag,
            partNumber: partNumber,
            size: file.length?.toString(),
        };

        return this.updateMultiPart(multipart, part);
    }

    updateMultiPart(
        { exactSize, parts, ...others }: AwsS3MultipartDto,
        part: AwsS3MultipartPartDto
    ): AwsS3MultipartDto {
        parts.push(part);

        return {
            ...others,
            exactSize: exactSize + part.size,
            lastPartNumber: part.partNumber,
            parts,
        };
    }

    async completeMultipart(
        key: string,
        uploadId: string,
        options?: IAwsS3Options
    ): Promise<void> {
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const completeMultipartCommand: CompleteMultipartUploadCommand =
            new CompleteMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
            });

        await config.client.send<
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
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const abortMultipartCommand: AbortMultipartUploadCommand =
            new AbortMultipartUploadCommand({
                Bucket: config.bucket,
                Key: key,
                UploadId: uploadId,
            });

        await config.client.send<
            AbortMultipartUploadCommandInput,
            AbortMultipartUploadCommandOutput
        >(abortMultipartCommand);

        return;
    }

    async presignPutItem(
        key: string,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignResponseDto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const headCommand = new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
        });

        try {
            await config.client.send<
                HeadObjectCommandInput,
                HeadObjectCommandOutput
            >(headCommand);

            throw new Error(`Key ${key} is already exist`);
        } catch (error: unknown) {
            if (!(error instanceof NoSuchKey)) {
                throw error;
            }
        }

        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        const size = options?.allowedSize ?? FILE_SIZE_IN_BYTES;
        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            ContentType: mime,
            ContentLength: size,
        });
        const expiresIn = options?.expired ?? this.presignExpired;
        const presignUrl = await getSignedUrl(config.client, command, {
            expiresIn,
        });

        return { expiredIn: this.presignExpired, presignUrl: presignUrl, key };
    }

    async presignPutItemMultipart(
        key: string,
        uploadId: string,
        partNumber: number,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignMultiPartResponseDto> {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: config.bucket,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
        });

        const expiresIn = options?.expired ?? this.presignExpired;
        const presignUrl = await getSignedUrl(
            config.client,
            uploadPartCommand,
            {
                expiresIn,
            }
        );

        return {
            expiredIn: this.presignExpired,
            presignUrl: presignUrl,
            key,
            partNumber,
            uploadId,
        };
    }

    mapPresign(
        { key, size, duration }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): AwsS3Dto {
        if (key.startsWith('/')) {
            throw new Error('Key should not start with "/"');
        }

        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        const path: string = `/${key.substring(0, key.lastIndexOf('/'))}`;
        const pathWithFilename: string = `/${key}`;
        const filename: string = key.substring(
            key.lastIndexOf('/') + 1,
            key.length
        );
        const mime: string = filename.substring(
            filename.lastIndexOf('.') + 1,
            filename.length
        );

        return {
            bucket: config.bucket,
            path,
            key,
            pathWithFilename,
            filename: filename,
            completedUrl: `${config.baseUrl}${pathWithFilename}`,
            cdnUrl: config.cdnUrl
                ? `${config.cdnUrl}${pathWithFilename}`
                : undefined,
            baseUrl: config.baseUrl,
            mime,
            size,
            duration,
        };
    }

    getBucket(options?: IAwsS3Options): string {
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        return config.bucket;
    }

    getRegion(options?: IAwsS3Options): string {
        const config =
            options?.access === ENUM_AWS_S3_ACCESSIBILITY.PRIVATE
                ? this.config.private
                : this.config.public;

        return config.region;
    }

    mapResponse(dto: AwsS3Dto): AwsS3ResponseDto {
        return plainToInstance(AwsS3ResponseDto, dto);
    }
}
