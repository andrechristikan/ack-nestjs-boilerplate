import { HeadBucketCommandOutput, UploadPartRequest } from '@aws-sdk/client-s3';
import {
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
} from 'src/common/aws/interfaces/aws.interface';
import {
    AwsS3MultipartPartsSerialization,
    AwsS3MultipartSerialization,
} from 'src/common/aws/serializations/aws.s3-multipart.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { Readable } from 'stream';

export interface IAwsS3Service {
    checkBucketExistence(): Promise<HeadBucketCommandOutput>;
    listBucket(): Promise<string[]>;
    listItemInBucket(prefix?: string): Promise<AwsS3Serialization[]>;
    getItemInBucket(
        pathWithFilename: string
    ): Promise<Readable | ReadableStream<any> | Blob>;
    putItemInBucket(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Serialization>;
    deleteItemInBucket(pathWithFilename: string): Promise<void>;
    deleteItemsInBucket(pathWithFilename: string[]): Promise<void>;
    deleteFolder(dir: string): Promise<void>;
    createMultiPart(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3MultipartSerialization>;
    uploadPart(
        multipart: AwsS3MultipartSerialization,
        partNumber: number,
        content: UploadPartRequest['Body'] | string | Uint8Array | Buffer
    ): Promise<AwsS3MultipartPartsSerialization>;
    updateMultiPart(
        { size, parts, ...others }: AwsS3MultipartSerialization,
        part: AwsS3MultipartPartsSerialization
    ): Promise<AwsS3MultipartSerialization>;
    completeMultipart(multipart: AwsS3MultipartSerialization): Promise<void>;
    abortMultipart(multipart: AwsS3MultipartSerialization): Promise<void>;
    getFilenameFromCompletedUrl(completedUrl: string): Promise<string>;
    createRandomFilename(path?: string): Promise<Record<string, any>>;
}
