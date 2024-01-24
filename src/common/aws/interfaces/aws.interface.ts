import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface IAwsS3PutItemOptions {
    path?: string;
    customFilename?: string;
    acl?: ObjectCannedACL;
}

export interface IAwsS3RandomFilename {
    path: string;
    customFilename: string;
}
