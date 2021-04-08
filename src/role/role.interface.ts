import { PermissionEntity, RoleEntity } from './role.schema';
import { Document } from 'mongoose';

export type RoleDocument = RoleEntity & Document;

export type PermissionDocument = PermissionEntity & Document;

export interface RoleSafe {
    name: string;
    permissions: string[];
}
