/**
 * Day boundary to snap a date to: midnight (`start`) or 23:59:59.999 (`end`).
 * @public
 */
export enum EnumHelperDateDayOf {
    start = 'start',
    end = 'end',
}

/**
 * PEM label a DER key is framed under: PKCS#8 private key or SPKI public key.
 * @public
 */
export enum EnumHelperPemLabel {
    privateKey = 'PRIVATE KEY',
    publicKey = 'PUBLIC KEY',
}
