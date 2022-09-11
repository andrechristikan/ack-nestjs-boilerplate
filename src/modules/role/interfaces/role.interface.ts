import { Types } from 'mongoose';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { PermissionDocument } from 'src/modules/permission/schemas/permission.schema';
import { RoleDocument } from 'src/modules/role/schemas/role.schema';

export interface IRoleDocument extends Omit<RoleDocument, 'permissions'> {
    permissions: PermissionDocument[];
}

export interface IRoleUpdate {
    name: string;
    accessFor: ENUM_AUTH_ACCESS_FOR;
    permissions: Types.ObjectId[];
}
