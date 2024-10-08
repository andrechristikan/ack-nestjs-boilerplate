import { ObjectCannedACL, S3Client } from '@aws-sdk/client-s3';
import { ENUM_AWS_S3_ACCESSIBILITY } from 'src/modules/aws/enums/aws.enum';

export interface IAwsS3Options {
    access: ENUM_AWS_S3_ACCESSIBILITY;
}

export interface IAwsS3ItemsOptions extends IAwsS3Options {
    path?: string;
    access: ENUM_AWS_S3_ACCESSIBILITY;
}

export interface IAwsS3PutItemOptions extends IAwsS3ItemsOptions {
    customFilename?: string;
}

export interface IAwsS3PutItemWithAclOptions extends IAwsS3PutItemOptions {
    acl?: ObjectCannedACL;
}

export type IAwsS3PresignOptions = IAwsS3ItemsOptions;

export interface IAwsS3PutItem {
    file: Buffer;
    originalname: string;
    size: number;
    duration?: number;
}

export interface IAwsS3Presign
    extends Omit<IAwsS3PutItem, 'file' | 'originalname'> {
    filename: string;
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
    client?: S3Client;
}

export interface IAwsS3Config {
    public: IAwsS3ConfigBucket;
    private: IAwsS3ConfigBucket;
}
