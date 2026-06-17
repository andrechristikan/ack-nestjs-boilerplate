import { _Object } from '@aws-sdk/client-s3';
import {
    IAwsS3,
    IAwsS3CreateMultiplePart,
    IAwsS3DeleteDirOptions,
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
    AwsS3PresignPartRequestDto,
    AwsS3PresignRequestDto,
} from '@common/aws/dtos/request/aws.s3-presign.request.dto';

export interface IAwsS3Service {
    checkConnection(): Promise<boolean>;
    checkBucket(options?: IAwsS3Options): Promise<boolean>;
    checkItem(key: string, options?: IAwsS3Options): Promise<IAwsS3 | null>;
    getItems(path: string, options?: IAwsS3GetItemsOptions): Promise<IAwsS3[]>;
    getItem(key: string, options?: IAwsS3Options): Promise<IAwsS3 | null>;
    putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3 | null>;
    deleteItem(key: string, options?: IAwsS3Options): Promise<void>;
    deleteItems(keys: string[], options?: IAwsS3Options): Promise<void>;
    deleteDir(
        path: string,
        options?: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]>;
    createMultiPart(
        file: IAwsS3CreateMultiplePart,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3Multipart | null>;
    putItemMultiPart(
        multipart: IAwsS3Multipart,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<IAwsS3Multipart>;
    completeMultipart(
        key: string,
        uploadId: string,
        parts: IAwsS3MultipartPart[],
        options?: IAwsS3Options
    ): Promise<void>;
    abortMultipart(
        key: string,
        uploadId: string,
        options?: IAwsS3Options
    ): Promise<void>;
    presignGetItem(
        key: string,
        options?: IAwsS3PresignGetItemOptions
    ): Promise<IAwsS3Presign | null>;
    presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignPutItemOptions
    ): Promise<IAwsS3Presign | null>;
    presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignPutItemPartOptions
    ): Promise<IAwsS3PresignPart | null>;
    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): IAwsS3;
    moveItem(
        source: IAwsS3,
        destination: string,
        options?: IAwsS3MoveItemOptions
    ): Promise<IAwsS3 | null>;
    moveItems(
        sources: IAwsS3[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<IAwsS3[]>;
    settingBucketExpiredObjectLifecycle(options: IAwsS3Options): Promise<void>;
    settingBucketPolicy(options?: IAwsS3Options): Promise<void>;
    settingCorsConfiguration(options?: IAwsS3Options): Promise<void>;
    settingDisableAclConfiguration(options?: IAwsS3Options): Promise<void>;
    settingBlockPublicAccessConfiguration(
        options?: IAwsS3Options
    ): Promise<void>;
}
