import { PermissionEntity } from './permission.schema';
import { Document } from 'mongoose';

export type PermissionDocument = PermissionEntity & Document;

export type IPermissionDocument = PermissionDocument;
export interface IPermissionCreate {
    name: string;
}
