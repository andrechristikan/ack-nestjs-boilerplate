import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface IAwsS3PutItemOptions {
    path?: string;
    customFilename?: string;
}

export interface IAwsS3PutItemWithAclOptions extends IAwsS3PutItemOptions {
    acl?: ObjectCannedACL;
}

export interface IAwsS3RandomFilename {
    path: string;
    customFilename: string;
}

export interface IAwsS3PutItem {
    buffer: string | Uint8Array | Buffer;
    originalname: string;
    size: number;
}
