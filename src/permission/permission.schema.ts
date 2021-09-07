import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, versionKey: false })
export class PermissionEntity {
    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true
    })
    name: string;

    @Prop({
        required: true
    })
    isActive: boolean;
}

export const PermissionDatabaseName = 'permissions';
export const PermissionSchema = SchemaFactory.createForClass(PermissionEntity);
