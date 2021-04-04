import { AbilityEntity } from './ability.schema';
import { Document } from 'mongoose';

export type IAbilityDocument = AbilityEntity & Document;
