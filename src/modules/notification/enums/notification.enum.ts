/**
 * Job names on the notification and notification email queues.
 * @public
 */
export enum EnumNotificationProcess {
    welcomeByAdmin = 'welcomeByAdmin',
    welcome = 'welcome',
    welcomeSocial = 'welcomeSocial',
    temporaryPasswordByAdmin = 'temporaryPasswordByAdmin',
    changePassword = 'changePassword',
    verifiedEmail = 'verifiedEmail',
    verificationEmail = 'verificationEmail',
    verificationMobileNumber = 'verificationMobileNumber',
    forgotPassword = 'forgotPassword',
    resetPassword = 'resetPassword',
    newDeviceLogin = 'newDeviceLogin',
    resetTwoFactorByAdmin = 'resetTwoFactorByAdmin',
    publishTermPolicy = 'publishTermPolicy',
    userAcceptTermPolicy = 'userAcceptTermPolicy',
    workspaceInvite = 'workspaceInvite',
    workspaceInviteUnregistered = 'workspaceInviteUnregistered',
    workspaceJoinRequest = 'workspaceJoinRequest',
    workspaceJoinAccepted = 'workspaceJoinAccepted',
    workspaceJoinRejected = 'workspaceJoinRejected',
}

/**
 * Job names on the notification push queue.
 * @public
 */
export enum EnumNotificationPushProcess {
    cleanupTokens = 'cleanupTokens',
    cleanupStaleTokens = 'cleanupStaleTokens',
    resetTwoFactorByAdmin = 'resetTwoFactorByAdmin',
    temporaryPasswordByAdmin = 'temporaryPasswordByAdmin',
    resetPassword = 'resetPassword',
    newDeviceLogin = 'newDeviceLogin',
    workspaceInvite = 'workspaceInvite',
    workspaceJoinRequest = 'workspaceJoinRequest',
    workspaceJoinAccepted = 'workspaceJoinAccepted',
    workspaceJoinRejected = 'workspaceJoinRejected',
}

/**
 * Job names on the notification sms queue, one per kind sent by sms: security alerts and mobile number verification.
 * @public
 */
export enum EnumNotificationSmsProcess {
    resetTwoFactorByAdmin = 'resetTwoFactorByAdmin',
    newDeviceLogin = 'newDeviceLogin',
    verificationMobileNumber = 'verificationMobileNumber',
}

/**
 * Kinds of stored notification, each with its own type and channels.
 * @public
 */
export enum EnumNotificationKind {
    welcome = 'welcome',
    welcomeSocial = 'welcomeSocial',
    welcomeByAdmin = 'welcomeByAdmin',
    verificationEmail = 'verificationEmail',
    verificationMobileNumber = 'verificationMobileNumber',
    verifiedEmail = 'verifiedEmail',
    temporaryPasswordByAdmin = 'temporaryPasswordByAdmin',
    changePassword = 'changePassword',
    forgotPassword = 'forgotPassword',
    resetPassword = 'resetPassword',
    resetTwoFactorByAdmin = 'resetTwoFactorByAdmin',
    newDeviceLogin = 'newDeviceLogin',
    publishTermPolicy = 'publishTermPolicy',
    userAcceptTermPolicy = 'userAcceptTermPolicy',
    workspaceInvite = 'workspaceInvite',
    workspaceJoinRequest = 'workspaceJoinRequest',
    workspaceJoinAccepted = 'workspaceJoinAccepted',
    workspaceJoinRejected = 'workspaceJoinRejected',
}
