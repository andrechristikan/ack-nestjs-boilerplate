import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class SettingEntity {
    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true,
    })
    name: string;

    @Prop({
        required: false,
    })
    description?: string;

    @Prop({
        required: true,
        trim: true,
        type: MongooseSchema.Types.Mixed,
    })
    value: string | number | boolean;
}

export const SettingDatabaseName = 'settings';
export const SettingSchema = SchemaFactory.createForClass(SettingEntity);

export type SettingDocument = SettingEntity & Document;
