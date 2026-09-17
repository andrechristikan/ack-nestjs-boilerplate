/**
 * Highest part number one S3 multipart upload may request, capped below the S3 hard limit of 10k parts.
 * @public
 */
export const AwsS3MaxPartNumber = 9500;

/**
 * Page size of each S3 object listing request.
 * @public
 */
export const AwsS3MaxFetchItems = 100;

/**
 * Maximum SES sends per rate-limit window of the email worker, a safe margin under the SES 15/sec cap.
 * @public
 */
export const AwsSESRateLimitPerDuration = 10;
/**
 * Rate-limit window of the email worker, paired with `AwsSESRateLimitPerDuration`.
 * @public
 */
export const AwsSESRateLimitDurationInMs = 1000;

/**
 * Admits an S3 object key of letters, digits, dot, underscore, hyphen and slash.
 * Every character a URL treats as structure is excluded, including the `$` that
 * `String.prototype.replace` reads as a replacement pattern.
 * @public
 */
export const AwsS3ObjectKeyRegex = /^[A-Za-z0-9._/-]+$/;
