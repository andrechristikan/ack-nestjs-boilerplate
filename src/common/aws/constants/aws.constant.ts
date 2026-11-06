/** @public */
export const AwsS3MaxPartNumber = 10000;

/** @public */
export const AwsS3MaxFetchItems = 100;

/** @public */
export const AwsSESRateLimitPerDuration = 10;
/** @public */
export const AwsSESRateLimitDurationInMs = 1000;

/** @public */
export const AwsS3ObjectKeyRegex =
    /^(?!\/)(?!.*\/\/)(?!.*\.\.)[A-Za-z0-9._/-]+$/;
