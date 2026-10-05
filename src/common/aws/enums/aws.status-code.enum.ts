/**
 * Status codes raised by the `aws` kit.
 * @public
 */
export enum EnumAwsStatusCodeError {
    s3KeyInvalid = 51400,
    s3FileRequired = 51401,
    s3ObjectExist = 51402,
    s3MaxPartNumberExceeded = 51403,
    s3IterationLimitExceeded = 51404,
    sesTemplateBodyRequired = 51405,
    s3NotConfigured = 51406,
}
