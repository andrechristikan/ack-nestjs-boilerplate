import {registerEnumType} from "@nestjs/graphql";

export enum ENUM_ROLE_TYPE {
    SUPER_ADMIN = 'SUPER_ADMIN',
    USER = 'USER',
    ADMIN = 'ADMIN',
}

registerEnumType(ENUM_ROLE_TYPE, { name: 'ENUM_ROLE_TYPE' });

