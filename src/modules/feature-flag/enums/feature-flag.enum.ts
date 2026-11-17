/** @public */
export enum EnumFeatureFlagKey {
    loginWithGoogle = 'loginWithGoogle',
    loginWithApple = 'loginWithApple',
    loginWithCredential = 'loginWithCredential',
    loginWithPasskey = 'loginWithPasskey',
    signUp = 'signUp',
    changePassword = 'changePassword',
    workspace = 'workspace',
    mfa = 'mfa',
}

/** @public */
export enum EnumFeatureFlagMetadataKey {
    signUpAllowed = 'signUpAllowed',
    forgotAllowed = 'forgotAllowed',
    invitationAllowed = 'invitationAllowed',
    joinRequestAllowed = 'joinRequestAllowed',
    totpAllowed = 'totpAllowed',
    passkeyAllowed = 'passkeyAllowed',
}
