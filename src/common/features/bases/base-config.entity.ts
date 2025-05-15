import { DatabaseEntityBase } from '@common/database/bases/database.entity';
import { DatabaseProp } from '@common/database/decorators/database.decorator';

/**
 @DatabaseEntity({
  collection: AppSettingTableName,
  })
 */
export class AppBaseConfigEntityBase<T = any> extends DatabaseEntityBase {
    @DatabaseProp({ required: true, unique: true })
    key: string;

    @DatabaseProp({ type: String })
    description: string;

    @DatabaseProp({ type: Object }) // Stores JSON/flexible values
    value: T;
}

/**
 export const AppSettingSchema = SchemaFactory.createForClass(AppSettingEntityBase);
 export type AppSettingDoc = IDatabaseDocument<AppSettingEntityBase>;
 */
