import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface IAwsS3PutItemOptions {
    path?: string;
    customFilename?: string;
}

export interface IAwsS3PutItemWithAclOptions extends IAwsS3PutItemOptions {
    acl?: ObjectCannedACL;
}

export interface IAwsS3PutPresignUrlOptions {
    path?: string;
}

export interface IAwsS3PutItem {
    buffer: string | Uint8Array | Buffer;
    originalname: string;
    size: number;
}

export interface IAwsS3PutPresignUrlFile {
    filename: string;
    size: number;
    duration?: number;
}
