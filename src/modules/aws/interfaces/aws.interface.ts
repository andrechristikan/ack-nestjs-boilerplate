import { ObjectCannedACL, S3Client } from '@aws-sdk/client-s3';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';

export interface IAwsS3Options {
    access?: ENUM_AWS_S3_ACCESSIBILITY;
}

export interface IAwsS3MultipartOptions extends IAwsS3Options {
    forceUpdate?: boolean;
}

export interface IAwsS3GetItemsOptions extends IAwsS3Options {
    continuationToken?: string;
}

export type IAwsS3DeleteDirOptions = IAwsS3GetItemsOptions;

export interface IAwsS3PutItemWithAclOptions extends IAwsS3Options {
    acl?: ObjectCannedACL;
}

export interface IAwsS3PresignOptions extends IAwsS3Options {
    expired?: number;
    forceUpdate?: boolean;
}

export interface IAwsS3PutItem {
    file?: Buffer;
    key: string;
    size?: number;
}

export interface IAwsS3ConfigCredential {
    key: string;
    secret: string;
}

export interface IAwsS3ConfigBucket {
    credential: IAwsS3ConfigCredential;
    bucket: string;
    region: string;
    baseUrl: string;
    cdnUrl?: string;
    client?: S3Client;
}

export interface IAwsS3Config {
    public: IAwsS3ConfigBucket;
    private: IAwsS3ConfigBucket;
}

export interface IAwsS3FileInfo {
    pathWithFilename: string;
    filename: string;
    extension: string;
    mime: string;
}
