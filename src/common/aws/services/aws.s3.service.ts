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
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import {
    IAwsS3PutItemOptions,
    IAwsS3,
    IAwsS3MultiPart,
} from '../aws.interface';

@Injectable()
export class AwsS3Service {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.s3Client = new S3Client({
            credentials: {
                accessKeyId:
                    this.configService.get<string>('aws.credential.key'),
                secretAccessKey: this.configService.get<string>(
                    'aws.credential.secret'
                ),
            },
            region: this.configService.get<string>('aws.s3.region'),
        });

        this.bucket = this.configService.get<string>('aws.s3.bucket');
        this.baseUrl = this.configService.get<string>('aws.s3.baseUrl');
    }

    async listBucket(): Promise<string[]> {
        const command: ListBucketsCommand = new ListBucketsCommand({});

        try {
            const listBucket: Record<string, any> = await this.s3Client.send(
                command
            );
            const mapList = listBucket.Buckets.map(
                (val: Record<string, any>) => val.Name
            );

            return mapList;
        } catch (err: any) {
            throw err;
        }
    }

    async listItemInBucket(prefix?: string): Promise<IAwsS3[]> {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
        });

        try {
            const listItems: Record<string, any> = await this.s3Client.send(
                command
            );

            const mapList = listItems.Contents.map(
                (val: Record<string, any>) => {
                    const lastIndex: number = val.Key.lastIndexOf('/');
                    const path: string = val.Key.substring(0, lastIndex);
                    const filename: string = val.Key.substring(
                        lastIndex,
                        val.Key.length
                    );
                    const mime: string = filename
                        .substring(
                            filename.lastIndexOf('.') + 1,
                            filename.length
                        )
                        .toLocaleUpperCase();

                    return {
                        path,
                        pathWithFilename: val.Key,
                        filename: filename,
                        completedUrl: `${this.baseUrl}/${val.Key}`,
                        baseUrl: this.baseUrl,
                        mime,
                    };
                }
            );

            return mapList;
        } catch (err: any) {
            throw err;
        }
    }

    async getItemInBucket(
        filename: string,
        path?: string
    ): Promise<Record<string, any>> {
        if (path)
            path = path.startsWith('/') ? path.replace('/', '') : `${path}`;

        const key: string = path ? `${path}/${filename}` : filename;
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        try {
            const item: Record<string, any> = await this.s3Client.send(command);

            return item.Body;
        } catch (err: any) {
            throw err;
        }
    }

    async putItemInBucket(
        filename: string,
        content:
            | string
            | Uint8Array
            | Buffer
            | Readable
            | ReadableStream
            | Blob,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3> {
        let path: string = options && options.path ? options.path : undefined;
        const acl: string =
            options && options.acl ? options.acl : 'public-read';

        if (path)
            path = path.startsWith('/') ? path.replace('/', '') : `${path}`;

        const mime: string = filename
            .substring(filename.lastIndexOf('.') + 1, filename.length)
            .toUpperCase();
        const key: string = path ? `${path}/${filename}` : filename;
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: content,
            ACL: acl,
        });

        try {
            await this.s3Client.send(command);
        } catch (err: any) {
            throw err;
        }

        return {
            path,
            pathWithFilename: key,
            filename: filename,
            completedUrl: `${this.baseUrl}/${key}`,
            baseUrl: this.baseUrl,
            mime,
        };
    }

    async deleteItemInBucket(filename: string): Promise<void> {
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: filename,
        });

        try {
            await this.s3Client.send(command);
            return;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteItemsInBucket(filenames: string[]): Promise<void> {
        const keys: ObjectIdentifier[] = filenames.map((val) => ({
            Key: val,
        }));
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
                Objects: keys,
            },
        });

        try {
            await this.s3Client.send(command);
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
        const lists = await this.s3Client.send(commandList);

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

            await this.s3Client.send(commandDeleteItems);

            const commandDelete: DeleteObjectCommand = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: dir,
            });
            await this.s3Client.send(commandDelete);

            return;
        } catch (err: any) {
            throw err;
        }
    }

    async createMultiPart(
        filename: string,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3MultiPart> {
        let path: string = options && options.path ? options.path : undefined;
        const acl: string =
            options && options.acl ? options.acl : 'public-read';

        if (path)
            path = path.startsWith('/') ? path.replace('/', '') : `${path}`;

        const mime: string = filename
            .substring(filename.lastIndexOf('.') + 1, filename.length)
            .toUpperCase();
        const key: string = path ? `${path}/${filename}` : filename;

        const multiPartInput: CreateMultipartUploadCommandInput = {
            Bucket: this.bucket,
            Key: key,
            ACL: acl,
        };
        const multiPartCommand: CreateMultipartUploadCommand =
            new CreateMultipartUploadCommand(multiPartInput);

        try {
            const response = await this.s3Client.send(multiPartCommand);

            return {
                uploadId: response.UploadId,
                path,
                pathWithFilename: key,
                filename: filename,
                completedUrl: `${this.baseUrl}/${key}`,
                baseUrl: this.baseUrl,
                mime,
            };
        } catch (err: any) {
            throw err;
        }
    }

    async uploadPart(
        filename: string,
        content: Buffer,
        uploadId: string,
        partNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<void> {
        let path: string = options && options.path ? options.path : undefined;

        if (path)
            path = path.startsWith('/') ? path.replace('/', '') : `${path}`;

        const key: string = path ? `${path}/${filename}` : filename;

        const uploadPartInput: UploadPartCommandInput = {
            Bucket: this.bucket,
            Key: key,
            Body: content,
            PartNumber: partNumber,
            UploadId: uploadId,
        };
        const uploadPartCommand: UploadPartCommand = new UploadPartCommand(
            uploadPartInput
        );

        try {
            await this.s3Client.send(uploadPartCommand);

            return;
        } catch (err: any) {
            throw err;
        }
    }
}
