import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';

@DatabaseEntity({
    _id: false,
    timestamps: false,
})
export class UserTermPolicyEntity {
    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    term: boolean;

    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    privacy: boolean;

    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    marketing: boolean;

    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    cookies: boolean;
}

export const UserTermPolicySchema = DatabaseSchema(UserTermPolicyEntity);
