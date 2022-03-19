import { PermissionDocument } from 'src/permission/schema/permission.schema';
import { RoleDocument } from './schema/role.schema';

export interface IRoleDocument extends Omit<RoleDocument, 'permissions'> {
    permissions: PermissionDocument[];
}
