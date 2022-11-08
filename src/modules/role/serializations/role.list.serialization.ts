import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Permission } from 'src/modules/permission/schemas/permission.schema';
import { RoleGetSerialization } from './role.get.serialization';

export class RoleListSerialization extends OmitType(RoleGetSerialization, [
    'permissions',
] as const) {
    @Exclude()
    readonly permissions: Permission[];
}
