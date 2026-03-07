/**
 * Maximum number of parts allowed for AWS S3 multipart upload operations.
 */
export const AwsS3MaxPartNumber = 9500; // AWS S3 allows a maximum of 9.5k parts per multipart upload

export const AwsS3MaxFetchItems = 100;

export const AwsSESRateLimitPerDuration = 10; // 10 is a safe number under 15 limit
export const AwsSESRateLimitDurationInMs = 1000;
