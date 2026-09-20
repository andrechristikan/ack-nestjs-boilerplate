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
    verifiedMobileNumber = 'verifiedMobileNumber',
    verificationEmail = 'verificationEmail',
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
 * Kinds of stored notification, each with its own type and channels.
 * @public
 */
export enum EnumNotificationKind {
    welcome = 'welcome',
    welcomeSocial = 'welcomeSocial',
    welcomeByAdmin = 'welcomeByAdmin',
    verificationEmail = 'verificationEmail',
    verifiedEmail = 'verifiedEmail',
    verifiedMobileNumber = 'verifiedMobileNumber',
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
