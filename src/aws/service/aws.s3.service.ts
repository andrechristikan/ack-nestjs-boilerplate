import {
    S3Client,
    GetObjectCommand,
    ListBucketsCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { IAwsS3PutItemOptions, IAwsS3Response } from '../aws.interface';

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
        const listBucket: Record<string, any> = await this.s3Client.send(
            command
        );
        return listBucket.Buckets.map((val: Record<string, any>) => val.Name);
    }

    async listItemInBucket(prefix?: string): Promise<IAwsS3Response[]> {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
        });
        const listItems: Record<string, any> = await this.s3Client.send(
            command
        );

        return listItems.Contents.map((val: Record<string, any>) => {
            const lastIndex: number = val.Key.lastIndexOf('/');
            const path: string = val.Key.substring(0, lastIndex);
            const filename: string = val.Key.substring(
                lastIndex,
                val.Key.length
            );
            const mime: string = filename
                .substring(filename.lastIndexOf('.') + 1, filename.length)
                .toLocaleUpperCase();

            return {
                path,
                pathWithFilename: val.Key,
                filename: filename,
                completedUrl: `${this.baseUrl}/${val.Key}`,
                baseUrl: this.baseUrl,
                mime,
            };
        });
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

        const item: Record<string, any> = await this.s3Client.send(command);

        return item.Body;
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
    ): Promise<IAwsS3Response> {
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

        await this.s3Client.send(command);

        return {
            path,
            pathWithFilename: key,
            filename: filename,
            completedUrl: `${this.baseUrl}/${key}`,
            baseUrl: this.baseUrl,
            mime,
        };
    }

    async deleteItemInBucket(filename: string): Promise<boolean> {
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: filename,
        });

        try {
            await this.s3Client.send(command);
            return true;
        } catch (e) {
            return false;
        }
    }

    async deleteItemsInBucket(filenames: string[]): Promise<boolean> {
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
            return true;
        } catch (e) {
            return false;
        }
    }

    async deleteFolder(dir: string): Promise<boolean> {
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

            return true;
        } catch (e) {
            return false;
        }
    }
}
