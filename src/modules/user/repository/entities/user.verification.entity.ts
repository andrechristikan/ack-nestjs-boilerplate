import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';

@DatabaseEntity({
    _id: false,
    timestamps: false,
})
export class UserVerificationEntity {
    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    email: boolean;

    @DatabaseProp({
        required: false,
    })
    emailVerifiedDate?: Date;

    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    mobileNumber: boolean;

    @DatabaseProp({
        required: false,
    })
    mobileNumberVerifiedDate?: Date;
}

export const UserVerificationSchema = DatabaseSchema(UserVerificationEntity);
