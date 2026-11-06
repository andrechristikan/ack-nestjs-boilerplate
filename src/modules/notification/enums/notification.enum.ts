/** @public */
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
    resendPublishTermPolicy = 'resendPublishTermPolicy',
    userAcceptTermPolicy = 'userAcceptTermPolicy',
    workspaceInvite = 'workspaceInvite',
    workspaceInviteUnregistered = 'workspaceInviteUnregistered',
    workspaceJoinRequest = 'workspaceJoinRequest',
    workspaceJoinAccepted = 'workspaceJoinAccepted',
    workspaceJoinRejected = 'workspaceJoinRejected',
}

/** @public */
export enum EnumNotificationPushProcess {
    cleanupTokens = 'cleanupTokens',
    cleanupStaleTokens = 'cleanupStaleTokens',
    resetTwoFactorByAdmin = 'resetTwoFactorByAdmin',
    temporaryPasswordByAdmin = 'temporaryPasswordByAdmin',
    forgotPassword = 'forgotPassword',
    resetPassword = 'resetPassword',
    newDeviceLogin = 'newDeviceLogin',
    workspaceInvite = 'workspaceInvite',
    workspaceJoinRequest = 'workspaceJoinRequest',
    workspaceJoinAccepted = 'workspaceJoinAccepted',
    workspaceJoinRejected = 'workspaceJoinRejected',
}

/** @public */
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

/** @public */
export enum EnumNotificationStep {
    createNotification = 'createNotification',
    sendEmail = 'sendEmail',
    sendWelcomeEmail = 'sendWelcomeEmail',
    sendVerificationEmail = 'sendVerificationEmail',
    sendPush = 'sendPush',
    updateProcessAt = 'updateProcessAt',
    sendMulticast = 'sendMulticast',
    cleanupTokens = 'cleanupTokens',
    updateSentAt = 'updateSentAt',
}
