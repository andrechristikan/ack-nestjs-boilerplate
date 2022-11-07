import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';
import { SettingDatabaseName } from 'src/common/setting/repository/entities/setting.entity';

@DatabaseMongoSchema({ collection: SettingDatabaseName })
export class PermissionMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
        uppercase: true,
        trim: true,
        type: String,
    })
    code: string;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true,
        type: String,
    })
    name: string;

    @Prop({
        required: true,
        type: String,
    })
    description: string;

    @Prop({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;
}

export const PermissionMongoSchema = SchemaFactory.createForClass(
    PermissionMongoEntity
);

PermissionMongoSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.code = this.code.toUpperCase();
        this.name = this.name.toLowerCase();

        next();
    }
);
