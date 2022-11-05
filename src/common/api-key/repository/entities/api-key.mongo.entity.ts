import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { ApiKeyDatabaseName } from 'src/common/api-key/repository/entities/api-key.entity';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';

@DatabaseMongoSchema({ collection: ApiKeyDatabaseName })
export class ApiKeyMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        type: String,
        minlength: 1,
        maxlength: 100,
        trim: true,
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
        trim: true,
    })
    key: string;

    @Prop({
        required: true,
        trim: true,
        type: String,
    })
    hash: string;

    @Prop({
        required: true,
        type: String,
        index: true,
        trim: true,
    })
    encryptionKey: string;

    @Prop({
        required: true,
        type: String,
        minLength: 16,
        maxLength: 16,
        trim: true,
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
        this.name = this.name.toLowerCase();

        next();
    }
);
