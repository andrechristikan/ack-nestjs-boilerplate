import { RoleEntity } from './role.schema';
import { Document } from 'mongoose';
import { PermissionDocument } from 'src/permission/permission.interface';

export type RoleDocument = RoleEntity & Document;

export interface IRoleDocument extends Omit<RoleDocument, 'permissions'> {
    permissions: PermissionDocument[];
}

export interface IRoleFullDocument extends Omit<RoleEntity, 'permissions'> {
    name: string;
    permissions: string[];
}

export interface IRoleCreate {
    name: string;
    permissions: string[];
}
