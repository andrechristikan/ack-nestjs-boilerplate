import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { StreamingBlobTypes } from '@smithy/types';

/**
 * Represents a stored S3 object with its location, metadata, and optional streaming data.
 */
export interface IAwsS3 {
    /** Name of the S3 bucket the object belongs to. */
    bucket: string;
    /** Full object key (path) within the bucket. */
    key: string;
    /** CDN URL for the object, or null when no CDN is configured. */
    cdnUrl: string | null;
    /** Direct URL to access the object, combining the bucket base URL and key. */
    completedUrl: string;
    /** MIME type of the stored object (e.g. `image/jpeg`). */
    mime: string;
    /** File extension without the leading dot (e.g. `jpg`). */
    extension: string;
    /** Access level controlling whether the object is public or private. */
    access: EnumAwsS3Accessibility;
    /** Size of the object in bytes. */
    size: number;
    /**
     * Optional streaming body returned by GetObject operations.
     * Includes SDK helpers for transforming the stream to a string, byte array, or web stream.
     */
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => Promise<string>;
        transformToByteArray?: () => Promise<Buffer>;
        transformToWebStream?: () => Promise<ReadableStream<Buffer>>;
    };
}

/**
 * Describes a single completed part within an S3 multipart upload.
 */
export interface IAwsS3MultipartPart {
    /** ETag returned by S3 after the part was uploaded. */
    eTag: string;
    /** Sequential part number (1-based) assigned during the upload. */
    partNumber: number;
    /** Size of this part in bytes. */
    size: number;
}

/**
 * Extends IAwsS3 with state tracking for an in-progress multipart upload session.
 */
export interface IAwsS3Multipart extends IAwsS3 {
    /** Unique upload ID issued by S3 when the multipart upload was initiated. */
    uploadId: string;
    /** The most recently uploaded part number. */
    lastPartNumber: number;
    /** Total number of parts the file is divided into. */
    maxPartNumber: number;
    /** List of parts that have already been uploaded. */
    parts: IAwsS3MultipartPart[];
}

/**
 * Represents a generated S3 presigned URL for a single object operation.
 */
export interface IAwsS3Presign {
    /** Object key the presigned URL targets. */
    key: string;
    /** MIME type of the object. */
    mime: string;
    /** File extension without the leading dot. */
    extension: string;
    /** Time-limited URL granting the bearer permission to perform the associated S3 operation. */
    presignUrl: string;
    /** Duration in milliseconds after which the presigned URL expires. */
    expiredIn: number;
}

/**
 * Extends IAwsS3Presign with part-specific fields for a multipart upload presigned URL.
 */
export interface IAwsS3PresignPart extends IAwsS3Presign {
    /** Part number this presigned URL is scoped to. */
    partNumber: number;
    /** Expected size of the part in bytes. */
    size: number;
}

/**
 * Base options for S3 operations that target a specific access tier (public or private bucket).
 */
export interface IAwsS3Options {
    /** Access level of the target bucket. Defaults to the service-configured value when omitted. */
    access?: EnumAwsS3Accessibility;
}

/**
 * Options for put (upload) operations, extending base access options.
 */
export interface IAwsS3PutItemOptions extends IAwsS3Options {
    /** When true, an existing object at the same key is overwritten; otherwise the upload may be skipped. */
    forceUpdate?: boolean;
}

/**
 * Options for listing objects within a path, supporting cursor-based pagination.
 */
export interface IAwsS3GetItemsOptions extends IAwsS3Options {
    /** Pagination cursor returned by a previous list call; pass to fetch the next page. */
    continuationToken?: string;
}

/**
 * Options passed to directory-delete operations. Mirrors IAwsS3GetItemsOptions
 * so pagination can be applied while iterating through objects to delete.
 */
export type IAwsS3DeleteDirOptions = IAwsS3GetItemsOptions;

/**
 * Options for generating a presigned GET URL for a single object.
 */
export interface IAwsS3PresignGetItemOptions extends IAwsS3Options {
    /** Custom TTL in seconds for the presigned URL. Uses the service default when omitted. */
    expiredInSeconds?: number;
}

/**
 * Options for generating a presigned PUT URL for a single object upload.
 */
export interface IAwsS3PresignPutItemOptions extends IAwsS3PutItemOptions {
    /** Custom TTL in seconds for the presigned URL. Uses the service default when omitted. */
    expiredInSeconds?: number;
}

/**
 * Options for generating a presigned PUT URL targeting a single part of a multipart upload.
 */
export interface IAwsS3PresignPutItemPartOptions extends IAwsS3Options {
    /** Custom TTL in seconds for the presigned URL. Uses the service default when omitted. */
    expiredInSeconds?: number;
}

/**
 * Options describing the source and destination access tiers when moving an S3 object.
 */
export interface IAwsS3MoveItemOptions {
    /** Access level of the bucket the object is being moved from. */
    accessFrom: EnumAwsS3Accessibility;
    /** Access level of the bucket the object is being moved to. */
    accessTo: EnumAwsS3Accessibility;
}

/**
 * Minimal descriptor for initiating a multipart upload — identifies the object and its total size.
 */
export interface IAwsS3CreateMultiplePart {
    /** Destination object key in the S3 bucket. */
    key: string;
    /** Total file size in bytes, used to calculate the number of parts. */
    size: number;
}

/**
 * Extends IAwsS3CreateMultiplePart with the raw file buffer for direct (non-presigned) upload.
 */
export interface IAwsS3PutItem extends IAwsS3CreateMultiplePart {
    /** Raw binary content of the file to upload. */
    file: Buffer;
}

/**
 * Static configuration for a single S3 bucket used by the service.
 */
export interface IAwsS3ConfigBucket {
    /** AWS region where this bucket is located. */
    region: string;
    /** Bucket name as registered in AWS. */
    bucket: string;
    /** Base URL for constructing object URLs (e.g. `https://s3.amazonaws.com/my-bucket`). */
    baseUrl: string;
    /** Default access level applied to objects stored in this bucket. */
    access: EnumAwsS3Accessibility;
    /** ARN of the bucket, used for policy and lifecycle configuration. */
    arn: string;
    /** CDN base URL for this bucket, or null when CDN is not configured. */
    cdnUrl: string | null;
}

/**
 * Parsed file metadata extracted from a storage path.
 */
export interface IAwsS3FileInfo {
    /** Full path including the filename (e.g. `uploads/2024/photo.jpg`). */
    pathWithFilename: string;
    /** Filename including the extension (e.g. `photo.jpg`). */
    filename: string;
    /** File extension without the leading dot (e.g. `jpg`). */
    extension: string;
    /** MIME type derived from the file extension. */
    mime: string;
}
