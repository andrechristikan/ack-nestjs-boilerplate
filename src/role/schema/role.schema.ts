import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { PermissionEntity } from 'src/permission/schema/permission.schema';

@Schema({ timestamps: true, versionKey: false })
export class RoleEntity {
    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true,
    })
    name: string;

    @Prop({
        required: true,
        type: Array,
        default: [],
        ref: PermissionEntity.name,
    })
    permissions: Types.ObjectId[];

    @Prop({
        required: true,
        default: true,
    })
    isActive: boolean;

    @Prop({
        required: true,
        default: false,
    })
    isAdmin: boolean;
}

export const RoleDatabaseName = 'roles';
export const RoleSchema = SchemaFactory.createForClass(RoleEntity);

export type RoleDocument = RoleEntity & Document;

// Hooks
RoleSchema.pre<RoleDocument>('save', function (next) {
    this.name = this.name.toLowerCase();
    next();
});
