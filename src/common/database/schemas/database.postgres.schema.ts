import {
    DATABASE_CREATED_AT_FIELD_NAME,
    DATABASE_DELETED_AT_FIELD_NAME,
    DATABASE_UPDATED_AT_FIELD_NAME,
} from 'src/common/database/constants/database.constant';
import {
    CreateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export class DatabasePostgresEntity {
    @PrimaryGeneratedColumn('uuid', {
        name: '_id',
    })
    _id: string;

    @CreateDateColumn({
        name: DATABASE_CREATED_AT_FIELD_NAME,
        type: Date,
    })
    [DATABASE_CREATED_AT_FIELD_NAME]: Date;

    @UpdateDateColumn({
        name: DATABASE_UPDATED_AT_FIELD_NAME,
        type: Date,
    })
    [DATABASE_UPDATED_AT_FIELD_NAME]: Date;

    @DeleteDateColumn({
        nullable: true,
        name: DATABASE_DELETED_AT_FIELD_NAME,
        type: Date,
    })
    [DATABASE_DELETED_AT_FIELD_NAME]?: Date;
}
