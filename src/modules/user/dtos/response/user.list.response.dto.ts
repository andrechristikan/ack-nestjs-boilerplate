import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserDto } from '@modules/user/dtos/user.dto';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@prisma/client';

export class UserListResponseDto extends UserDto {
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
    signUpFrom: EnumUserSignUpFrom;

    @ApiHideProperty()
    @Exclude()
    signUpWith: EnumUserSignUpWith;

    @ApiHideProperty()
    @Exclude()
    salt?: string;

    @ApiHideProperty()
    @Exclude()
    gender?: EnumUserGender;

    @ApiHideProperty()
    @Exclude()
    lastLoginAt?: Date;

    @ApiHideProperty()
    @Exclude()
    lastIPAddress?: string;

    @ApiHideProperty()
    @Exclude()
    lastLoginFrom?: EnumUserLoginFrom;

    @ApiHideProperty()
    @Exclude()
    lastLoginWith?: EnumUserSignUpWith;
}
