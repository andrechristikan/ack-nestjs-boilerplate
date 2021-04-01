import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IAbilities } from './ability.interface';

@Schema()
export class AbilityEntity {
    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true
    })
    name: string;

    @Prop(
        raw({
            read: Boolean,
            create: Boolean,
            update: Boolean,
            delete: Boolean
        })
    )
    abilities: IAbilities;
}

export const AbilityDatabaseName = 'abilities';
export const AbilitySchema = SchemaFactory.createForClass(AbilityEntity);
