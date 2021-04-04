import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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

    @Prop({
        required: true,
        index: true
    })
    isActive: boolean;
}

export const AbilityDatabaseName = 'abilities';
export const AbilitySchema = SchemaFactory.createForClass(AbilityEntity);
