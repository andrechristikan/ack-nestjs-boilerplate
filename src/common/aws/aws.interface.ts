import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface IAwsS3 {
    path: string;
    pathWithFilename: string;
    filename: string;
    completedUrl: string;
    baseUrl: string;
    mime: string;
}

export interface IAwsS3MultiPart {
    path: string;
    uploadId: string;
    pathNumber?: number;
    maxPartNumber?: number;
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
