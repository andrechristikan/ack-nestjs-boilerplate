import { DatabaseEntityBase } from '@common/database/bases/database.entity';
import { DatabaseProp } from '@common/database/decorators/database.decorator';

export class AppBaseConfigEntityBase<T = any> extends DatabaseEntityBase {
    @DatabaseProp({ required: true, unique: true })
    key: string;

    @DatabaseProp({ type: String })
    description: string;

    @DatabaseProp({ type: Object })
    value: T;
}