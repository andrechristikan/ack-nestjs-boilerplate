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
