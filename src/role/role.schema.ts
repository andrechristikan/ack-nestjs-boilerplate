import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PermissionDetail } from './role.interface';

@Schema()
export class PermissionEntity {
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
    details: PermissionDetail;

    @Prop({
        required: true,
        index: true
    })
    isActive: boolean;
}

export const PermissionDatabaseName = 'permissions';
export const PermissionSchema = SchemaFactory.createForClass(PermissionEntity);

@Schema()
export class RoleEntity {
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
        type: [Types.ObjectId],
        default: [],
        ref: PermissionDatabaseName
    })
    permissions: PermissionEntity[];

    @Prop({
        required: true,
        index: true
    })
    isActive: boolean;
}

export const RoleDatabaseName = 'roles';
export const RoleSchema = SchemaFactory.createForClass(RoleEntity);
