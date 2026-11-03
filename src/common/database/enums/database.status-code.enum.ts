/**
 * Status codes raised by the `database` kit.
 * @public
 */
export enum EnumDatabaseStatusCodeError {
    uniqueValueGenerationFailed = 51800,
    writeConflict = 51801,
    unavailable = 51802,
    idInvalid = 51803,
    transactionExpired = 51804,
}
