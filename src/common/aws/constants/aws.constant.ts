/**
 * Capped below the S3 hard limit of 10k parts per multipart upload.
 */
export const AwsS3MaxPartNumber = 9500;

export const AwsS3MaxFetchItems = 100;

/**
 * Safe margin under the SES 15/sec cap.
 */
export const AwsSESRateLimitPerDuration = 10;
export const AwsSESRateLimitDurationInMs = 1000;

/**
 * Admits an S3 object key of letters, digits, dot, underscore, hyphen and slash.
 * Every character a URL treats as structure is excluded, including the `$` that
 * `String.prototype.replace` reads as a replacement pattern.
 */
export const AwsS3ObjectKeyRegex = /^[A-Za-z0-9._/-]+$/;
