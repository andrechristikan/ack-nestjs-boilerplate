/**
 * Passport strategy name of the JWT access-token guard.
 * @public
 */
export const AuthJwtAccessGuardKey = 'JwtAccess';

/**
 * Passport strategy name of the JWT refresh-token guard.
 * @public
 */
export const AuthJwtRefreshGuardKey = 'JwtRefresh';

/**
 * Request-store key holding the verified JWT payload.
 * @public
 */
export const AuthPayloadStoreKey = 'AuthPayloadStore';

/**
 * HKDF purpose that seals stored two-factor secrets.
 * @public
 */
export const AuthTwoFactorSecretEncryptionPurpose = 'auth.twoFactor.secret';
