import { PermissionDocument } from 'src/modules/permission/schemas/permission.schema';
import { RoleDocument } from 'src/modules/role/schemas/role.schema';

export interface IRoleDocument extends Omit<RoleDocument, 'permissions'> {
    permissions: PermissionDocument[];
}
