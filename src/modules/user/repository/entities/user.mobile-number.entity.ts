import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';
import { Types } from 'mongoose';

@DatabaseEntity({
    _id: false,
    timestamps: false,
})
export class UserMobileNumberEntity {
    @DatabaseProp({
        required: true,
        type: Types.ObjectId,
        trim: true,
    })
    countryId: Types.ObjectId;

    @DatabaseProp({
        required: false,
        ref: CountryEntity.name,
    })
    country?: CountryEntity;

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
