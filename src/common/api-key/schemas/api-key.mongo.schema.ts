import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyBeforeSaveHook } from 'src/common/api-key/schemas/hooks/api-key.before-save.hook';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { DatabaseMongoEntity } from 'src/common/database/schemas/database.mongo.schema';

@DatabaseEntity()
export class ApiKeyMongoEntity
    extends DatabaseMongoEntity
    implements IApiKeyEntity
{
    @Prop({
        required: true,
        index: true,
        type: String,
        minlength: 1,
        maxlength: 100,
    })
    name: string;

    @Prop({
        required: false,
        type: String,
        minlength: 1,
        maxlength: 255,
    })
    description?: string;

    @Prop({
        required: true,
        type: String,
        unique: true,
        index: true,
    })
    key: string;

    @Prop({
        required: true,
        type: String,
    })
    hash: string;

    @Prop({
        required: true,
        type: String,
        index: true,
    })
    encryptionKey: string;

    @Prop({
        required: true,
        type: String,
        minLength: 16,
        maxLength: 16,
    })
    passphrase: string;

    @Prop({
        required: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;
}

export const ApiKeyMongoSchema =
    SchemaFactory.createForClass(ApiKeyMongoEntity);

ApiKeyMongoSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        const hook = ApiKeyBeforeSaveHook.bind(this);
        hook();

        next();
    }
);
