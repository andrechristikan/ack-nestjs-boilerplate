import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';

export class RoleListResponseDto extends OmitType(RoleResponseDto, [
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
