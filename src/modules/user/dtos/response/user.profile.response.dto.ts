import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { UserDto } from '@modules/user/dtos/user.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';

export class UserProfileResponseDto extends UserDto {
    @ApiProperty({
        required: true,
        type: RoleDto,
    })
    @Type(() => RoleDto)
    role: RoleDto;

    @ApiProperty({
        required: true,
        type: CountryResponseDto,
    })
    @Type(() => CountryResponseDto)
    country: CountryResponseDto;

    @ApiProperty({
        required: false,
        type: [UserMobileNumberResponseDto],
    })
    @Type(() => UserMobileNumberResponseDto)
    mobileNumbers?: UserMobileNumberResponseDto[];
}
