import { RoleEntity } from './role.schema';
import { Document } from 'mongoose';
import { PermissionDocument } from 'src/permission/permission.interface';

export type RoleDocument = RoleEntity & Document;

export interface RoleDocumentFull extends Omit<RoleDocument, 'permissions'> {
    permissions: PermissionDocument[];
}
