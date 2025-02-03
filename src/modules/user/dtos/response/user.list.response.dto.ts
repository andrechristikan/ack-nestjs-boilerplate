import {
    ApiHideProperty,
    ApiProperty,
    getSchemaPath,
    OmitType,
} from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
} from 'src/modules/user/enums/user.enum';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserVerificationResponseDto } from 'src/modules/user/dtos/response/user.verification.response.dto';

export class UserListResponseDto extends OmitType(UserGetResponseDto, [
    'passwordExpired',
    'passwordCreated',
    'signUpDate',
    'signUpFrom',
    'gender',
    'role',
    'country',
    'mobileNumber',
    'verification',
] as const) {
    @ApiProperty({
        required: true,
        type: RoleListResponseDto,
        oneOf: [{ $ref: getSchemaPath(RoleListResponseDto) }],
    })
    @Type(() => RoleListResponseDto)
    role: RoleListResponseDto;

    @ApiProperty({
        required: true,
        type: CountryShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(CountryShortResponseDto) }],
    })
    @Type(() => CountryShortResponseDto)
    country: CountryShortResponseDto;

    @ApiHideProperty()
    @Exclude()
    mobileNumber?: UserUpdateMobileNumberRequestDto;

    @ApiHideProperty()
    @Exclude()
    passwordExpired: Date;

    @ApiHideProperty()
    @Exclude()
    passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    signUpDate: Date;

    @ApiHideProperty()
    @Exclude()
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    gender?: ENUM_USER_GENDER;

    @ApiHideProperty()
    @Exclude()
    verification: UserVerificationResponseDto;
}
