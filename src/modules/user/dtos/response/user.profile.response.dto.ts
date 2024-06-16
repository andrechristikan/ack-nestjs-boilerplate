import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';

export class UserProfileResponseDto extends OmitType(UserGetResponseDto, [
    'role',
    'country',
] as const) {
    @ApiProperty({
        required: true,
        nullable: false,
        type: RoleGetResponseDto,
    })
    @Type(() => RoleGetResponseDto)
    readonly role: RoleGetResponseDto;

    @ApiProperty({
        required: true,
        nullable: false,
        type: CountryGetResponseDto,
    })
    @Type(() => CountryGetResponseDto)
    readonly country: CountryGetResponseDto;
}
