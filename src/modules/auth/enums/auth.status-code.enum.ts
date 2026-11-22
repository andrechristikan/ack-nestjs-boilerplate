/** @public */
export enum EnumAuthStatusCodeError {
    jwtAccessTokenInvalid = 50800,
    jwtRefreshTokenInvalid = 50801,
    socialGoogleRequired = 50802,
    socialGoogleInvalid = 50803,
    socialAppleRequired = 50804,
    socialAppleInvalid = 50805,
    socialGoogleNotConfigured = 50806,
    socialAppleNotConfigured = 50807,
    providerUnavailable = 50808,
    jwtGuardMissing = 50809,
    passwordContextWord = 50810,
    passwordCommon = 50811,
    socialNonceInvalid = 50812,
}
