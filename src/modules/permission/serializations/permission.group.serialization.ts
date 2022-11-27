import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';

class PermissionGroupSerialization extends PickType(
    PermissionGetSerialization,
    ['group'] as const
) {
    @ApiProperty({ type: () => PermissionGetSerialization, isArray: true })
    @Type(() => PermissionGetSerialization)
    permissions: PermissionGetSerialization[];
}

export class PermissionGroupsSerialization {
    @ApiProperty({ type: () => PermissionGroupSerialization, isArray: true })
    @Type(() => PermissionGroupSerialization)
    groups: PermissionGroupSerialization[];
}
