import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';

@DatabaseEntity({
    _id: false,
    timestamps: false,
})
export class UserMobileNumberEntity {
    @DatabaseProp({
        required: true,
        type: String,
        ref: CountryEntity.name,
        trim: true,
    })
    country: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
        maxlength: 20,
        minlength: 8,
    })
    number: string;
}

export const UserMobileNumberSchema = DatabaseSchema(UserMobileNumberEntity);
export type UserMobileNumberDoc = IDatabaseDocument<UserMobileNumberEntity>;
