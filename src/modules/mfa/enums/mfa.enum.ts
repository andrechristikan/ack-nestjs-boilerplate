/** @public */
export enum EnumMfaQueue {
    mfa = 'mfa',
}

/** @public */
export enum EnumMfaProcess {
    purgeExpired = 'purgeExpired',
}

/** @public */
export enum EnumMfaMethod {
    totp = 'totp',
    backupCode = 'backupCode',
    passkey = 'passkey',
}
