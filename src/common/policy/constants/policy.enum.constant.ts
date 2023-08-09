import {registerEnumType} from "@nestjs/graphql";

export enum ENUM_POLICY_ACTION {
    MANAGE = 'manage',
    READ = 'read',
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    EXPORT = 'export',
    IMPORT = 'import',
}

registerEnumType(ENUM_POLICY_ACTION, { name: 'ENUM_POLICY_ACTION' });


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
    API_KEY = 'API_KEY',
    SETTING = 'SETTING',
    ROLE = 'ROLE',
    USER = 'USER',
}

registerEnumType(ENUM_POLICY_SUBJECT, { name: 'ENUM_POLICY_SUBJECT' });
