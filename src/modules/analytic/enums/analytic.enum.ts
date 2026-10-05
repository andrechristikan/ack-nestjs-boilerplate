/**
 * Anomaly signals the analytic cache keys an anomaly summary by.
 * @public
 */
export enum EnumAnalyticAnomalySignal {
    impossibleTravel = 'impossible-travel',
    loginSpikeIp = 'login-spike-ip',
    failedLoginSpike = 'failed-login-spike',
    deviceProliferation = 'device-proliferation',
    loginTime = 'login-time',
}

/**
 * Fraud signals the analytic cache keys a fraud summary by.
 * @public
 */
export enum EnumAnalyticFraudSignal {
    credentialStuffing = 'credential-stuffing',
    accountTakeover = 'account-takeover',
    massRegistration = 'mass-registration',
    passwordResetEnumeration = 'password-reset-enumeration',
    sharedFingerprint = 'shared-fingerprint',
    sessionAfterAdmin = 'session-after-admin',
    forgotPasswordTokenAbuse = 'forgot-password-token-abuse',
    refreshSpike = 'refresh-spike',
    backupCodeNewDevice = 'backup-code-new-device',
    apiKeyBurst = 'api-key-burst',
}

/**
 * Risk bands a fraud score falls into, lowest to highest.
 * @public
 */
export enum EnumAnalyticFraudBand {
    monitor = 'monitor',
    review = 'review',
    elevate = 'elevate',
    critical = 'critical',
}

/**
 * Signals that add to a user's fraud risk score.
 * @public
 */
export enum EnumAnalyticFraudContributingSignal {
    nearLockout = 'nearLockout',
    sharedFingerprint = 'sharedFingerprint',
}

/**
 * Dashboard metrics the analytic cache keys a metric entry by.
 * @public
 */
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
    authLockout = 'auth.lockout',
    authSessionRevoke = 'auth.sessionRevoke',
    authConcurrent = 'auth.concurrent',
    authSessionsGeo = 'auth.sessionsGeo',
    authSessionsUa = 'auth.sessionsUa',
    authRefresh = 'auth.refresh',
    authLogout = 'auth.logout',
    authVerificationFunnel = 'auth.verificationFunnel',
    authPasswordExpiry = 'auth.passwordExpiry',
    authPasswordChange = 'auth.passwordChange',
    authForgotConversion = 'auth.forgotConversion',
    authAdminForcePassword = 'auth.adminForcePassword',
    authTwoFactorAdoption = 'auth.twoFactorAdoption',
    authTwoFactorAdminReset = 'auth.twoFactorAdminReset',
    authTwoFactorVerify = 'auth.twoFactorVerify',
    authBackupCodeRegeneration = 'auth.backupCodeRegeneration',
    authTwoFactorAttempt = 'auth.twoFactorAttempt',
    devicesRegistration = 'devices.registration',
    devicesPlatform = 'devices.platform',
    devicesPushToken = 'devices.pushToken',
    devicesInfoRefresh = 'devices.infoRefresh',
    devicesSessionRatio = 'devices.sessionRatio',
    devicesPerUser = 'devices.perUser',
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
    workspaceSummary = 'workspace.summary',
    projectsCreation = 'projects.creation',
    projectsMembership = 'projects.membership',
}
