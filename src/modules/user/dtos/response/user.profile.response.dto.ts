import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { UserDto } from '@modules/user/dtos/user.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';

export class UserProfileResponseDto extends UserDto {
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
