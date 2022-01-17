import { PermissionDocument } from 'src/permission/permission.schema';
import { RoleDocument } from './role.schema';

export interface IRoleDocument extends Omit<RoleDocument, 'permissions'> {
    permissions: PermissionDocument[];
}
