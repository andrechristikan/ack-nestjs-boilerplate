import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { ENUM_DATABASE_LOCATION_TYPE } from 'src/common/database/enums/database.enum';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

@DatabaseEntity({
    _id: false,
    timestamps: false,
})
export class DatabaseLocationEntity {
    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_DATABASE_LOCATION_TYPE,
        default: ENUM_DATABASE_LOCATION_TYPE.POINT,
    })
    type: ENUM_DATABASE_LOCATION_TYPE;

    @DatabaseProp({
        required: true,
        type: [Number],
    })
    coordinates: number[];
}

export const DatabaseLocationSchema = DatabaseSchema(DatabaseLocationEntity);
export type DatabaseLocationDoc = IDatabaseDocument<DatabaseLocationEntity>;
