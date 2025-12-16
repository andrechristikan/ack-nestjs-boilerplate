export enum EnumPolicyAction {
    manage = 'manage',
    read = 'read',
    create = 'create',
    update = 'update',
    delete = 'delete',
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
