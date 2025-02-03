import { ApiProperty, getSchemaPath, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserMobileNumberResponseDto } from 'src/modules/user/dtos/response/user.mobile-number.response.dto';

export class UserProfileResponseDto extends OmitType(UserGetResponseDto, [
    'role',
    'country',
    'mobileNumber',
] as const) {
    @ApiProperty({
        required: true,
        type: RoleGetResponseDto,
        oneOf: [{ $ref: getSchemaPath(RoleGetResponseDto) }],
    })
    @Type(() => RoleGetResponseDto)
    role: RoleGetResponseDto;

    @ApiProperty({
        required: true,
        type: CountryShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(CountryShortResponseDto) }],
    })
    @Type(() => CountryShortResponseDto)
    country: CountryShortResponseDto;

    @ApiProperty({
        required: false,
        type: UserMobileNumberResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserMobileNumberResponseDto) }],
    })
    @Type(() => UserMobileNumberResponseDto)
    mobileNumber?: UserMobileNumberResponseDto;
}
