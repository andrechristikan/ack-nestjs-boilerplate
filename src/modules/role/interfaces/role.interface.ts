import {
    PermissionDoc,
    PermissionEntity,
} from 'src/modules/permission/repository/entities/permission.entity';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';

export interface IRoleEntity extends Omit<RoleEntity, 'permissions'> {
    permissions: PermissionEntity[];
}

export interface IRoleDoc extends Omit<RoleDoc, 'permissions'> {
    permissions: PermissionDoc[];
}
