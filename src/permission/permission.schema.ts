import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class PermissionEntity {
    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true,
    })
    code: string;

    @Prop({
        required: true,
    })
    name: string;

    @Prop({
        required: false,
    })
    description?: string;

    @Prop({
        required: true,
        default: true,
    })
    isActive: boolean;
}

export const PermissionDatabaseName = 'permissions';
export const PermissionSchema = SchemaFactory.createForClass(PermissionEntity);

export type PermissionDocument = PermissionEntity & Document;

// Hooks
PermissionSchema.pre<PermissionDocument>('save', function (next) {
    this.code = this.code.toUpperCase();
    this.name = this.code.toLowerCase();
    next();
});
