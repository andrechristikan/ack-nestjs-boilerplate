import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { ENUM_DATABASE_LOCATION_TYPE } from '@common/database/enums/database.enum';

/**
 * Database entity for storing geographical location data.
 *
 * Represents location information using GeoJSON format for MongoDB geospatial queries.
 * This entity is designed to be embedded within other documents to provide location context.
 *
 * @class DatabaseLocationEntity
 */
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

/**
 * Mongoose schema for the DatabaseLocationEntity.
 * Used for embedding location data in other schemas.
 */
export const DatabaseLocationSchema = DatabaseSchema(DatabaseLocationEntity);
