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
    IAwsS3DeleteDirOptions,
    IAwsS3GetItemsOptions,
    IAwsS3MultipartOptions,
    IAwsS3Options,
    IAwsS3PresignOptions,
    IAwsS3PutItem,
    IAwsS3PutItemWithAclOptions,
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
    putItem(file: IAwsS3PutItem, options?: IAwsS3Options): Promise<AwsS3Dto>;
    putItemWithAcl(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemWithAclOptions
    ): Promise<AwsS3Dto>;
    deleteItem(key: string, options?: IAwsS3Options): Promise<void>;
    deleteItems(keys: string[], options?: IAwsS3Options): Promise<void>;
    deleteDir(
        path: string,
        options?: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]>;
    createMultiPart(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3MultipartOptions
    ): Promise<AwsS3MultipartDto>;
    createMultiPartWithAcl(
        file: IAwsS3PutItem,
        maxPartNumber: number,
        options?: IAwsS3PutItemWithAclOptions
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
    presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignDto>;
    presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignOptions
    ): Promise<AwsS3PresignPartDto>;
    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): AwsS3Dto;
    moveItem(
        source: AwsS3Dto,
        destinationKey: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto>;
    moveItems(
        sources: AwsS3Dto[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<AwsS3Dto[]>;
}
