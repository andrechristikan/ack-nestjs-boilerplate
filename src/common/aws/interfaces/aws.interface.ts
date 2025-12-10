import { ObjectCannedACL } from '@aws-sdk/client-s3';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@common/aws/enums/aws.enum';

export interface IAwsS3Options {
    access?: ENUM_AWS_S3_ACCESSIBILITY;
}

export interface IAwsS3PutItemOptions extends IAwsS3Options {
    forceUpdate?: boolean;
}

export interface IAwsS3GetItemsOptions extends IAwsS3Options {
    continuationToken?: string;
}

export type IAwsS3DeleteDirOptions = IAwsS3GetItemsOptions;

export interface IAwsS3PutItemWithAclOptions extends IAwsS3PutItemOptions {
    acl?: ObjectCannedACL;
}

export interface IAwsS3PresignGetItemOptions extends IAwsS3Options {
    expired?: number;
}

export interface IAwsS3PresignPutItemOptions extends IAwsS3PutItemOptions {
    expired?: number;
}

export interface IAwsS3MoveItemOptions {
    accessFrom?: ENUM_AWS_S3_ACCESSIBILITY;
    accessTo?: ENUM_AWS_S3_ACCESSIBILITY;
}

export interface IAwsS3CreateMultiplePart {
    key: string;
    size?: number;
}

export interface IAwsS3PutItem extends IAwsS3CreateMultiplePart {
    file: Buffer;
}

export interface IAwsS3ConfigBucket {
    bucket: string;
    baseUrl: string;
    access: ENUM_AWS_S3_ACCESSIBILITY;
    cdnUrl?: string;
}

export interface IAwsS3FileInfo {
    pathWithFilename: string;
    filename: string;
    extension: string;
    mime: string;
}
