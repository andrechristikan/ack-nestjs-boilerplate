import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';
import { SettingDatabaseName } from 'src/common/setting/repository/entities/setting.entity';

@DatabaseMongoSchema({ collection: SettingDatabaseName })
export class SettingMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
        trim: true,
        type: String,
    })
    name: string;

    @Prop({
        required: false,
        type: String,
    })
    description?: string;

    @Prop({
        required: true,
        trim: true,
        type: String,
    })
    value: string;
}

export const SettingMongoSchema =
    SchemaFactory.createForClass(SettingMongoEntity);
