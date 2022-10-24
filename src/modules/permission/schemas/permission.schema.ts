import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
    DatabaseHookBefore,
    DatabaseEntity,
    DatabasePrimaryKey,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    DatabasePrimaryKeyType,
    DatabaseSchemaType,
} from 'src/common/database/interfaces/database.interface';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class PermissionEntity {
    @DatabasePropPrimary()
    _id?: DatabasePrimaryKeyType;

    @DatabaseProp({
        required: true,
        index: true,
        uppercase: true,
        unique: true,
        trim: true,
    })
    code: string;

    @DatabaseProp({
        required: true,
        lowercase: true,
        index: true,
    })
    name: string;

    @DatabaseProp({
        required: true,
    })
    description: string;

    @DatabaseProp({
        required: true,
        default: true,
        index: true,
    })
    isActive: boolean;

    @DatabaseHookBefore()
    beforeHook() {
        this.code = this.code.toUpperCase();
        this.name = this.name.toLowerCase();
    }
}

export const PermissionDatabaseName = 'permissions';

export const Permission = DatabaseSchema(PermissionEntity);
export type Permission = DatabaseSchemaType<PermissionEntity>;
