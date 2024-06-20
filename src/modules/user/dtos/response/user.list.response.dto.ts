import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
} from 'src/modules/user/constants/user.enum.constant';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';

export class UserListResponseDto extends OmitType(UserGetResponseDto, [
    'passwordExpired',
    'passwordCreated',
    'signUpDate',
    'signUpFrom',
    'gender',
    'role',
    'country',
    'mobileNumber',
] as const) {
    @ApiProperty({
        required: true,
        nullable: false,
        type: RoleListResponseDto,
    })
    @Type(() => RoleListResponseDto)
    readonly role: RoleListResponseDto;

    @ApiProperty({
        required: true,
        nullable: false,
        type: CountryShortResponseDto,
    })
    @Type(() => CountryShortResponseDto)
    readonly country: CountryShortResponseDto;

    @ApiHideProperty()
    @Exclude()
    readonly mobileNumber?: UserUpdateMobileNumberRequestDto;

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
    readonly gender?: ENUM_USER_GENDER;
}
