/**
 * Status codes raised by the `aws` kit.
 * @public
 */
export enum EnumAwsStatusCodeError {
    serviceUnavailable = 51400,
    s3ConfigMissing = 51401,
    s3KeyInvalid = 51402,
    s3FileRequired = 51403,
    s3ObjectExist = 51404,
    s3MaxPartNumberExceeded = 51405,
    s3IterationLimitExceeded = 51406,
    sesTemplateBodyRequired = 51407,
}
