import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface IAwsS3Response {
    path: string;
    pathWithFilename: string;
    filename: string;
    completedUrl: string;
    baseUrl: string;
    mime: string;
}

export interface IAwsS3PutItemOptions {
    path: string;
    acl?: ObjectCannedACL;
}
