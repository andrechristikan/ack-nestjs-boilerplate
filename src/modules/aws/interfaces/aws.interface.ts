import { ObjectCannedACL, S3Client } from '@aws-sdk/client-s3';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';

export interface IAwsS3Options {
    access?: ENUM_AWS_S3_ACCESSIBILITY;
}

export interface IAwsS3GetItemsOptions extends IAwsS3Options {
    continuationToken?: string;
}

export type IAwsS3DeleteDirOptions = IAwsS3GetItemsOptions;

export interface IAwsS3PutItemOptions extends IAwsS3Options {
    path?: string;
    customFilename?: string;
}

export interface IAwsS3PutItemWithAclOptions extends IAwsS3PutItemOptions {
    acl?: ObjectCannedACL;
}

export interface IAwsS3PresignOptions
    extends Omit<IAwsS3PutItemOptions, 'customFilename'> {
    allowedSize?: number;
}

export interface IAwsS3PutItem {
    file: Buffer;
    originalname: string;
    size: number;
    duration?: number;
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
