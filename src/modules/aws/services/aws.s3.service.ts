import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { IAwsS3Service } from 'src/modules/aws/interfaces/aws.s3-service.interface';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import {
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
    IAwsS3PutItemWithAclOptions,
    IAwsS3PutPresignUrlFile,
    IAwsS3PutPresignUrlOptions,
} from 'src/modules/aws/interfaces/aws.interface';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from 'src/modules/aws/dtos/aws.s3-multipart.dto';
import { AWS_S3_MAX_PART_NUMBER } from 'src/modules/aws/constants/aws.constant';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsS3PresignUrlDto } from 'src/modules/aws/dtos/aws.s3-presign-url.dto';

@Injectable()
export class AwsS3Service implements IAwsS3Service {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly baseUrl: string;
    private readonly presignUrlExpired: number;

    constructor(private readonly configService: ConfigService) {
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
        this.presignUrlExpired = this.configService.get<number>(
            'aws.s3.presignUrlExpired'
        );
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

    async listItemInBucket(path?: string): Promise<AwsS3Dto[]> {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: path,
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
                    completedUrl: `${this.baseUrl}${val.Key}`,
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
    ): Promise<AwsS3Dto> {
        const path: string = `/${options?.path?.replace(/^\/*|\/*$/g, '') ?? ''}`;
        const mime: string = file.originalname.substring(
            file.originalname.lastIndexOf('.') + 1,
            file.originalname.length
        );
        const filename = options?.customFilename
            ? `${options?.customFilename.replace(/^\/*|\/*$/g, '')}.${mime}`
            : file.originalname.replace(/^\/*|\/*$/g, '');
        const content: string | Uint8Array | Buffer = file.buffer;
        const key: string =
            path === '/' ? `${path}${filename}` : `${path}/${filename}`;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: content,
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
                completedUrl: `${this.baseUrl}${key}`,
                baseUrl: this.baseUrl,
                mime,
                size: file.size,
            };
        } catch (err: any) {
            throw err;
        }
    }

    async putItemInBucketWithAcl(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3Dto> {
        const path: string = `/${options?.path?.replace(/^\/*|\/*$/g, '') ?? ''}`;
        const acl: ObjectCannedACL = options?.acl
            ? (options.acl as ObjectCannedACL)
            : ObjectCannedACL.public_read;

        const mime: string = file.originalname.substring(
            file.originalname.lastIndexOf('.') + 1,
            file.originalname.length
        );
        const filename = options?.customFilename
            ? `${options?.customFilename.replace(/^\/*|\/*$/g, '')}.${mime}`
            : file.originalname.replace(/^\/*|\/*$/g, '');
        const content: string | Uint8Array | Buffer = file.buffer;

        const key: string =
            path === '/' ? `${path}${filename}` : `${path}/${filename}`;
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
                completedUrl: `${this.baseUrl}${key}`,
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
            const listItems = lists.Contents.map(val => ({
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
    ): Promise<AwsS3MultipartDto> {
        if (maxPartNumber > AWS_S3_MAX_PART_NUMBER) {
            throw new Error(
                `Max part number is greater than ${AWS_S3_MAX_PART_NUMBER}`
            );
        }

        const path: string = `/${options?.path?.replace(/^\/*|\/*$/g, '') ?? ''}`;
        const mime: string = file.originalname.substring(
            file.originalname.lastIndexOf('.') + 1,
            file.originalname.length
        );
        const filename = options?.customFilename
            ? `${options?.customFilename.replace(/^\/*|\/*$/g, '')}.${mime}`
            : file.originalname.replace(/^\/*|\/*$/g, '');

        const key: string =
            path === '/' ? `${path}${filename}` : `${path}/${filename}`;
        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
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
                completedUrl: `${this.baseUrl}${key}`,
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

    async createMultiPartWithAcl(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3MultipartDto> {
        const path: string = `/${options?.path?.replace(/^\/*|\/*$/g, '') ?? ''}`;
        const acl: ObjectCannedACL = options?.acl
            ? (options.acl as ObjectCannedACL)
            : ObjectCannedACL.public_read;

        const mime: string = file.originalname.substring(
            file.originalname.lastIndexOf('.') + 1,
            file.originalname.length
        );
        const filename = options?.customFilename
            ? `${options?.customFilename.replace(/^\/*|\/*$/g, '')}.${mime}`
            : file.originalname.replace(/^\/*|\/*$/g, '');

        const key: string =
            path === '/' ? `${path}${filename}` : `${path}/${filename}`;
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
                completedUrl: `${this.baseUrl}${key}`,
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
        multipart: AwsS3MultipartDto,
        partNumber: number,
        content: string | Uint8Array | Buffer
    ): Promise<AwsS3MultipartPartDto> {
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
        { size, parts, ...others }: AwsS3MultipartDto,
        part: AwsS3MultipartPartDto
    ): Promise<AwsS3MultipartDto> {
        parts.push(part);
        return {
            ...others,
            size: size + part.size,
            lastPartNumber: part.partNumber,
            parts,
        };
    }

    async completeMultipart(multipart: AwsS3MultipartDto): Promise<void> {
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

    async abortMultipart(multipart: AwsS3MultipartDto): Promise<void> {
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

    async setPresignUrl(
        { filename, size, duration }: IAwsS3PutPresignUrlFile,
        options?: IAwsS3PutPresignUrlOptions
    ): Promise<AwsS3PresignUrlDto> {
        try {
            const path: string = `/${options?.path?.replace(/^\/*|\/*$/g, '') ?? ''}`;
            const key: string =
                path === '/' ? `${path}${filename}` : `${path}/${filename}`;
            const mime: string = filename.substring(
                filename.lastIndexOf('.') + 1,
                filename.length
            );

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: mime,
            });
            const presignUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn: this.presignUrlExpired,
            });

            return {
                bucket: this.bucket,
                pathWithFilename: key,
                path,
                completedUrl: presignUrl,
                expiredIn: this.presignUrlExpired,
                size,
                mime,
                filename,
                baseUrl: this.baseUrl,
                duration,
            };
        } catch (err) {
            throw err;
        }
    }
}
