import {
    DatabaseHookBeforeSave,
    DatabaseEntity,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';

@DatabaseEntity()
export class PermissionEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        type: String,
    })
    code: string;

    @DatabaseProp({
        required: true,
        index: true,
        type: String,
    })
    name: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    description: string;

    @DatabaseProp({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @DatabaseHookBeforeSave()
    hookBeforeSave?() {
        this.code = this.code.toUpperCase().trim();
        this.name = this.name.toLowerCase().trim();
    }
}

export const PermissionDatabaseName = 'permissions';

export const PermissionSchema = DatabaseSchema(PermissionEntity);
export type Permission = IDatabaseSchema<PermissionEntity>;
