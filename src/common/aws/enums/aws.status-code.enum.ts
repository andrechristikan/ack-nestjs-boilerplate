/**
 * Status codes raised by the `aws` kit.
 * @public
 */
export enum EnumAwsStatusCodeError {
    serviceUnavailable = 51400,
    s3KeyInvalid = 51401,
    s3FileRequired = 51402,
    s3ObjectExist = 51403,
    s3MaxPartNumberExceeded = 51404,
    s3IterationLimitExceeded = 51405,
    sesTemplateBodyRequired = 51406,
}
