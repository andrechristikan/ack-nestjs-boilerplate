/**
 * Job names on the session queue.
 * @public
 */
export enum EnumSessionProcess {
    purgeLogins = 'purgeLogins',
}

/**
 * Outcome of the login cache compare-and-set on the jti.
 * @public
 */
export enum EnumSessionCacheUpdate {
    updated = 'updated',
    absent = 'absent',
    mismatch = 'mismatch',
}
