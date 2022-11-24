import {
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_DELETED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';

export interface IDatabaseBaseEntity<T = any> {
    _id: T;
    [DATABASE_DELETED_AT_FIELD_NAME]?: Date;
    [DATABASE_CREATED_AT_FIELD_NAME]?: Date;
    [DATABASE_UPDATED_AT_FIELD_NAME]?: Date;
}
