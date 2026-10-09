/**
 * Status codes raised by the `api-key` module.
 * @public
 */
export enum EnumApiKeyStatusCodeError {
    xApiKeyRequired = 50700,
    xApiKeyInvalid = 50701,
    xApiKeyForbidden = 50702,
    expired = 50703,
    notFound = 50704,
    inactive = 50705,
    startAtNotFuture = 50706,
    guardMissing = 50707,
}
