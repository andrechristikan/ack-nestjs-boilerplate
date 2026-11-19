/** @public */
export enum EnumNotificationQueue {
    notification = 'notification',
    notificationEmail = 'notificationEmail',
    notificationPush = 'notificationPush',
    notificationSms = 'notificationSms',
}

/** @public */
export enum EnumNotificationProcess {
    notify = 'notify',
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
export enum EnumNotificationSmsProcess {
    send = 'send',
}

/** @public */
export enum EnumNotificationKind {
    welcome = 'welcome',
    welcomeSocial = 'welcomeSocial',
    welcomeByAdmin = 'welcomeByAdmin',
    verificationEmail = 'verificationEmail',
    verificationMobileNumber = 'verificationMobileNumber',
    reauthenticationOtp = 'reauthenticationOtp',
    verifiedEmail = 'verifiedEmail',
    verifiedMobileNumber = 'verifiedMobileNumber',
    temporaryPasswordByAdmin = 'temporaryPasswordByAdmin',
    changePassword = 'changePassword',
    forgotPassword = 'forgotPassword',
    resetPassword = 'resetPassword',
    resetMfaByAdmin = 'resetMfaByAdmin',
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
    mfa = 'mfa',
}

/** @public */
export enum EnumNotificationStep {
    sendEmail = 'sendEmail',
    sendPush = 'sendPush',
    sendSms = 'sendSms',
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
}

/** @public */
export enum EnumNotificationOrderBy {
    latest = 'latest',
}
