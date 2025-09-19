import { ApiProperty, OmitType, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserGetResponseDto } from '@modules/user/dtos/response/user.get.response.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/response/user.mobile-number.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';

export class UserProfileResponseDto extends OmitType(UserGetResponseDto, [
    'role',
    'country',
    'mobileNumber',
] as const) {
    @ApiProperty({
        required: true,
        type: RoleDto,
        oneOf: [{ $ref: getSchemaPath(RoleDto) }],
    })
    @Type(() => RoleDto)
    role: RoleDto;

    @ApiProperty({
        required: true,
        type: CountryResponseDto,
        oneOf: [{ $ref: getSchemaPath(CountryResponseDto) }],
    })
    @Type(() => CountryResponseDto)
    country: CountryResponseDto;

    @ApiProperty({
        required: false,
        type: UserMobileNumberResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserMobileNumberResponseDto) }],
    })
    @Type(() => UserMobileNumberResponseDto)
    mobileNumber?: UserMobileNumberResponseDto;
}
