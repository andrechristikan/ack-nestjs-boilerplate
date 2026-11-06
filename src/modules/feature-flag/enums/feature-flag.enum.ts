/**
 * Seeded feature-flag keys a route or domain gates on.
 * @public
 */
export enum EnumFeatureFlagKey {
    loginWithGoogle = 'loginWithGoogle',
    loginWithApple = 'loginWithApple',
    loginWithCredential = 'loginWithCredential',
    signUp = 'signUp',
    changePassword = 'changePassword',
    workspace = 'workspace',
}

/**
 * Seeded feature-flag metadata sub-keys code reads.
 * @public
 */
export enum EnumFeatureFlagMetadataKey {
    signUpAllowed = 'signUpAllowed',
    forgotAllowed = 'forgotAllowed',
    invitationAllowed = 'invitationAllowed',
    joinRequestAllowed = 'joinRequestAllowed',
}
