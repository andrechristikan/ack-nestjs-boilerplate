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
    apiKey = 'apiKey',
    role = 'role',
    user = 'user',
    session = 'session',
    activityLog = 'activityLog',
    passwordHistory = 'passwordHistory',
    termPolicy = 'termPolicy',
    featureFlag = 'featureFlag',
}
