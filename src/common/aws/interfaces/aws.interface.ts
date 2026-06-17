import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { StreamingBlobTypes } from '@smithy/types';

export interface IAwsS3 {
    bucket: string;
    key: string;
    cdnUrl: string | null;
    completedUrl: string;
    mime: string;
    extension: string;
    access: EnumAwsS3Accessibility;
    size: number;
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => Promise<string>;
        transformToByteArray?: () => Promise<Buffer>;
        transformToWebStream?: () => Promise<ReadableStream<Buffer>>;
    };
}

export interface IAwsS3MultipartPart {
    eTag: string;
    partNumber: number;
    size: number;
}

export interface IAwsS3Multipart extends IAwsS3 {
    uploadId: string;
    lastPartNumber: number;
    maxPartNumber: number;
    parts: IAwsS3MultipartPart[];
}

export interface IAwsS3Presign {
    key: string;
    mime: string;
    extension: string;
    presignUrl: string;
    expiredIn: number;
}

export interface IAwsS3PresignPart extends IAwsS3Presign {
    partNumber: number;
    size: number;
}

export interface IAwsS3Options {
    access?: EnumAwsS3Accessibility;
}

export interface IAwsS3PutItemOptions extends IAwsS3Options {
    forceUpdate?: boolean;
}

export interface IAwsS3GetItemsOptions extends IAwsS3Options {
    continuationToken?: string;
}

export type IAwsS3DeleteDirOptions = IAwsS3GetItemsOptions;

export interface IAwsS3PresignGetItemOptions extends IAwsS3Options {
    expiredInSeconds?: number;
}

export interface IAwsS3PresignPutItemOptions extends IAwsS3PutItemOptions {
    expiredInSeconds?: number;
}

export interface IAwsS3PresignPutItemPartOptions extends IAwsS3Options {
    expiredInSeconds?: number;
}

export interface IAwsS3MoveItemOptions {
    accessFrom: EnumAwsS3Accessibility;
    accessTo: EnumAwsS3Accessibility;
}

export interface IAwsS3CreateMultiplePart {
    key: string;
    size: number;
}

export interface IAwsS3PutItem extends IAwsS3CreateMultiplePart {
    file: Buffer;
}

export interface IAwsS3ConfigBucket {
    region: string;
    bucket: string;
    baseUrl: string;
    access: EnumAwsS3Accessibility;
    arn: string;
    cdnUrl: string | null;
}

export interface IAwsS3FileInfo {
    pathWithFilename: string;
    filename: string;
    extension: string;
    mime: string;
}
