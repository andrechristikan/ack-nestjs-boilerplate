import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import { SchemaFactory } from '@nestjs/mongoose';
import { DatabaseEntity } from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';


export const FeatureTableName = 'FeatureConfigs';


@DatabaseEntity({
  collection: FeatureTableName,
})

export class FeatureConfigEntity extends AppBaseConfigEntityBase {

}

export const FeatureConfigSchema = SchemaFactory.createForClass(FeatureConfigEntity);
export type FeatureConfigDoc = IDatabaseDocument<FeatureConfigEntity>;