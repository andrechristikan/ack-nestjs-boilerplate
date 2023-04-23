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
    MANAGE = 0,
    READ = 1,
    CREATE = 2,
    UPDATE = 3,
    DELETE = 4,
    EXPORT = 5,
    IMPORT = 6,
}

export enum ENUM_POLICY_SUBJECT {
    API_KEY = 'API_KEY',
    SETTING = 'SETTING',
    ROLE = 'ROLE',
    USER = 'USER',
}
