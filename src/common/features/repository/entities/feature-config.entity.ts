import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import {
    DatabaseEntity,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';

export const FeatureTableName = 'FeatureConfigs';

export interface FeatureConfigBaseValue {
    enabled: boolean;
    [key: string]: any;
}

@DatabaseEntity({
    collection: FeatureTableName,
})
export class FeatureConfigEntity<Value = any> extends AppBaseConfigEntityBase<Value> {}

export const FeatureConfigSchema = DatabaseSchema(FeatureConfigEntity);
export type FeatureConfigDoc = IDatabaseDocument<FeatureConfigEntity>;
