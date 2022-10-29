import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import {
    DatabaseHookBefore,
    DatabaseEntity,
    DatabasePropForeign,
    DatabaseProp,
    DatabasePropPrimary,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseSchema } from 'src/common/database/interfaces/database.interface';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';

@DatabaseEntity({ timestamps: true, versionKey: false })
export class RoleEntity {
    @DatabasePropPrimary()
    _id?: string;

    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true,
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
    })
    isActive: boolean;

    @DatabaseProp({
        required: true,
        enum: ENUM_AUTH_ACCESS_FOR,
        index: true,
    })
    accessFor: ENUM_AUTH_ACCESS_FOR;

    @DatabaseHookBefore()
    hookBefore() {
        this.name = this.name.toLowerCase();
    }
}

export const RoleDatabaseName = 'roles';

export const RoleSchema = DatabaseSchema(RoleEntity);
export type Role = IDatabaseSchema<RoleEntity>;
