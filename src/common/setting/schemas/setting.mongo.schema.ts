import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoEntity } from 'src/common/database/schemas/database.mongo.schema';
import { ISettingEntity } from 'src/common/setting/interfaces/setting.interface';
import { SettingBeforeSaveHook } from 'src/common/setting/schemas/hooks/setting.before-hook.hook';

@Schema({ timestamps: true, versionKey: false })
export class SettingMongoEntity
    extends DatabaseMongoEntity
    implements ISettingEntity
{
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
        const hook = SettingBeforeSaveHook.bind(this);
        hook();

        next();
    }
);
