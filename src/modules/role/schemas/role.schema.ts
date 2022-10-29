import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import {
    DatabaseHookBeforeSave,
    DatabaseEntity,
    DatabasePropForeign,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';

@DatabaseEntity()
export class RoleEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        type: String,
    })
    name: string;

    @DatabasePropForeign({
        required: true,
        default: [],
        type: Array<string>,
        ref: PermissionEntity.name,
    })
    permissions: string[];

    @DatabaseProp({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @DatabaseProp({
        required: true,
        enum: ENUM_AUTH_ACCESS_FOR,
        index: true,
        type: String,
    })
    accessFor: ENUM_AUTH_ACCESS_FOR;

    @DatabaseHookBeforeSave()
    hookBeforeSave?() {
        this.name = this.name.toLowerCase().trim();
    }
}

export const RoleDatabaseName = 'roles';

export const RoleSchema = DatabaseSchema(RoleEntity);
export type Role = IDatabaseSchema<RoleEntity>;
