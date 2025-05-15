import { DatabaseProp } from 'src/common/database/decorators/database.decorator';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

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