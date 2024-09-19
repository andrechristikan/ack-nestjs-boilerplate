import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

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
}

export const UserVerificationSchema = DatabaseSchema(UserVerificationEntity);
export type UserVerificationDoc = IDatabaseDocument<UserVerificationEntity>;