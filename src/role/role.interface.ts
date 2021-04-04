import { RoleEntity } from './role.schema';
import { Document } from 'mongoose';
import { IAbilityDocument } from 'src/ability/ability.interface';

export type IRoleDocument = RoleEntity & Document;

export interface IRole extends Omit<IRoleDocument, 'abilities'> {
    abilities: IAbilityDocument[];
}
