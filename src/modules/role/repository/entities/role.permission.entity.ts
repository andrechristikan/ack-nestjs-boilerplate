import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';

@DatabaseEntity({ timestamps: false, _id: false })
export class RolePermissionEntity {
    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_POLICY_SUBJECT,
    })
    subject: ENUM_POLICY_SUBJECT;

    @DatabaseProp({
        required: true,
        type: [String],
        enum: ENUM_POLICY_ACTION,
        default: [],
    })
    action: ENUM_POLICY_ACTION[];
}

export const RolePermissionSchema = DatabaseSchema(RolePermissionEntity);
