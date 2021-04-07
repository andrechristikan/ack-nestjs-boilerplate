import { PermissionEntity, RoleEntity } from './role.schema';
import { Document } from 'mongoose';

export type RoleDocument = RoleEntity & Document;

export type PermissionDocument = PermissionEntity & Document;

export class PermissionDetail {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}
