import { _Object } from '@aws-sdk/client-s3';
import {
    IAwsS3,
    IAwsS3CreateMultiplePart,
    IAwsS3DeleteDirOptions,
    IAwsS3GetItemsOptions,
    IAwsS3MoveItemOptions,
    IAwsS3Multipart,
    IAwsS3MultipartPart,
    IAwsS3Options,
    IAwsS3Presign,
    IAwsS3PresignGetItemOptions,
    IAwsS3PresignPart,
    IAwsS3PresignPutItemOptions,
    IAwsS3PresignPutItemPartOptions,
    IAwsS3PutItem,
    IAwsS3PutItemOptions,
} from '@common/aws/interfaces/aws.interface';
import {
    AwsS3PresignPartRequestDto,
    AwsS3PresignRequestDto,
} from '@common/aws/dtos/request/aws.s3-presign.request.dto';

/**
 * Contract for the AWS S3 service covering connection checks, object CRUD,
 * multipart uploads, presigned URLs, object moves, and bucket configuration.
 */
export interface IAwsS3Service {
    /**
     * Verifies connectivity to the configured AWS S3 endpoint.
     *
     * @returns {Promise<boolean>} True when the connection succeeds.
     */
    checkConnection(): Promise<boolean>;

    /**
     * Checks whether the configured S3 bucket exists and is accessible.
     *
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<boolean>} True when the bucket is reachable.
     */
    checkBucket(options?: IAwsS3Options): Promise<boolean>;

    /**
     * Checks whether an object exists at the given key without downloading it.
     *
     * @param {string} key - Object key to look up.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<IAwsS3 | null>} Object metadata if found, or null when the key does not exist.
     */
    checkItem(key: string, options?: IAwsS3Options): Promise<IAwsS3 | null>;

    /**
     * Lists all objects under the given path prefix, returning their metadata.
     *
     * @param {string} path - Key prefix to list objects under.
     * @param {IAwsS3GetItemsOptions} options - Optional access-tier override and pagination cursor.
     * @returns {Promise<IAwsS3[]>} Array of object metadata records.
     */
    getItems(path: string, options?: IAwsS3GetItemsOptions): Promise<IAwsS3[]>;

    /**
     * Downloads an object and returns its metadata and streaming body.
     *
     * @param {string} key - Object key to retrieve.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<IAwsS3 | null>} Object metadata with streaming body, or null when not found.
     */
    getItem(key: string, options?: IAwsS3Options): Promise<IAwsS3 | null>;

    /**
     * Uploads a file buffer to S3 at the key specified in the file descriptor.
     *
     * @param {IAwsS3PutItem} file - File descriptor containing the key, size, and raw buffer.
     * @param {IAwsS3PutItemOptions} options - Optional access-tier override and force-update flag.
     * @returns {Promise<IAwsS3 | null>} Stored object metadata, or null when the upload is skipped.
     */
    putItem(
        file: IAwsS3PutItem,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3 | null>;

    /**
     * Deletes a single object from the bucket.
     *
     * @param {string} key - Object key to delete.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    deleteItem(key: string, options?: IAwsS3Options): Promise<void>;

    /**
     * Deletes multiple objects from the bucket in a single batch request.
     *
     * @param {string[]} keys - Array of object keys to delete.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    deleteItems(keys: string[], options?: IAwsS3Options): Promise<void>;

    /**
     * Deletes all objects under the given path prefix.
     * When the prefix contains more objects than a single list page, returns the remaining S3 objects.
     *
     * @param {string} path - Key prefix identifying the directory to delete.
     * @param {IAwsS3DeleteDirOptions} options - Optional access-tier override and pagination cursor.
     * @returns {Promise<void | _Object[]>} Void on full deletion, or remaining S3 objects when deletion is partial.
     */
    deleteDir(
        path: string,
        options?: IAwsS3DeleteDirOptions
    ): Promise<void | _Object[]>;

    /**
     * Initiates a multipart upload session for the given file descriptor.
     *
     * @param {IAwsS3CreateMultiplePart} file - Key and total size of the file to upload.
     * @param {number} maxPartNumber - Total number of parts the file will be split into.
     * @param {IAwsS3PutItemOptions} options - Optional access-tier override and force-update flag.
     * @returns {Promise<IAwsS3Multipart | null>} Multipart upload state, or null when the upload cannot be initiated.
     */
    createMultiPart(
        file: IAwsS3CreateMultiplePart,
        maxPartNumber: number,
        options?: IAwsS3PutItemOptions
    ): Promise<IAwsS3Multipart | null>;

    /**
     * Uploads a single part of an in-progress multipart upload.
     *
     * @param {IAwsS3Multipart} multipart - Current multipart upload state.
     * @param {number} partNumber - Sequential part number (1-based) being uploaded.
     * @param {Buffer} file - Raw binary content of this part.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<IAwsS3Multipart>} Updated multipart state reflecting the newly uploaded part.
     */
    putItemMultiPart(
        multipart: IAwsS3Multipart,
        partNumber: number,
        file: Buffer,
        options?: IAwsS3Options
    ): Promise<IAwsS3Multipart>;

    /**
     * Finalizes a multipart upload, assembling all uploaded parts into a single object.
     *
     * @param {string} key - Object key of the target file.
     * @param {string} uploadId - Multipart upload ID issued by S3.
     * @param {IAwsS3MultipartPart[]} parts - List of completed parts with their ETags and part numbers.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    completeMultipart(
        key: string,
        uploadId: string,
        parts: IAwsS3MultipartPart[],
        options?: IAwsS3Options
    ): Promise<void>;

    /**
     * Aborts an in-progress multipart upload and releases all uploaded part storage.
     *
     * @param {string} key - Object key of the target file.
     * @param {string} uploadId - Multipart upload ID to abort.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    abortMultipart(
        key: string,
        uploadId: string,
        options?: IAwsS3Options
    ): Promise<void>;

    /**
     * Generates a presigned GET URL that grants temporary read access to the specified object.
     *
     * @param {string} key - Object key to generate the URL for.
     * @param {IAwsS3PresignGetItemOptions} options - Optional access-tier override and custom TTL.
     * @returns {Promise<IAwsS3Presign | null>} Presign descriptor, or null when the object does not exist.
     */
    presignGetItem(
        key: string,
        options?: IAwsS3PresignGetItemOptions
    ): Promise<IAwsS3Presign | null>;

    /**
     * Generates a presigned PUT URL that allows a client to upload a single file directly to S3.
     *
     * @param {AwsS3PresignRequestDto} param - Key and size of the file to be uploaded.
     * @param {IAwsS3PresignPutItemOptions} options - Optional access-tier override, force-update flag, and custom TTL.
     * @returns {Promise<IAwsS3Presign | null>} Presign descriptor, or null when the URL cannot be generated.
     */
    presignPutItem(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3PresignPutItemOptions
    ): Promise<IAwsS3Presign | null>;

    /**
     * Generates a presigned PUT URL for uploading a single part in a multipart upload.
     *
     * @param {AwsS3PresignPartRequestDto} param - Key, size, upload ID, and part number for the target part.
     * @param {IAwsS3PresignPutItemPartOptions} options - Optional access-tier override and custom TTL.
     * @returns {Promise<IAwsS3PresignPart | null>} Part-scoped presign descriptor, or null when the URL cannot be generated.
     */
    presignPutItemPart(
        { key, size, uploadId, partNumber }: AwsS3PresignPartRequestDto,
        options?: IAwsS3PresignPutItemPartOptions
    ): Promise<IAwsS3PresignPart | null>;

    /**
     * Maps a presign request DTO to an IAwsS3 descriptor without uploading anything.
     * Used to construct the expected S3 object shape before the client performs the actual upload.
     *
     * @param {AwsS3PresignRequestDto} param - Key and size of the file.
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {IAwsS3} Computed S3 object descriptor.
     */
    mapPresign(
        { key, size }: AwsS3PresignRequestDto,
        options?: IAwsS3Options
    ): IAwsS3;

    /**
     * Copies an existing S3 object to a new destination key and removes the original.
     *
     * @param {IAwsS3} source - Metadata of the object to move.
     * @param {string} destination - Destination key prefix or path.
     * @param {IAwsS3MoveItemOptions} options - Source and destination access levels.
     * @returns {Promise<IAwsS3 | null>} Metadata of the object at its new location, or null on failure.
     */
    moveItem(
        source: IAwsS3,
        destination: string,
        options?: IAwsS3MoveItemOptions
    ): Promise<IAwsS3 | null>;

    /**
     * Moves multiple S3 objects to a new destination prefix in a single batch operation.
     *
     * @param {IAwsS3[]} sources - Array of object metadata to move.
     * @param {string} destination - Destination key prefix or path.
     * @param {IAwsS3Options} options - Optional access-tier override applied to all objects.
     * @returns {Promise<IAwsS3[]>} Array of metadata records reflecting the new object locations.
     */
    moveItems(
        sources: IAwsS3[],
        destination: string,
        options?: IAwsS3Options
    ): Promise<IAwsS3[]>;

    /**
     * Applies a lifecycle rule to the bucket that automatically expires objects after a set period.
     *
     * @param {IAwsS3Options} options - Access-tier identifying the target bucket.
     * @returns {Promise<void>}
     */
    settingBucketExpiredObjectLifecycle(options: IAwsS3Options): Promise<void>;

    /**
     * Applies the standard bucket access policy for the configured access tier.
     *
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    settingBucketPolicy(options?: IAwsS3Options): Promise<void>;

    /**
     * Configures the CORS rules on the bucket to permit browser-based direct uploads.
     *
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    settingCorsConfiguration(options?: IAwsS3Options): Promise<void>;

    /**
     * Disables ACL-based access control on the bucket, enforcing policy-only access.
     *
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    settingDisableAclConfiguration(options?: IAwsS3Options): Promise<void>;

    /**
     * Enables the S3 Block Public Access setting on the bucket to prevent accidental public exposure.
     *
     * @param {IAwsS3Options} options - Optional access-tier override.
     * @returns {Promise<void>}
     */
    settingBlockPublicAccessConfiguration(
        options?: IAwsS3Options
    ): Promise<void>;
}
