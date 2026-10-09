/**
 * Status codes raised by the `api-key` module.
 * @public
 */
export enum EnumApiKeyStatusCodeError {
    xApiKeyRequired = 50700,
    xApiKeyNotFound = 50701,
    xApiKeyInvalid = 50702,
    xApiKeyForbidden = 50703,
    expired = 50704,
    notFound = 50705,
    inactive = 50706,
    startAtNotFuture = 50707,
}
