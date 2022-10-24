import { OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabasePrimaryKeyType } from 'src/common/database/interfaces/database.interface';
import { RoleGetSerialization } from './role.get.serialization';

export class RoleListSerialization extends OmitType(RoleGetSerialization, [
    'permissions',
] as const) {
    @Exclude()
    readonly permissions: DatabasePrimaryKeyType;
}
