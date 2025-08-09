export enum ENUM_POLICY_ACTION {
    MANAGE = 'manage',
    READ = 'read',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
}

export enum ENUM_POLICY_SUBJECT {
    AUTH = 'AUTH',
    SETTINGS = 'SETTINGS',
    API_KEY = 'API_KEY',
    COUNTRY = 'COUNTRY',
    ROLE = 'ROLE',
    USER = 'USER',
    SESSION = 'SESSION',
    ACTIVITY = 'ACTIVITY',
}

export enum ENUM_POLICY_ROLE_TYPE {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER',
}
