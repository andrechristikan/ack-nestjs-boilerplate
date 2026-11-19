/** @public */
export enum EnumAnalyticQueue {
    analytic = 'analytic',
}

/** @public */
export enum EnumAnalyticProcess {
    refreshSnapshot = 'refreshSnapshot',
}

/** @public */
export enum EnumAnalyticAnomalySignal {
    failedLoginSpike = 'failed-login-spike',
    loginSpikeIp = 'login-spike-ip',
}

/** @public */
export enum EnumAnalyticFraudSignal {
    credentialStuffing = 'credential-stuffing',
    accountTakeover = 'account-takeover',
    sessionAfterAdmin = 'session-after-admin',
    backupCodeNewDevice = 'backup-code-new-device',
    massRegistration = 'mass-registration',
    passwordResetEnumeration = 'password-reset-enumeration',
    forgotPasswordTokenAbuse = 'forgot-password-token-abuse',
    refreshSpike = 'refresh-spike',
    apiKeyBurst = 'api-key-burst',
}

/** @public */
export enum EnumAnalyticFraudBand {
    monitor = 'monitor',
    review = 'review',
    elevate = 'elevate',
    critical = 'critical',
}

/** @public */
export enum EnumAnalyticFraudContributingSignal {
    sessionAfterAdmin = 'sessionAfterAdmin',
    impossibleTravel = 'impossibleTravel',
    newDeviceAfterPasswordChange = 'newDeviceAfterPasswordChange',
    credentialStuffingIp = 'credentialStuffingIp',
    sharedFingerprint = 'sharedFingerprint',
    nearLockout = 'nearLockout',
    massRegistrationIp = 'massRegistrationIp',
    forgotPasswordAbuse = 'forgotPasswordAbuse',
}

/** @public */
export enum EnumAnalyticDashboardMetric {
    usersRegistrations = 'users.registrations',
    usersChurn = 'users.churn',
    usersBlocked = 'users.blocked',
    usersSignUpWith = 'users.signUpWith',
    usersSignUpFrom = 'users.signUpFrom',
    usersEmailVerification = 'users.emailVerification',
    usersMobileVerification = 'users.mobileVerification',
    usersStatus = 'users.status',
    usersCountry = 'users.country',
    usersRole = 'users.role',
    usersSelfDelete = 'users.selfDelete',
    usersClaimUsername = 'users.claimUsername',
    usersMobileChurn = 'users.mobileChurn',
    authLoginFrequency = 'auth.loginFrequency',
    authLoginMethod = 'auth.loginMethod',
    authLoginSource = 'auth.loginSource',
    authLockout = 'auth.lockout',
    authSessionRevoke = 'auth.sessionRevoke',
    authSessionsGeo = 'auth.sessionsGeo',
    authSessionsUa = 'auth.sessionsUa',
    authRefresh = 'auth.refresh',
    authLogout = 'auth.logout',
    authVerificationFunnel = 'auth.verificationFunnel',
    authPasswordChange = 'auth.passwordChange',
    authForgotConversion = 'auth.forgotConversion',
    authAdminForcePassword = 'auth.adminForcePassword',
    authMfaAdoption = 'auth.mfaAdoption',
    authMfaAdminReset = 'auth.mfaAdminReset',
    authMfaVerify = 'auth.mfaVerify',
    authBackupCodeRegeneration = 'auth.backupCodeRegeneration',
    authMfaAttempt = 'auth.mfaAttempt',
    devicesRegistration = 'devices.registration',
    devicesPlatform = 'devices.platform',
    devicesPushToken = 'devices.pushToken',
    devicesInfoRefresh = 'devices.infoRefresh',
    devicesSessionRatio = 'devices.sessionRatio',
    devicesInactivity = 'devices.inactivity',
    apiKeysLifecycle = 'apiKeys.lifecycle',
    apiKeysActiveExpired = 'apiKeys.activeExpired',
    apiKeysTypeMix = 'apiKeys.typeMix',
    termPoliciesAcceptance = 'termPolicies.acceptance',
    termPoliciesTimeToAccept = 'termPolicies.timeToAccept',
    workspacesCreation = 'workspaces.creation',
    workspacesVisibility = 'workspaces.visibility',
    workspacesInviteFunnel = 'workspaces.inviteFunnel',
    workspacesJoinOutcomes = 'workspaces.joinOutcomes',
    workspacesMembership = 'workspaces.membership',
    workspacesActivity = 'workspaces.activity',
    projectsCreation = 'projects.creation',
    projectsMembership = 'projects.membership',
}

/** @public */
export enum EnumAnalyticGroupKey {
    unknown = 'unknown',
    public = 'public',
    private = 'private',
}

/** @public */
export enum EnumAnalyticNearLockoutOrderBy {
    latest = 'latest',
    id = 'id',
}

/** @public */
export enum EnumAnalyticLoginSpikeIpOrderBy {
    mostUsers = 'mostUsers',
    mostAttempts = 'mostAttempts',
    ipAddress = 'ipAddress',
}

/** @public */
export enum EnumAnalyticCredentialStuffingOrderBy {
    mostUsers = 'mostUsers',
    mostFailures = 'mostFailures',
    ipAddress = 'ipAddress',
}

/** @public */
export enum EnumAnalyticAccountTakeoverOrderBy {
    latest = 'latest',
    userId = 'userId',
}

/** @public */
export enum EnumAnalyticSessionAfterAdminOrderBy {
    latest = 'latest',
    recentLogin = 'recentLogin',
    userId = 'userId',
}

/** @public */
export enum EnumAnalyticBackupCodeNewDeviceOrderBy {
    latest = 'latest',
    userId = 'userId',
}

/** @public */
export enum EnumAnalyticKeyCountOrderBy {
    mostCount = 'mostCount',
    key = 'key',
}

/** @public */
export enum EnumAnalyticForgotPasswordAbuseOrderBy {
    mostTokens = 'mostTokens',
    userId = 'userId',
}

/** @public */
export enum EnumAnalyticUserCountOrderBy {
    mostCount = 'mostCount',
    userId = 'userId',
}

/** @public */
export enum EnumAnalyticCountOrderBy {
    mostCount = 'mostCount',
}

/** @public */
export enum EnumAnalyticSnapshotOrderBy {
    highestValue = 'highestValue',
    key = 'key',
}

/** @public */
export enum EnumAnalyticImpossibleTravelOrderBy {
    highestValue = 'highestValue',
    recent = 'recent',
    key = 'key',
}
