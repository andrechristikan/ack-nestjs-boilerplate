import { PermissionEntity } from './permission.schema';
import { Document } from 'mongoose';

export type PermissionDocument = PermissionEntity & Document;

export interface IPermission {
    code: string;
    name: string;
    description?: string;
    isActive?: boolean;
}
