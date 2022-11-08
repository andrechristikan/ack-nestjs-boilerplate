import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { Permission } from 'src/modules/permission/schemas/permission.schema';
import { Role } from 'src/modules/role/schemas/role.schema';

export interface IRole extends Omit<Role, 'permissions'> {
    permissions: Permission[];
}

export interface IRoleUpdate {
    name: string;
    accessFor: ENUM_AUTH_ACCESS_FOR;
    permissions: string[];
}
