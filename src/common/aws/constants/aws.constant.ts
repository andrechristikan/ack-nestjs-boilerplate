/** @public */
export const AwsS3MaxPartNumber = 10000;

/** @public */
export const AwsSesRateLimitPerDuration = 10;
/** @public */
export const AwsSesRateLimitDurationInMs = 1000;

/** @public */
export const AwsS3ObjectKeyRegex =
    /^(?!\/)(?!.*\/\/)(?!.*\.\.)[A-Za-z0-9._/-]+$/;
