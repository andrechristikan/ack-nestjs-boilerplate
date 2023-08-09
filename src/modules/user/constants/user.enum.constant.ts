import {registerEnumType} from "@nestjs/graphql";

export enum ENUM_USER_SIGN_UP_FROM {
    LOCAL = 'LOCAL',
    GOOGLE = 'GOOGLE',
}

registerEnumType(ENUM_USER_SIGN_UP_FROM, { name: 'ENUM_USER_SIGN_UP_FROM' });

