import {
    DatabaseHookBefore,
    DatabaseEntity,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class PermissionEntity {
    @DatabasePropPrimary()
    _id?: string;

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
    hookBefore() {
        this.code = this.code.toUpperCase();
        this.name = this.name.toLowerCase();
    }
}

export const PermissionDatabaseName = 'permissions';

export const PermissionSchema = DatabaseSchema(PermissionEntity);
export type Permission = IDatabaseSchema<PermissionEntity>;
