import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { PermissionGetSerialization } from 'src/modules/permission/serializations/permission.get.serialization';

class PermissionGroupPermissionSerialization extends OmitType(
    PermissionGetSerialization,
    ['group', 'createdAt', 'updatedAt'] as const
) {
    @Exclude()
    group: Date;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

class PermissionGroupSerialization extends PickType(
    PermissionGetSerialization,
    ['group'] as const
) {
    @ApiProperty({
        type: () => PermissionGroupPermissionSerialization,
        isArray: true,
    })
    @Type(() => PermissionGroupPermissionSerialization)
    permissions: PermissionGroupPermissionSerialization[];
}

export class PermissionGroupsSerialization {
    @ApiProperty({ type: () => PermissionGroupSerialization, isArray: true })
    @Type(() => PermissionGroupSerialization)
    groups: PermissionGroupSerialization[];
}
