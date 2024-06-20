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
    readonly permissions: number;

    @ApiHideProperty()
    @Exclude()
    readonly isActive: boolean;

    @ApiHideProperty()
    @Exclude()
    readonly createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    readonly updatedAt: Date;
}
