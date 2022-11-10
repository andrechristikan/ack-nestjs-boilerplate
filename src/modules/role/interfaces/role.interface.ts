import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

export interface IRoleEntity extends Omit<RoleEntity, 'permissions'> {
    permissions: PermissionEntity[];
}
