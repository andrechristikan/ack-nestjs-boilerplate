import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';

export class RoleShortResponseDto extends OmitType(RoleListResponseDto, [
    'permissions',
    'isActive',
    'createdAt',
    'updatedAt',
] as const) {
    @ApiHideProperty()
    @Exclude()
    permissions: number;

    @ApiHideProperty()
    @Exclude()
    isActive: boolean;

    @ApiHideProperty()
    @Exclude()
    createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    updatedAt: Date;
}
