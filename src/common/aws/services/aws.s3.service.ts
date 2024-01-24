import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
    IAwsS3RandomFilename,
} from 'src/common/aws/interfaces/aws.interface';
import { IAwsS3Service } from 'src/common/aws/interfaces/aws.s3-service.interface';
import {
    AwsS3MultipartPartsSerialization,
    AwsS3MultipartSerialization,
} from 'src/common/aws/serializations/aws.s3-multipart.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { Readable } from 'stream';
import {
    S3Client,
    GetObjectCommand,
    ListBucketsCommand,
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
    HeadBucketCommand,
    HeadBucketCommandOutput,
    ListBucketsOutput,
    ListObjectsV2Output,
    GetObjectOutput,
    DeleteObjectsCommandInput,
    ListObjectsV2CommandInput,
    ListObjectsV2CommandOutput,
    DeleteObjectsCommandOutput,
    DeleteObjectCommandInput,
    DeleteObjectCommandOutput,
    HeadBucketCommandInput,
    ListBucketsCommandInput,
    ListBucketsCommandOutput,
    GetObjectCommandOutput,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    CreateMultipartUploadCommandOutput,
    UploadPartCommandOutput,
    CompleteMultipartUploadCommandOutput,
    AbortMultipartUploadCommandOutput,
    Bucket,
    _Object,
    ObjectCannedACL,
    CompletedPart,
} from '@aws-sdk/client-s3';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

@Injectable()
export class AwsS3Service implements IAwsS3Service {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly baseUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.s3Client = new S3Client({
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

        this.bucket = this.configService.get<string>('aws.s3.bucket');
        this.baseUrl = this.configService.get<string>('aws.s3.baseUrl');
    }

    async checkBucketExistence(): Promise<HeadBucketCommandOutput> {
        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: this.bucket,
        });

        try {
            const check = await this.s3Client.send<
                HeadBucketCommandInput,
                HeadBucketCommandOutput
            >(command);
            return check;
        } catch (err: any) {
            throw err;
        }
    }

    async listBucket(): Promise<string[]> {
        const command: ListBucketsCommand = new ListBucketsCommand({});

        try {
            const listBucket: ListBucketsOutput = await this.s3Client.send<
                ListBucketsCommandInput,
                ListBucketsCommandOutput
            >(command);
            const mapList: string[] = listBucket.Buckets.map(
                (val: Bucket) => val.Name
            );
            return mapList;
        } catch (err: any) {
            throw err;
        }
    }

    async listItemInBucket(prefix?: string): Promise<AwsS3Serialization[]> {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
        });

        try {
            const listItems: ListObjectsV2Output = await this.s3Client.send<
                ListObjectsV2CommandInput,
                ListObjectsV2CommandOutput
            >(command);

            const mapList = listItems.Contents.map((val: _Object) => {
                const lastIndex: number = val.Key.lastIndexOf('/');
                const path: string = val.Key.substring(0, lastIndex);
                const filename: string = val.Key.substring(
                    lastIndex + 1,
                    val.Key.length
                );
                const mime: string = filename.substring(
                    filename.lastIndexOf('.') + 1,
                    filename.length
                );

                return {
                    bucket: this.bucket,
                    path,
                    pathWithFilename: val.Key,
                    filename: filename,
                    completedUrl: `${this.baseUrl}/${val.Key}`,
                    baseUrl: this.baseUrl,
                    mime,
                    size: val.Size,
                };
            });

            return mapList;
        } catch (err: any) {
            throw err;
        }
    }

    async getItemInBucket(
        pathWithFilename: string
    ): Promise<Readable | ReadableStream<any> | Blob> {
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: this.bucket,
            Key: pathWithFilename,
        });

        try {
            const item: GetObjectOutput = await this.s3Client.send<
                GetObjectCommandInput,
                GetObjectCommandOutput
            >(command);
            return item.Body;
        } catch (err: any) {
            throw err;
        }
    }

    async putItemInBucket(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Serialization> {
        let path: string = options?.path;
        path = path?.startsWith('/') ? path.replace('/', '') : path;
        const acl: ObjectCannedACL = options?.acl
            ? (options.acl as ObjectCannedACL)
            : ObjectCannedACL.public_read;

        const mime: string = file.originalname.substring(
            file.originalname.lastIndexOf('.') + 1,
            file.originalname.length
        );
        const filename = options?.customFilename
            ? `${options?.customFilename}.${mime}`
            : file.originalname;
        const content: string | Uint8Array | Buffer = file.buffer;
        const key: string = path ? `${path}/${filename}` : filename;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: content,
            ACL: acl,
        });

        try {
            await this.s3Client.send<
                PutObjectCommandInput,
                PutObjectCommandOutput
            >(command);

            return {
                bucket: this.bucket,
                path,
                pathWithFilename: key,
                filename: filename,
                completedUrl: `${this.baseUrl}/${key}`,
                baseUrl: this.baseUrl,
                mime,
                size: file.size,
            };
        } catch (err: any) {
            throw err;
        }
    }

    async deleteItemInBucket(pathWithFilename: string): Promise<void> {
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: pathWithFilename,
        });

        try {
            await this.s3Client.send<
                DeleteObjectCommandInput,
                DeleteObjectCommandOutput
            >(command);
            return;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteItemsInBucket(pathWithFilename: string[]): Promise<void> {
        const keys: ObjectIdentifier[] = pathWithFilename.map(
            (val: string) => ({
                Key: val,
            })
        );
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
                Objects: keys,
            },
        });

        try {
            await this.s3Client.send<
                DeleteObjectsCommandInput,
                DeleteObjectsCommandOutput
            >(command);
            return;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteFolder(dir: string): Promise<void> {
        const commandList: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: dir,
        });
        const lists = await this.s3Client.send<
            ListObjectsV2CommandInput,
            ListObjectsV2CommandOutput
        >(commandList);

        try {
            const listItems = lists.Contents.map((val) => ({
                Key: val.Key,
            }));
            const commandDeleteItems: DeleteObjectsCommand =
                new DeleteObjectsCommand({
                    Bucket: this.bucket,
                    Delete: {
                        Objects: listItems,
                    },
                });

            await this.s3Client.send<
                DeleteObjectsCommandInput,
                DeleteObjectsCommandOutput
            >(commandDeleteItems);

            const commandDelete: DeleteObjectCommand = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: dir,
            });
            await this.s3Client.send<
                DeleteObjectCommandInput,
                DeleteObjectCommandOutput
            >(commandDelete);

            return;
        } catch (err: any) {
            throw err;
        }
    }

    async createMultiPart(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3MultipartSerialization> {
        let path: string = options?.path ?? '/';
        path = path.startsWith('/') ? path.replace('/', '') : path;
        const acl: ObjectCannedACL = options?.acl
            ? (options.acl as ObjectCannedACL)
            : ObjectCannedACL.public_read;

        const mime: string = file.originalname.substring(
            file.originalname.lastIndexOf('.') + 1,
            file.originalname.length
        );
        const filename = options?.customFilename
            ? `${options?.customFilename}.${mime}`
            : file.originalname;
        const key: string = path ? `${path}/${filename}` : filename;
        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                ACL: acl,
            });

        try {
            const response = await this.s3Client.send<
                CreateMultipartUploadCommandInput,
                CreateMultipartUploadCommandOutput
            >(multiPartCommand);

            return {
                bucket: this.bucket,
                uploadId: response.UploadId,
                path,
                pathWithFilename: key,
                filename: filename,
                completedUrl: `${this.baseUrl}/${key}`,
                baseUrl: this.baseUrl,
                mime,
                size: 0,
                lastPartNumber: 0,
                maxPartNumber: maxPartNumber,
                parts: [],
            };
        } catch (err: any) {
            throw err;
        }
    }

    async uploadPart(
        multipart: AwsS3MultipartSerialization,
        partNumber: number,
        content: string | Uint8Array | Buffer
    ): Promise<AwsS3MultipartPartsSerialization> {
        const uploadPartCommand: UploadPartCommand = new UploadPartCommand({
            Bucket: this.bucket,
            Key: multipart.path,
            Body: content,
            PartNumber: partNumber,
            UploadId: multipart.uploadId,
        });

        try {
            const { ETag } = await this.s3Client.send<
                UploadPartCommandInput,
                UploadPartCommandOutput
            >(uploadPartCommand);

            return {
                eTag: ETag,
                partNumber: partNumber,
                size: content.length,
            };
        } catch (err: any) {
            throw err;
        }
    }

    async updateMultiPart(
        { size, parts, ...others }: AwsS3MultipartSerialization,
        part: AwsS3MultipartPartsSerialization
    ): Promise<AwsS3MultipartSerialization> {
        parts.push(part);
        return {
            ...others,
            size: size + part.size,
            lastPartNumber: part.partNumber,
            parts,
        };
    }

    async completeMultipart(
        multipart: AwsS3MultipartSerialization
    ): Promise<void> {
        const completeMultipartCommand: CompleteMultipartUploadCommand =
            new CompleteMultipartUploadCommand({
                Bucket: this.bucket,
                Key: multipart.path,
                UploadId: multipart.uploadId,
                MultipartUpload: {
                    Parts: multipart.parts as CompletedPart[],
                },
            });

        try {
            await this.s3Client.send<
                CompleteMultipartUploadCommandInput,
                CompleteMultipartUploadCommandOutput
            >(completeMultipartCommand);

            return;
        } catch (err: any) {
            throw err;
        }
    }

    async abortMultipart(
        multipart: AwsS3MultipartSerialization
    ): Promise<void> {
        const abortMultipartCommand: AbortMultipartUploadCommand =
            new AbortMultipartUploadCommand({
                Bucket: this.bucket,
                Key: multipart.path,
                UploadId: multipart.uploadId,
            });

        try {
            await this.s3Client.send<
                AbortMultipartUploadCommandInput,
                AbortMultipartUploadCommandOutput
            >(abortMultipartCommand);

            return;
        } catch (err: any) {
            throw err;
        }
    }

    async getFilenameFromCompletedUrl(completedUrl: string): Promise<string> {
        return completedUrl.replace(`${this.baseUrl}`, '');
    }

    async createRandomFilename(path?: string): Promise<IAwsS3RandomFilename> {
        const filename: string = this.helperStringService.random(20);

        return {
            path: path ?? '/',
            customFilename: filename,
        };
    }
}
