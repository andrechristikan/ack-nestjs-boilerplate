import { HeadBucketCommandOutput, UploadPartRequest } from '@aws-sdk/client-s3';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from 'src/modules/aws/dtos/aws.s3-multipart.dto';
import { AwsS3PresignUrlDto } from 'src/modules/aws/dtos/aws.s3-presign-url.dto';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import {
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
    IAwsS3PutItemWithAclOptions,
    IAwsS3PutPresignUrlFile,
    IAwsS3PutPresignUrlOptions,
} from 'src/modules/aws/interfaces/aws.interface';
import { Readable } from 'stream';

export interface IAwsS3Service {
    checkBucketExistence(): Promise<HeadBucketCommandOutput>;
    listBucket(): Promise<string[]>;
    listItemInBucket(prefix?: string): Promise<AwsS3Dto[]>;
    getItemInBucket(
        pathWithFilename: string
    ): Promise<Readable | ReadableStream<any> | Blob>;
    putItemInBucket(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Dto>;
    putItemInBucketWithAcl(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3Dto>;
    deleteItemInBucket(pathWithFilename: string): Promise<void>;
    deleteItemsInBucket(pathWithFilename: string[]): Promise<void>;
    deleteFolder(dir: string): Promise<void>;
    createMultiPart(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3MultipartDto>;
    createMultiPartWithAcl(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3MultipartDto>;
    uploadPart(
        multipart: AwsS3MultipartDto,
        partNumber: number,
        content: UploadPartRequest['Body'] | string | Uint8Array | Buffer
    ): Promise<AwsS3MultipartPartDto>;
    updateMultiPart(
        { size, parts, ...others }: AwsS3MultipartDto,
        part: AwsS3MultipartPartDto
    ): Promise<AwsS3MultipartDto>;
    completeMultipart(multipart: AwsS3MultipartDto): Promise<void>;
    abortMultipart(multipart: AwsS3MultipartDto): Promise<void>;
    setPresignUrl(
        { filename, size, duration }: IAwsS3PutPresignUrlFile,
        options?: IAwsS3PutPresignUrlOptions
    ): Promise<AwsS3PresignUrlDto>;
}
