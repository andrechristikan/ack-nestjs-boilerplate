import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface IAwsS3PutItemOptions {
    path: string;
    acl?: ObjectCannedACL;
}
