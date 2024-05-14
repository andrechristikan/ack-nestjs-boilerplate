import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
} from 'src/modules/user/constants/user.enum.constant';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';

export class UserListResponseDto extends OmitType(UserGetResponseDto, [
    'passwordExpired',
    'passwordCreated',
    'signUpDate',
    'signUpFrom',
    'address',
    'gender',
    'role',
] as const) {
    @ApiProperty({
        required: true,
        nullable: false,
        type: RoleListResponseDto,
    })
    @Type(() => RoleListResponseDto)
    readonly role: RoleListResponseDto;

    @ApiHideProperty()
    @Exclude()
    readonly passwordExpired: Date;

    @ApiHideProperty()
    @Exclude()
    readonly passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    readonly signUpDate: Date;

    @ApiHideProperty()
    @Exclude()
    readonly signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    readonly address?: string;

    @ApiHideProperty()
    @Exclude()
    readonly gender?: ENUM_USER_GENDER;
}
