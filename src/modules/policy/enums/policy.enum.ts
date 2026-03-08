export enum EnumPolicyAction {
    manage = 'manage',
    read = 'read',
    create = 'create',
    update = 'update',
    delete = 'delete',
}

export enum EnumPolicyEffect {
    can = 'can',
    cannot = 'cannot',
}

export enum EnumPolicyMatch {
    all = 'all',
    any = 'any',
}

export enum EnumPolicySubject {
    all = 'all',
    apiKey = 'ApiKey',
    role = 'Role',
    user = 'User',
    session = 'Session',
    activityLog = 'ActivityLog',
    passwordHistory = 'PasswordHistory',
    termPolicy = 'TermPolicy',
    featureFlag = 'FeatureFlag',
    device = 'Device',
}

export enum EnumPolicyPlaceholder {
    userId = '$userId'
}
