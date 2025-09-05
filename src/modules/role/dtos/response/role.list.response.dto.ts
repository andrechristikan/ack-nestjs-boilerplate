import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { ApiHideProperty, ApiProperty, OmitType } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';

export class RoleListResponseDto extends OmitType(RoleResponseDto, [
    'abilities',
    'description',
] as const) {
    @ApiHideProperty()
    @Exclude()
    description?: string;

    @ApiProperty({
        description: 'count of abilities',
        required: true,
    })
    @Transform(({ value }) => value.length)
    abilities: number;
}
