import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserDto } from '@modules/user/dtos/user.dto';
import {
    ENUM_USER_GENDER,
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
} from '@prisma/client';

export class UserListResponseDto extends OmitType(UserDto, [
    'password',
    'passwordExpired',
    'passwordCreated',
    'passwordAttempt',
    'signUpDate',
    'signUpFrom',
    'signUpWith',
    'salt',
    'gender',
    'lastLoginAt',
    'lastIPAddress',
    'lastLoginFrom',
    'lastLoginWith',
] as const) {
    @ApiHideProperty()
    @Exclude()
    password?: string;

    @ApiHideProperty()
    @Exclude()
    passwordExpired?: Date;

    @ApiHideProperty()
    @Exclude()
    passwordCreated?: Date;

    @ApiHideProperty()
    @Exclude()
    passwordAttempt?: number;

    @ApiHideProperty()
    @Exclude()
    signUpDate: Date;

    @ApiHideProperty()
    @Exclude()
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    signUpWith: ENUM_USER_SIGN_UP_WITH;

    @ApiHideProperty()
    @Exclude()
    salt?: string;

    @ApiHideProperty()
    @Exclude()
    gender?: ENUM_USER_GENDER;

    @ApiHideProperty()
    @Exclude()
    lastLoginAt?: Date;

    @ApiHideProperty()
    @Exclude()
    lastIPAddress?: string;

    @ApiHideProperty()
    @Exclude()
    lastLoginFrom?: ENUM_USER_LOGIN_FROM;

    @ApiHideProperty()
    @Exclude()
    lastLoginWith?: ENUM_USER_SIGN_UP_WITH;
}
