import { PermissionEntity } from './permission.schema';
import { Document } from 'mongoose';

export type PermissionDocument = PermissionEntity & Document;

export interface IPermissionCreate {
    name: string;
}
