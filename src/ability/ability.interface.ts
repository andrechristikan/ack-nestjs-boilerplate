import { AbilityEntity } from './ability.schema';
import { Document } from 'mongoose';

export type AbilityDocument = AbilityEntity & Document;

export class AbilityDetail {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}
