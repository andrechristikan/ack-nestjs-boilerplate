import { CompletedPart, UploadPartRequest } from '@aws-sdk/client-s3';
import { IAwsS3PutItemOptions } from 'src/common/aws/interfaces/aws.interface';
import {
    AwsS3MultipartPartsSerialization,
    AwsS3MultipartSerialization,
} from 'src/common/aws/serializations/aws.s3-multipart.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { Readable } from 'stream';

export interface IAwsS3Service {
    checkConnection(): Promise<Record<string, any>>;

    listBucket(): Promise<string[]>;

    listItemInBucket(prefix?: string): Promise<AwsS3Serialization[]>;

    getItemInBucket(
        filename: string,
        path?: string
    ): Promise<Record<string, any>>;

    putItemInBucket(
        filename: string,
        content:
            | string
            | Uint8Array
            | Buffer
            | Readable
            | ReadableStream
            | Blob,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Serialization>;

    deleteItemInBucket(filename: string): Promise<void>;

    deleteItemsInBucket(filenames: string[]): Promise<void>;

    deleteFolder(dir: string): Promise<void>;

    createMultiPart(
        filename: string,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3MultipartSerialization>;

    uploadPart(
        path: string,
        content: UploadPartRequest['Body'] | string | Uint8Array | Buffer,
        uploadId: string,
        partNumber: number
    ): Promise<AwsS3MultipartPartsSerialization>;

    completeMultipart(
        path: string,
        uploadId: string,
        parts: CompletedPart[]
    ): Promise<void>;

    abortMultipart(path: string, uploadId: string): Promise<void>;
}
