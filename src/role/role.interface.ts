import { RoleEntity } from './role.schema';
import { Document } from 'mongoose';

export type IRole = RoleEntity & Document;
