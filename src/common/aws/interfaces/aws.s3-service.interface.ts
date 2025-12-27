import { _Object } from '@aws-sdk/client-s3';
import {
    AwsS3MultipartDto,
    AwsS3MultipartPartDto,
} from '@common/aws/dtos/aws.s3-multipart.dto';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import {
    AwsS3PresignDto,
    AwsS3PresignPartDto,
} from '@common/aws/dtos/aws.s3-presign.dto';
import {
    AwsS3PresignPartRequestDto,
    AwsS3PresignRequestDto,
} from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import {
    IAwsS3CreateMultiplePart,
    IAwsS3DeleteDirOptions,
    IAwsS3GetItemsOptions,
    IAwsS3MoveItemOptions,
    IAwsS3Options,
    IAwsS3PresignGetItemOptions,
    IAwsS3PresignPutItemOptions,
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
} from '@common/aws/interfaces/aws.interface';

export interface IAwsS3Service {
    checkConnection(): Promise<boolean>;
    checkBucket(options?: IAwsS3Options): Promise<boolean>;
    checkItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto>;
    getItems(
        path: string,
        options?: IAwsS3GetItemsOptions
    ): Promise<AwsS3Dto[]>;
    getItem(key: string, options?: IAwsS3Options): Promise<AwsS3Dto>;
    putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<AwsS3Dto>;
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
    ): Promise<AwsS3MultipartDto>;
    putItemMultiPart(
        multipart: AwsS3MultipartDto,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<AwsS3MultipartDto>;
    completeMultipart(
        key: string,
        uploadId: string,
        parts: AwsS3MultipartPartDto[],
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
    ): Promise<AwsS3PresignDto>;
    presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignPutItemOptions
    ): Promise<AwsS3PresignDto>;
    presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignPutItemOptions
    ): Promise<AwsS3PresignPartDto>;
    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): AwsS3Dto;
    moveItem(
        source: AwsS3Dto,
        destination: string,
        options?: IAwsS3MoveItemOptions
    ): Promise<AwsS3Dto>;
    moveItems(
        sources: AwsS3Dto[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto[]>;
    settingBucketExpiredObjectLifecycle(options: IAwsS3Options): Promise<void>;
    settingBucketPolicy(
        folders: string[],
        options?: IAwsS3Options
    ): Promise<void>;
    settingCorsConfiguration(options?: IAwsS3Options): Promise<void>;
    settingDisableAclConfiguration(options?: IAwsS3Options): Promise<void>;
    settingBlockPublicAccessConfiguration(
        options?: IAwsS3Options
    ): Promise<void>;
}
