import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';

@DatabaseMongoSchema()
export class SettingMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
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
        type: String,
    })
    value: string;
}

export const SettingMongoSchema =
    SchemaFactory.createForClass(SettingMongoEntity);

SettingMongoSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.name = this.name.trim();
        this.value = this.value.trim();

        next();
    }
);
