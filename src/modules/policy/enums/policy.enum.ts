export enum ENUM_POLICY_ACTION {
    MANAGE = 'manage',
    READ = 'read',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
}

export enum ENUM_POLICY_SUBJECT {
    ALL = 'all',
    AUTH = 'auth',
    SETTING = 'setting',
    API_KEY = 'apiKey',
    COUNTRY = 'country',
    ROLE = 'role',
    USER = 'user',
    SESSION = 'session',
    ACTIVITY_LOG = 'activityLog',
    PASSWORD_HISTORY = 'passwordHistory',
    TERM_POLICY = 'termPolicy',
    FEATURE_FLAG = 'featureFlag',
}
