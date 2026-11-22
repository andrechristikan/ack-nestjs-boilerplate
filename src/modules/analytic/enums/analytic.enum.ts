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
    failedLoginSpike = 'failedLoginSpike',
    loginSpikeIp = 'loginSpikeIp',
}

/** @public */
export enum EnumAnalyticFraudSignal {
    credentialStuffing = 'credentialStuffing',
    accountTakeover = 'accountTakeover',
    sessionAfterAdmin = 'sessionAfterAdmin',
    massRegistration = 'massRegistration',
    passwordResetEnumeration = 'passwordResetEnumeration',
    forgotPasswordTokenAbuse = 'forgotPasswordTokenAbuse',
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
    userRegistrations = 'userRegistrations',
    userChurn = 'userChurn',
    userBlocked = 'userBlocked',
    userSignUpWith = 'userSignUpWith',
    userEmailVerification = 'userEmailVerification',
    userStatusDistribution = 'userStatusDistribution',
    userCountryDistribution = 'userCountryDistribution',
    userRoleDistribution = 'userRoleDistribution',
    userActive = 'userActive',
    authLoginFrequency = 'authLoginFrequency',
    authLoginMethod = 'authLoginMethod',
    authLockout = 'authLockout',
    authSessionsGeo = 'authSessionsGeo',
    authSessionsUserAgent = 'authSessionsUserAgent',
    authVerificationFunnel = 'authVerificationFunnel',
    authPasswordChange = 'authPasswordChange',
    authForgotPasswordConversion = 'authForgotPasswordConversion',
    devicePlatform = 'devicePlatform',
    devicePushToken = 'devicePushToken',
    deviceInactivity = 'deviceInactivity',
    apiKeyActiveExpired = 'apiKeyActiveExpired',
    termPolicyAcceptanceRate = 'termPolicyAcceptanceRate',
    workspaceCreation = 'workspaceCreation',
    workspaceInviteFunnel = 'workspaceInviteFunnel',
    workspaceJoinOutcomes = 'workspaceJoinOutcomes',
    workspaceActivityVolume = 'workspaceActivityVolume',
    projectCreation = 'projectCreation',
    notificationDelivery = 'notificationDelivery',
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
