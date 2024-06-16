import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';

export class RoleListResponseDto extends OmitType(RoleGetResponseDto, [
    'permissions',
] as const) {
    @ApiProperty({
        description: 'count of permissions',
        required: true,
    })
    @Transform(({ value }) => value.length)
    readonly permissions: number;
}
