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
    massRegistration = 'mass-registration',
    passwordResetEnumeration = 'password-reset-enumeration',
    forgotPasswordTokenAbuse = 'forgot-password-token-abuse',
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
    usersEmailVerification = 'users.emailVerification',
    usersStatus = 'users.status',
    usersCountry = 'users.country',
    usersRole = 'users.role',
    usersActive = 'users.active',
    authLoginFrequency = 'auth.loginFrequency',
    authLoginMethod = 'auth.loginMethod',
    authLockout = 'auth.lockout',
    authSessionsGeo = 'auth.sessionsGeo',
    authSessionsUa = 'auth.sessionsUa',
    authVerificationFunnel = 'auth.verificationFunnel',
    authPasswordChange = 'auth.passwordChange',
    authForgotConversion = 'auth.forgotConversion',
    devicesPlatform = 'devices.platform',
    devicesPushToken = 'devices.pushToken',
    devicesInactivity = 'devices.inactivity',
    apiKeysActiveExpired = 'apiKeys.activeExpired',
    termPoliciesAcceptance = 'termPolicies.acceptance',
    workspacesCreation = 'workspaces.creation',
    workspacesInviteFunnel = 'workspaces.inviteFunnel',
    workspacesJoinOutcomes = 'workspaces.joinOutcomes',
    workspacesActivity = 'workspaces.activity',
    projectsCreation = 'projects.creation',
    notificationsDelivery = 'notifications.delivery',
}

/** @public */
export enum EnumAnalyticGroupKey {
    unknown = 'unknown',
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
