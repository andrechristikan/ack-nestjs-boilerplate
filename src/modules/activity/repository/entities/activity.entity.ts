import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export const ActivityTableName = 'Activities';

@DatabaseEntity({ collection: ActivityTableName })
export class ActivityEntity extends DatabaseEntityBase {
    @DatabaseProp({
        required: true,
        index: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    user: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    description: string;

    @DatabaseProp({
        required: true,
        trim: true,
        type: String,
        ref: UserEntity.name,
    })
    by: string;
}

export const ActivitySchema = DatabaseSchema(ActivityEntity);
export type ActivityDoc = IDatabaseDocument<ActivityEntity>;
