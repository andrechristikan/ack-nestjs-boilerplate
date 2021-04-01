import { AbilityEntity } from './ability.schema';
import { Document } from 'mongoose';

export interface IAbilities {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}

export type IAbility = AbilityEntity & Document;
