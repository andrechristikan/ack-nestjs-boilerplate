import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbilityDetail } from './ability.interface';

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
        type: {
            read: Boolean,
            create: Boolean,
            update: Boolean,
            delete: Boolean
        },
        required: true
    })
    details: AbilityDetail;

    @Prop({
        required: true,
        index: true
    })
    isActive: boolean;
}

export const AbilityDatabaseName = 'abilities';
export const AbilitySchema = SchemaFactory.createForClass(AbilityEntity);
