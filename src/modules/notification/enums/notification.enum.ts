/** @public */
export enum EnumNotificationQueue {
    notification = 'notification',
    notificationEmail = 'notificationEmail',
    notificationPush = 'notificationPush',
}

/** @public */
export enum EnumNotificationProcess {
    notify = 'notify',
    publishTermPolicy = 'publishTermPolicy',
    resendPublishTermPolicy = 'resendPublishTermPolicy',
}

/** @public */
export enum EnumNotificationEmailProcess {
    send = 'send',
    sendUnregistered = 'sendUnregistered',
    publishTermPolicy = 'publishTermPolicy',
}

/** @public */
export enum EnumNotificationPushProcess {
    send = 'send',
    cleanupTokens = 'cleanupTokens',
    cleanupStaleTokens = 'cleanupStaleTokens',
}

/** @public */
export enum EnumNotificationKind {
    welcome = 'welcome',
    welcomeSocial = 'welcomeSocial',
    welcomeByAdmin = 'welcomeByAdmin',
    verificationEmail = 'verificationEmail',
    reauthenticationOtp = 'reauthenticationOtp',
    verifiedEmail = 'verifiedEmail',
    verifiedMobileNumber = 'verifiedMobileNumber',
    temporaryPasswordByAdmin = 'temporaryPasswordByAdmin',
    changePassword = 'changePassword',
    forgotPassword = 'forgotPassword',
    resetPassword = 'resetPassword',
    resetTwoFactorByAdmin = 'resetTwoFactorByAdmin',
    loginLocked = 'loginLocked',
    newDeviceLogin = 'newDeviceLogin',
    publishTermPolicy = 'publishTermPolicy',
    userAcceptTermPolicy = 'userAcceptTermPolicy',
    userImportResult = 'userImportResult',
    workspaceInvite = 'workspaceInvite',
    workspaceJoinRequest = 'workspaceJoinRequest',
    workspaceJoinAccepted = 'workspaceJoinAccepted',
    workspaceJoinRejected = 'workspaceJoinRejected',
}

/** @public */
export enum EnumNotificationLoginLockedMethod {
    password = 'password',
    twoFactor = 'twoFactor',
}

/** @public */
export enum EnumNotificationStep {
    sendEmail = 'sendEmail',
    sendPush = 'sendPush',
    updateProcessAt = 'updateProcessAt',
    sendMulticast = 'sendMulticast',
    updateSentAt = 'updateSentAt',
}

/** @public */
export enum EnumNotificationKeyPattern {
    userPattern = 'userPattern',
    referencePattern = 'referencePattern',
    joinRequestPattern = 'joinRequestPattern',
    userTermPolicyPattern = 'userTermPolicyPattern',
    termPolicyPublishPattern = 'termPolicyPublishPattern',
}
