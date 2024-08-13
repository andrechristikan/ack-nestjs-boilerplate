import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';

export class RoleListResponseDto extends OmitType(RoleGetResponseDto, [
    'permissions',
    'description',
] as const) {
    @ApiHideProperty()
    @Exclude()
    description?: string;

    @ApiProperty({
        description: 'count of permissions',
        required: true,
    })
    @Transform(({ value }) => value.length)
    permissions: number;
}
