export enum ENUM_POLICY_ACTION {
    MANAGE = 'manage',
    READ = 'read',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    EXPORT = 'export',
    IMPORT = 'import',
}

export enum ENUM_POLICY_REQUEST_ACTION {
    MANAGE,
    READ,
    CREATE,
    UPDATE,
    DELETE,
    EXPORT,
    IMPORT,
}

export enum ENUM_POLICY_SUBJECT {
    ALL = 'ALL',
    AUTH = 'AUTH',
    API_KEY = 'API_KEY',
    SETTING = 'SETTING',
    COUNTRY = 'COUNTRY',
    ROLE = 'ROLE',
    USER = 'USER',
}

export enum ENUM_POLICY_ROLE_TYPE {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER',
}
